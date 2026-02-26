const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Recogemos todas las funciones relacionadas con el dashboard (estadísticas, gestión de reservas, vehículos y usuarios)
exports.getStats = async (req, res) => {
  try {
    const [vehiculos] = await db.query('SELECT COUNT(*) as total FROM vehicles');
    const [reservas] = await db.query('SELECT COUNT(*) as total FROM reservations WHERE status = "aprobada"');
    const [documentos] = await db.query('SELECT COUNT(*) as total FROM documents WHERE expiration_date < CURDATE()');

    res.json({
      totalVehiculos: vehiculos[0].total,
      reservasActivas: reservas[0].total,
      alertasDocumentos: documentos[0].total
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
      ORDER BY r.start_time DESC
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

    // Si es empleado, forzamos que la reserva sea para él mismo
    let finalUserId = user_id;
    if (req.user.role === 'empleado') {
      finalUserId = req.user.id;
    }

    if (!finalUserId || !vehicle_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
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
      AND status != 'rechazada'
      AND (
        (start_time <= ? AND end_time >= ?) OR
        (start_time <= ? AND end_time >= ?) OR
        (start_time >= ? AND end_time <= ?)
      )
    `, [vehicle_id, start_time, start_time, end_time, end_time, start_time, end_time]);

    if (collisions.length > 0) {
      return res.status(400).json({ error: 'El vehículo ya está reservado en ese horario' });
    }

    const [result] = await db.query(
      'INSERT INTO reservations (user_id, vehicle_id, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)',
      [finalUserId, vehicle_id, start_time, end_time, finalStatus]
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
    const { user_id, vehicle_id, start_time, end_time, status } = req.body;

    // Verificar Propiedad (Solo el dueño o admin/supervisor pueden editar)
    const [original] = await db.query('SELECT user_id FROM reservations WHERE id = ?', [id]);
    if (original.length === 0) return res.status(404).json({ error: 'Reserva no encontrada' });

    if (req.user.role === 'empleado' && original[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para editar esta reserva' });
    }

    // Protección contra Suplantación y Restricción de Estado
    let finalUserId = user_id;
    let finalStatus = status;

    if (req.user.role === 'empleado') {
      finalUserId = req.user.id;
      // Los empleados no pueden cambiar el estado, mantenemos el original. El admin o supervisor se encargará de aprobar o rechazar la reserva.
      const [currentRes] = await db.query('SELECT status FROM reservations WHERE id = ?', [id]);
      finalStatus = currentRes[0].status;
    }

    // Validación de Colisiones, para evitar que se actualice a un horario o vehículo que ya esté reservado por otra reserva aprobada o pendiente.
    const [collisions] = await db.query(`
      SELECT id FROM reservations 
      WHERE vehicle_id = ? 
      AND id != ?
      AND status != 'rechazada'
      AND (
        (start_time <= ? AND end_time >= ?) OR
        (start_time <= ? AND end_time >= ?) OR
        (start_time >= ? AND end_time <= ?)
      )
    `, [vehicle_id, id, start_time, start_time, end_time, end_time, start_time, end_time]);

    if (collisions.length > 0) {
      return res.status(400).json({ error: 'El vehículo ya está reservado en ese horario' });
    }

    const [result] = await db.query(
      'UPDATE reservations SET user_id = ?, vehicle_id = ?, start_time = ?, end_time = ?, status = ? WHERE id = ?',
      [finalUserId, vehicle_id, start_time, end_time, finalStatus, id]
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

    let query = 'SELECT id, license_plate, model, status, kilometers FROM vehicles';
    let params = [];

    if (start && end) {
      // Un vehículo NO está disponible si tiene una reserva que solape con el rango pedido.
      query += ` WHERE id NOT IN (
        SELECT vehicle_id FROM reservations 
        WHERE status != 'rechazada'
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

    query += ' ORDER BY id ASC';
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
    const { license_plate, model, status, kilometers } = req.body;
    if (!license_plate || !model) {
      return res.status(400).json({ error: 'La matrícula y el modelo son obligatorios' });
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
    const { license_plate, model, status, kilometers } = req.body;
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
      'SELECT id, username, role FROM users ORDER BY id ASC'
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