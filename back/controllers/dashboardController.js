const db = require('../config/db');
const bcrypt = require('bcryptjs');

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
      LIMIT 10
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener reservas recientes' });
  }
};

exports.createReservation = async (req, res) => {
  try {
    const { user_id, vehicle_id, start_time, end_time, status } = req.body;

    // --- Protección contra Suplantación ---
    // Si es empleado, forzamos que la reserva sea para él mismo
    let finalUserId = user_id;
    if (req.user.role === 'empleado') {
      finalUserId = req.user.id;
    }

    if (!finalUserId || !vehicle_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    // --- Validación de Colisiones (Evitar doble reserva) ---
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
      [finalUserId, vehicle_id, start_time, end_time, status || 'pendiente']
    );
    res.status(201).json({ id: result.insertId, message: 'Reserva creada exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear reserva' });
  }
};

exports.updateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, vehicle_id, start_time, end_time, status } = req.body;

    // --- Verificar Propiedad (Solo el dueño o admin/supervisor pueden editar) ---
    const [original] = await db.query('SELECT user_id FROM reservations WHERE id = ?', [id]);
    if (original.length === 0) return res.status(404).json({ error: 'Reserva no encontrada' });

    if (req.user.role === 'empleado' && original[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para editar esta reserva' });
    }

    // --- Protección contra Suplantación ---
    let finalUserId = user_id;
    if (req.user.role === 'empleado') {
      finalUserId = req.user.id;
    }

    // --- Validación de Colisiones (Evitar doble reserva) ---
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
      [finalUserId, vehicle_id, start_time, end_time, status, id]
    );

    res.json({ message: 'Reserva actualizada exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar reserva' });
  }
};

exports.deleteReservation = async (req, res) => {
  try {
    const { id } = req.params;

    // --- Verificar Propiedad (Solo el dueño o admin/supervisor pueden borrar) ---
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

exports.getVehicles = async (req, res) => {
  try {
    const { start, end } = req.query;

    let query = 'SELECT id, license_plate, model, status, kilometers FROM vehicles';
    let params = [];

    if (start && end) {
      // Si pasan fechas, filtramos los que NO tienen reservas en ese tramo
      query += ` WHERE id NOT IN (
        SELECT vehicle_id FROM reservations 
        WHERE status != 'rechazada'
        AND (
          (start_time <= ? AND end_time >= ?) OR
          (start_time <= ? AND end_time >= ?) OR
          (start_time >= ? AND end_time <= ?)
        )
      )`;
      params = [start, start, end, end, start, end];
    }

    query += ' ORDER BY id ASC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener vehículos' });
  }
};

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