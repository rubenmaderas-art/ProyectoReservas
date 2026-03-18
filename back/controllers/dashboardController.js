const db = require('../config/db');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auditLogger = require('../utils/auditLogger');

const normalizeMySqlDateTime = (value) => {
  if (!value) return value;
  const raw = String(value).trim();

  // Si es un objeto Date, lo devolvemos tal cual para que el driver con timezone: 'Z' lo maneje
  if (value instanceof Date) return value;

  // Si es una cadena ISO (contiene T), intentamos crear un objeto Date
  if (raw.includes('T')) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
  }

  // Si ya es formato MySQL (YYYY-MM-DD HH:mm:ss), lo devolvemos tal cual
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
    const [reservados] = await db.query('SELECT COUNT(*) as total FROM vehicles WHERE status = "reservado"');
    const [pendientes] = await db.query('SELECT COUNT(*) as total FROM vehicles WHERE status = "pendiente-validacion"');
    const [documentos] = await db.query('SELECT COUNT(*) as total FROM documents WHERE expiration_date < CURDATE()');

    res.json({
      totalVehiculos: vehiculos[0].total,
      reservasActivas: reservas[0].total,
      vehiculosReservados: reservados[0].total,
      vehiculosPendientesValidacion: pendientes[0].total,
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

    // Bloqueo para solo permitir reservas si el vehículo está en "disponible"
    const [vehicleRows] = await db.query('SELECT status FROM vehicles WHERE id = ?', [vehicle_id]);
    if (vehicleRows.length === 0) {
      return res.status(400).json({ error: 'Vehículo no encontrado' });
    }
    if (String(vehicleRows[0].status || '').toLowerCase() !== 'disponible') {
      return res.status(400).json({ error: 'Este vehículo no está disponible para reservar' });
    }

    const [collisions] = await db.query(`
      SELECT id FROM reservations 
      WHERE vehicle_id = ? 
      AND status NOT IN ('rechazada', 'finalizada')
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
      AND status NOT IN ('rechazada', 'finalizada')
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

    // Registrar auditoría de creación de reserva
    await auditLogger.logAction(req.user.id, 'CREATE', 'reservations', result.insertId, req.user.role, {
      user_id: finalUserId,
      vehicle_id: vehicle_id,
      start_time: normalizedStartTime,
      end_time: normalizedEndTime,
      status: finalStatus
    });

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
      status,
      km_entrega,
      estado_entrega,
      informe_entrega
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

      // El empleado solo puede finalizar su propia reserva.
      const requestedStatus = String(status || '').toLowerCase();
      const currentStatus = String(original[0].status || '').toLowerCase();
      if (requestedStatus === 'finalizada' && ['pendiente', 'aprobada', 'activa'].includes(currentStatus)) {
        finalStatus = 'finalizada';
      } else {
        finalStatus = original[0].status;
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
      AND status NOT IN ('rechazada', 'finalizada')
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
      AND status NOT IN ('rechazada', 'finalizada')
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

    // Si se finaliza una reserva, generamos/actualizamos la validacion asociada (tabla `validations`) y actualizamos KM vehiculo
    if (String(finalStatus || '').toLowerCase() === 'finalizada') {
      const parsedKm = Number.parseInt(km_entrega, 10);
      if (Number.isNaN(parsedKm) || parsedKm < 0) {
        return res.status(400).json({ error: 'Kilometraje de entrega inválido' });
      }

      const incidencias = String(estado_entrega || '').toLowerCase() === 'incorrecto';
      const informe = typeof informe_entrega === 'string' ? informe_entrega.trim() : null;

      await db.query(`
        INSERT INTO validations (reservation_id, km_entrega, informe_entrega, incidencias, status)
        VALUES (?, ?, ?, ?, 'pendiente')
        ON DUPLICATE KEY UPDATE km_entrega = VALUES(km_entrega), informe_entrega = VALUES(informe_entrega), incidencias = VALUES(incidencias)
      `, [id, parsedKm, informe, incidencias]);
    }

    // Sincronizar estado del vehículo
    let vehicleStatus = null;
    const s = String(finalStatus || '').toLowerCase();
    if (s === 'aprobada') vehicleStatus = 'reservado';
    else if (s === 'activa') vehicleStatus = 'en-uso';
    else if (s === 'finalizada') vehicleStatus = 'pendiente-validacion';
    else if (s === 'rechazada') {
      vehicleStatus = 'disponible';
    }

    if (vehicleStatus) {
      await db.query('UPDATE vehicles SET status = ? WHERE id = ?', [vehicleStatus, finalVehicleId]);
    }

    // Registrar auditoría de actualización de reserva
    await auditLogger.logAction(req.user.id, 'UPDATE', 'reservations', id, req.user.role, {
      changes: {
        user_id: finalUserId,
        vehicle_id: finalVehicleId,
        start_time: normalizedStartTime,
        end_time: normalizedEndTime,
        previous_status: original[0].status,
        new_status: finalStatus
      }
    });

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

    // Registrar auditoría de eliminación de reserva
    await auditLogger.logAction(req.user.id, 'DELETE', 'reservations', id, req.user.role, {
      user_id: original[0].user_id,
      action: 'Reserva eliminada'
    });

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
      query += ` WHERE v.status = 'disponible' AND v.id NOT IN (
        SELECT vehicle_id FROM reservations 
        WHERE status NOT IN ('rechazada', 'finalizada')
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

    // Registrar auditoría de creación de vehículo
    await auditLogger.logAction(req.user.id, 'CREATE', 'vehicles', result.insertId, req.user.role, {
      license_plate: license_plate,
      model: model,
      status: status || 'disponible',
      kilometers: kilometers || 0
    });

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

    // Get existing data to support partial updates
    const [existing] = await db.query('SELECT * FROM vehicles WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }

    const current = existing[0];
    const finalLicensePlate = license_plate ? license_plate.replace(/\s+/g, '') : current.license_plate;
    const finalModel = model || current.model;
    const finalStatus = status || current.status;
    const finalKilometers = kilometers !== undefined ? kilometers : current.kilometers;

    if (license_plate) {
      // Validación de formato
      const plateRegex = /^(?=.*[A-Z])(?=.*[0-9])[A-Z0-9\-]{5,10}$/;
      if (!plateRegex.test(finalLicensePlate)) {
        return res.status(400).json({ error: 'La matrícula no tiene un formato válido (entre 5 y 10 caracteres, letras y números, sin espacios)' });
      }

      // Validación de unicidad
      const [dupe] = await db.query('SELECT id FROM vehicles WHERE license_plate = ? AND id != ?', [finalLicensePlate, id]);
      if (dupe.length > 0) {
        return res.status(400).json({ error: 'Esta matrícula ya está registrada en otro vehículo' });
      }
    }

    const [result] = await db.query(
      'UPDATE vehicles SET license_plate = ?, model = ?, status = ?, kilometers = ? WHERE id = ?',
      [finalLicensePlate, finalModel, finalStatus, finalKilometers, id]
    );

    // Registrar auditoría de actualización de vehículo
    await auditLogger.logAction(req.user.id, 'UPDATE', 'vehicles', id, req.user.role, {
      changes: {
        license_plate: finalLicensePlate === current.license_plate ? null : { from: current.license_plate, to: finalLicensePlate },
        model: finalModel === current.model ? null : { from: current.model, to: finalModel },
        status: finalStatus === current.status ? null : { from: current.status, to: finalStatus },
        kilometers: finalKilometers === current.kilometers ? null : { from: current.kilometers, to: finalKilometers }
      }
    });

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

    // Registrar auditoría de eliminación de vehículo
    await auditLogger.logAction(req.user.id, 'DELETE', 'vehicles', id, req.user.role, {
      action: 'Vehículo eliminado'
    });

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
// Obtener todos los usuarios aunque los eliminados aparecerán con un campo "deleted_at" no nulo para diferenciarlos,
//  pero no se borran físicamente de la base de datos para mantener la integridad referencial y la trazabilidad histórica.
exports.getUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, username, role, created_at, deleted_at FROM users WHERE deleted_at IS NULL ORDER BY id DESC'
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los usuarios' });
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

    // Registrar auditoría de creación de usuario
    await auditLogger.logAction(req.user.id, 'CREATE', 'users', result.insertId, req.user.role, {
      username: username,
      role: role,
      action: 'Nuevo usuario creado'
    });

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
      query = 'UPDATE users SET username = ?, password = ?, role = ? WHERE id = ? AND deleted_at IS NULL';
      params = [username, hashedPassword, role, id];
    } else {
      query = 'UPDATE users SET username = ?, role = ? WHERE id = ? AND deleted_at IS NULL';
      params = [username, role, id];
    }

    const [result] = await db.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Registrar auditoría de actualización de usuario
    await auditLogger.logAction(req.user.id, 'UPDATE', 'users', id, req.user.role, {
      changes: {
        username: username,
        role: role,
        password_changed: !!password
      }
    });

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
  const id = req.params.id;

  try {
    // Iniciamos una transacción para asegurar que todo se borre correctamente o nada se borre
    await db.query('START TRANSACTION');

    // Borrar validaciones asociadas a las reservas del usuario
    await db.query(`
      DELETE v FROM validations v
      INNER JOIN reservations r ON v.reservation_id = r.id
      WHERE r.user_id = ?
    `, [id]);

    // Borrar las reservas del usuario
    await db.query('DELETE FROM reservations WHERE user_id = ?', [id]);

    // Soft delete del usuario
    const [result] = await db.query(
      'UPDATE users SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [id]
    );

    if (result.affectedRows === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Registrar auditoría de eliminación de usuario
    await auditLogger.logAction(req.user.id, 'DELETE', 'users', id, req.user.role, {
      action: 'Usuario eliminado (soft delete)'
    });

    await db.query('COMMIT');
    res.status(200).json({ message: 'Usuario y sus reservas eliminados' });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar al usuario y sus datos' });
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

      // Registrar auditoría de subida de documento
      await auditLogger.logAction(req.user.id, 'CREATE', 'documents', result.insertId, req.user.role, {
        vehicle_id: id,
        type: type,
        original_name: original_name,
        expiration_date: expiration_date,
        file: filePath
      });

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

    // Registrar auditoría de eliminación de documento
    await auditLogger.logAction(req.user.id, 'DELETE', 'documents', id, req.user.role, {
      file_path: rows[0].file_path,
      action: 'Documento eliminado'
    });

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

    // Registrar auditoría de actualización de documento
    await auditLogger.logAction(req.user.id, 'UPDATE', 'documents', id, req.user.role, {
      changes: {
        type: type,
        expiration_date: expiration_date,
        original_name: original_name
      }
    });

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
        v.status,
        v.decision_estado,
        u.username,
        ve.license_plate,
        ve.model,
        ve.kilometers AS km_inicial
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

exports.deleteValidation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'ID de validación requerido' });
    }

    const [result] = await db.query('DELETE FROM validations WHERE id = ?', [id]);

    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ error: 'Validación no encontrada' });
    }

    // Registrar auditoría de eliminación de validación
    await auditLogger.logAction(req.user.id, 'DELETE', 'validations', id, req.user.role, {
      action: 'Validación eliminada'
    });

    res.json({ message: 'Validación eliminada correctamente' });
  } catch (err) {
    console.error('Error eliminando validación:', err);
    res.status(500).json({ error: 'Error al eliminar la validación' });
  }
};

exports.updateValidation = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, informe_superior, km_entrega, incidencias, decision_estado } = req.body;

    if (!id) return res.status(400).json({ error: 'ID de validación requerido' });

    await db.query(
      'UPDATE validations SET status = ?, informe_superior = ?, km_entrega = ?, incidencias = ?, decision_estado = ? WHERE id = ?',
      [status || 'revisada', informe_superior, km_entrega, incidencias, decision_estado, id]
    );

    // Registrar auditoría de actualización de validación
    await auditLogger.logAction(req.user.id, 'UPDATE', 'validations', id, req.user.role, {
      changes: {
        status: status || 'revisada',
        informe_superior: informe_superior ? 'añadido' : 'sin cambios',
        km_entrega: km_entrega,
        incidencias: incidencias,
        decision_estado: decision_estado
      }
    });

    res.json({ message: 'Validación actualizada correctamente' });
  } catch (err) {
    console.error('Error actualizando validación:', err);
    res.status(500).json({ error: 'Error al actualizar la validación' });
  }
};

