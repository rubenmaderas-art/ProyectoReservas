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

    if (!user_id || !vehicle_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const [result] = await db.query(
      'INSERT INTO reservations (user_id, vehicle_id, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)',
      [user_id, vehicle_id, start_time, end_time, status || 'pendiente']
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

    const [result] = await db.query(
      'UPDATE reservations SET user_id = ?, vehicle_id = ?, start_time = ?, end_time = ?, status = ? WHERE id = ?',
      [user_id, vehicle_id, start_time, end_time, status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    res.json({ message: 'Reserva actualizada exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar reserva' });
  }
};

exports.deleteReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query('DELETE FROM reservations WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    res.json({ message: 'Reserva eliminada exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar reserva' });
  }
};

exports.getVehicles = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, license_plate, model, status, kilometers FROM vehicles ORDER BY id ASC'
    );
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