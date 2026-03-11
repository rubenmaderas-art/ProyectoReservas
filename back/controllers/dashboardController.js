const db = require('../config/db');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const normalizeMySqlDateTime = (value) => {
  if (!value) return value;
  const raw = String(value).trim();

  const isoWithSeconds = raw.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.\d+)?Z?$/);
  if (isoWithSeconds) return `${isoWithSeconds[1]} ${isoWithSeconds[2]}`;

  const isoWithMinutes = raw.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?:\.\d+)?Z?$/);
  if (isoWithMinutes) return `${isoWithMinutes[1]} ${isoWithMinutes[2]}:00`;

  return raw;
};

// Configuración de Multer para Documentos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Nombre de archivo "encriptado" (hash/random + timestamp)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'DOC-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
}).single('pdf');

// Recogemos todas las funciones relacionadas con el dashboard (estadísticas, gestión de reservas, vehículos y usuarios)
exports.getStats = async (req, res) => {
  try {
    const [vehiculos] = await db.query('SELECT COUNT(*) as total FROM vehicles');
    const [reservas] = await db.query('SELECT COUNT(*) as total FROM reservations WHERE status = "aprobada"');
    const [documentos] = await db.query('SELECT COUNT(*) as total FROM documents WHERE expiration_date < CURDATE()');

    res.json({
      totalVehiculos: vehiculos[0].total,
      reservasActivas: reservas[0].total,
      documentosExpirados: documentos[0].total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

// conseguimos las reservas más recientes y las mostramos con su informacion relacionada
exports.getRecentReservations = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        r.id,
        u.username,
        v.license_plate,
        v.model,
        r.start_time,
        r.end_time,
        r.status,
        r.user_id,
        r.vehicle_id
      FROM reservations r
      JOIN users u ON r.user_id = u.id
      JOIN vehicles v ON r.vehicle_id = v.id
      ORDER BY r.id DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener reservas recientes' });
  }
};

// Funcion para crear una reserva, con protecciones contra suplantación y validación de colisiones para evitar dobles reservas en el mismo horario.
exports.createReservation = async (req, res) => {
  try {
    const { user_id, vehicle_id, start_time, end_time, status } = req.body;
    const normalizedStartTime = normalizeMySqlDateTime(start_time);
    const normalizedEndTime = normalizeMySqlDateTime(end_time);

    // Si es empleado, forzamos que la reserva sea para él mismo
    let finalUserId = user_id;
    if (req.user.role === 'empleado') {
      finalUserId = req.user.id;
    }

    if (!finalUserId || !vehicle_id || !normalizedStartTime || !normalizedEndTime) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    if (Number.isNaN(new Date(normalizedStartTime).getTime()) || Number.isNaN(new Date(normalizedEndTime).getTime())) {
      return res.status(400).json({ error: 'Formato de fecha y hora inválido' });
    }

    if (new Date(normalizedStartTime) >= new Date(normalizedEndTime)) {
      return res.status(400).json({ error: 'La fecha de inicio debe ser anterior a la fecha de fin' });
    }

    // Fuerza Estado Pendiente para Empleados
    let finalStatus = status || 'pendiente';
    if (req.user.role === 'empleado') {
      finalStatus = 'pendiente';
    }

    // Verificar que no haya otra reserva aprobada o pendiente para el mismo vehículo que solape con el rango pedido.
    const [collisions] = await db.query(`
      SELECT id FROM reservations 
      WHERE vehicle_id = ? 
      AND status NOT IN ('rechazada', 'validado')
      AND (
        (start_time <= ? AND end_time >= ?) OR
        (start_time <= ? AND end_time >= ?) OR
        (start_time >= ? AND end_time <= ?)
      )
    `, [vehicle_id, normalizedStartTime, normalizedStartTime, normalizedEndTime, normalizedEndTime, normalizedStartTime, normalizedEndTime]);

    if (collisions.length > 0) {
      return res.status(400).json({ error: 'El vehículo ya está reservado en ese horario' });
    }

    // Verificar que el USUARIO no tenga ya otra reserva en el mismo horario
    const [userCollisions] = await db.query(`
      SELECT id FROM reservations 
      WHERE user_id = ? 
      AND status NOT IN ('rechazada', 'validado')
      AND (
        (start_time <= ? AND end_time >= ?) OR
        (start_time <= ? AND end_time >= ?) OR
        (start_time >= ? AND end_time <= ?)
      )
    `, [finalUserId, normalizedStartTime, normalizedStartTime, normalizedEndTime, normalizedEndTime, normalizedStartTime, normalizedEndTime]);

    if (userCollisions.length > 0) {
      return res.status(400).json({ error: 'Ya tienes una reserva activa en este horario' });
    }

    const [result] = await db.query(
      'INSERT INTO reservations (user_id, vehicle_id, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)',
      [finalUserId, vehicle_id, normalizedStartTime, normalizedEndTime, finalStatus]
    );
    res.status(201).json({ id: result.insertId, message: 'Reserva creada exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear reserva' });
  }
};

// Función para actualizar uan reserva.
exports.updateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      user_id,
      vehicle_id,
      start_time,
      end_time,
      status
    } = req.body;

    // Verificar Propiedad (Solo el dueño o admin/supervisor pueden editar)
    const [original] = await db.query(
      'SELECT user_id, vehicle_id, start_time, end_time, status FROM reservations WHERE id = ?',
      [id]
    );
    if (original.length === 0) return res.status(404).json({ error: 'Reserva no encontrada' });

    if (req.user.role === 'empleado' && original[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para editar esta reserva' });
    }

    // Protección contra Suplantación y Restricción de Estado
    let finalUserId = user_id ?? original[0].user_id;
    const finalVehicleId = vehicle_id ?? original[0].vehicle_id;
    const normalizedStartTime = normalizeMySqlDateTime(start_time ?? original[0].start_time);
    const normalizedEndTime = normalizeMySqlDateTime(end_time ?? original[0].end_time);
    let finalStatus = status ?? original[0].status;

    if (req.user.role === 'empleado') {
      finalUserId = req.user.id;

      // El empleado solo puede cambiar a "entregado" en su propia reserva.
      const requestedStatus = String(status || '').toLowerCase();
      const currentStatus = String(original[0].status || '').toLowerCase();
      if (requestedStatus === 'entregado' && ['pendiente', 'aprobada', 'activa'].includes(currentStatus)) {
        finalStatus = 'entregado';
      } else {
        finalStatus = original[0].status;
      }

      if (finalStatus === 'entregado') {
        finalValidacionEntrega = 'pendiente';
      }
    }

    if (Number.isNaN(new Date(normalizedStartTime).getTime()) || Number.isNaN(new Date(normalizedEndTime).getTime())) {
      return res.status(400).json({ error: 'Formato de fecha y hora inválido' });
    }

    if (new Date(normalizedStartTime) >= new Date(normalizedEndTime)) {
      return res.status(400).json({ error: 'La fecha de inicio debe ser anterior a la fecha de fin' });
    }

    // Validación de Colisiones (Verificar si el vehículo está ocupado)
    const [collisions] = await db.query(`
      SELECT id FROM reservations 
      WHERE vehicle_id = ? 
      AND id != ?
      AND status NOT IN ('rechazada', 'validado')
      AND (
        (start_time <= ? AND end_time >= ?) OR
        (start_time <= ? AND end_time >= ?) OR
        (start_time >= ? AND end_time <= ?)
      )
    `, [finalVehicleId, id, normalizedStartTime, normalizedStartTime, normalizedEndTime, normalizedEndTime, normalizedStartTime, normalizedEndTime]);

    if (collisions.length > 0) {
      return res.status(400).json({ error: 'El vehículo ya está reservado en ese horario' });
    }

    // Validación de Colisiones por Usuario (Verificar que el usuario no tenga otra reserva en este horario)
    const [userCollisions] = await db.query(`
      SELECT id FROM reservations 
      WHERE user_id = ? 
      AND id != ?
      AND status NOT IN ('rechazada', 'validado')
      AND (
        (start_time <= ? AND end_time >= ?) OR
        (start_time <= ? AND end_time >= ?) OR
        (start_time >= ? AND end_time <= ?)
      )
    `, [finalUserId, id, normalizedStartTime, normalizedStartTime, normalizedEndTime, normalizedEndTime, normalizedStartTime, normalizedEndTime]);

    if (userCollisions.length > 0) {
      return res.status(400).json({ error: 'Ya tienes una reserva activa en este horario' });
    }

    const [result] = await db.query(
      'UPDATE reservations SET user_id = ?, vehicle_id = ?, start_time = ?, end_time = ?, status = ? WHERE id = ?',
      [finalUserId, finalVehicleId, normalizedStartTime, normalizedEndTime, finalStatus, id]
    );

    res.json({ message: 'Reserva actualizada exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar reserva' });
  }
};

// Función para eliminar una reserva.
exports.deleteReservation = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar Propiedad (Solo el dueño o admin/supervisor pueden borrar)
    const [original] = await db.query('SELECT user_id FROM reservations WHERE id = ?', [id]);
    if (original.length === 0) return res.status(404).json({ error: 'Reserva no encontrada' });

    if (req.user.role === 'empleado' && original[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta reserva' });
    }

    const [result] = await db.query('DELETE FROM reservations WHERE id = ?', [id]);
    res.json({ message: 'Reserva eliminada exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar reserva' });
  }
};

// Funciones para gestionar vehículos (CRUD)
exports.getVehicles = async (req, res) => {
  try {
    const { start, end, excludeRes } = req.query;

    let query = `
      SELECT v.*, 
      (SELECT COUNT(*) FROM documents d WHERE d.vehicle_id = v.id AND d.expiration_date < CURDATE()) as has_expired_documents
      FROM vehicles v
    `;
    let params = [];

    if (start && end) {
      // Un vehículo NO está disponible si tiene una reserva que solape con el rango pedido.
      query += ` WHERE id NOT IN (
        SELECT vehicle_id FROM reservations 
        WHERE status NOT IN ('rechazada', 'validado')
        ${excludeRes ? 'AND id != ?' : ''}
        AND start_time < ? 
        AND end_time > ?
      )`;

      if (excludeRes) {
        params = [excludeRes, end, start];
      } else {
        params = [end, start];
      }
    }

    query += ' ORDER BY license_plate ASC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener vehículos' });
  }
};

// Funciones para gestionar vehículos (CRUD)
exports.createVehicle = async (req, res) => {
  try {
    let { license_plate, model, status, kilometers } = req.body;
    if (!license_plate || !model) {
      return res.status(400).json({ error: 'La matrícula y el modelo son obligatorios' });
    }

    // Normalización: Eliminar todos los espacios
    license_plate = license_plate.replace(/\s+/g, '');

    // Validación de formato de matricula.
    const plateRegex = /^(?=.*[A-Z])(?=.*[0-9])[A-Z0-9\-]{5,10}$/;
    if (!plateRegex.test(license_plate)) {
      return res.status(400).json({ error: 'La matrícula no tiene un formato válido (entre 5 y 10 caracteres, letras y números, sin espacios)' });
    }

    // Validación de unicidad
    const [existing] = await db.query('SELECT id FROM vehicles WHERE license_plate = ?', [license_plate]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Esta matrícula ya está registrada en el sistema' });
    }

    const [result] = await db.query(
      'INSERT INTO vehicles (license_plate, model, status, kilometers) VALUES (?, ?, ?, ?)',
      [license_plate, model, status || 'disponible', kilometers || 0]
    );
    res.status(201).json({ id: result.insertId, message: 'Vehículo creado exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear vehículo' });
  }
};

exports.updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    let { license_plate, model, status, kilometers } = req.body;

    if (license_plate) {
      // Normalización: Eliminar todos los espacios
      license_plate = license_plate.replace(/\s+/g, '');

      // Validación de formato
      const plateRegex = /^(?=.*[A-Z])(?=.*[0-9])[A-Z0-9\-]{5,10}$/;
      if (!plateRegex.test(license_plate)) {
        return res.status(400).json({ error: 'La matrícula no tiene un formato válido (entre 5 y 10 caracteres, letras y números, sin espacios)' });
      }

      // Validación de unicidad
      const [existing] = await db.query('SELECT id FROM vehicles WHERE license_plate = ? AND id != ?', [license_plate, id]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Esta matrícula ya está registrada en otro vehículo' });
      }
    }

    const [result] = await db.query(
      'UPDATE vehicles SET license_plate = ?, model = ?, status = ?, kilometers = ? WHERE id = ?',
      [license_plate, model, status, kilometers, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }
    res.json({ message: 'Vehículo actualizado exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar vehículo' });
  }
};

exports.deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query('DELETE FROM vehicles WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }
    res.json({ message: 'Vehículo eliminado exitosamente' });
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: 'No se puede eliminar porque este vehículo tiene reservas asociadas' });
    }
    res.status(500).json({ error: 'Error al eliminar vehículo' });
  }
};

// Funciones para gestionar usuarios (CRUD)
exports.getUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, username, role FROM users ORDER BY username ASC'
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await db.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role]
    );
    res.status(201).json({ id: result.insertId, message: 'Usuario creado exitosamente' });
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role } = req.body;

    // Si envían contraseña nueva, la hasheamos. Si no, solo actualizamos usuario y rol.
    let query, params;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      query = 'UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?';
      params = [username, hashedPassword, role, id];
    } else {
      query = 'UPDATE users SET username = ?, role = ? WHERE id = ?';
      params = [username, role, id];
    }

    const [result] = await db.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: 'No se puede eliminar este usuario porque tiene reservas asociadas' });
    }
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};

// --- GESTIÓN DE DOCUMENTOS DE VEHÍCULOS ---
exports.getVehicleDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      'SELECT id, type, expiration_date, original_name, upload_date FROM documents WHERE vehicle_id = ? ORDER BY upload_date DESC',
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener documentos del vehículo' });
  }
};

exports.uploadVehicleDocument = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      const { id } = req.params;
      const { type, expiration_date, original_name } = req.body;

      if (!type || !expiration_date || !original_name) {
        // Si el admin subió un archivo pero olvidó llenar los campos, borramos el archivo para no dejar basura
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'El tipo, nombre y fecha de vencimiento son obligatorios' });
      }

      const filePath = req.file ? req.file.filename : null;

      const [result] = await db.query(
        'INSERT INTO documents (vehicle_id, type, expiration_date, file_path, original_name) VALUES (?, ?, ?, ?, ?)',
        [id, type, expiration_date, filePath, original_name]
      );

      res.status(201).json({
        id: result.insertId,
        message: req.file ? 'Documento y archivo guardados' : 'Registro creado sin archivo',
        document: {
          id: result.insertId,
          type,
          expiration_date,
          original_name
        }
      });
    } catch (error) {
      console.error(error);
      if (req.file) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: 'Error al registrar el documento' });
    }
  });
};

exports.deleteVehicleDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query('SELECT file_path FROM documents WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    const filePath = path.join(__dirname, '../uploads/documents', rows[0].file_path);

    await db.query('DELETE FROM documents WHERE id = ?', [id]);

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Error deleting file from disk:', e);
      }
    }

    res.json({ message: 'Documento eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el documento' });
  }
};

exports.updateVehicleDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, expiration_date, original_name } = req.body;

    if (!type || !expiration_date || !original_name) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    await db.query(
      'UPDATE documents SET type = ?, expiration_date = ?, original_name = ? WHERE id = ?',
      [type, expiration_date, original_name, id]
    );

    res.json({ message: 'Documento actualizado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el documento' });
  }
};

exports.getValidations = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        v.id, 
        v.km_entrega, 
        v.created_at, 
        v.incidencias,
        v.informe_entrega,
        v.informe_superior,
        u.username,
        ve.license_plate,
        ve.model
      FROM validations v
      INNER JOIN reservations r ON v.reservation_id = r.id
      INNER JOIN users u ON r.user_id = u.id
      INNER JOIN vehicles ve ON r.vehicle_id = ve.id
      ORDER BY v.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("Error cargando validaciones con JOIN:", err);
    res.status(500).json({ error: "Error en el servidor al obtener validaciones" });
  }
};