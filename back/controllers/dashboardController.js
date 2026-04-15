const db = require('../config/db');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auditLogger = require('../utils/auditLogger');
const { getIO } = require('../utils/socketManager');

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

const normalizeStatus = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, '-');

const syncVehicleStatusFromReservations = async (connection, vehicleId) => {
  const [vehicleRows] = await connection.query('SELECT status FROM vehicles WHERE id = ?', [vehicleId]);
  if (vehicleRows.length === 0) return null;

  const currentVehicleStatus = normalizeStatus(vehicleRows[0].status);
  if (currentVehicleStatus === 'no-disponible') return null;

  const [reservationRows] = await connection.query(
    'SELECT status FROM reservations WHERE vehicle_id = ?',
    [vehicleId]
  );

  const statuses = Array.isArray(reservationRows)
    ? reservationRows.map((row) => normalizeStatus(row.status))
    : [];

  let desiredStatus = 'disponible';
  if (statuses.some((status) => status === 'activa')) {
    desiredStatus = 'en-uso';
  } else if (statuses.some((status) => status === 'pendiente' || status === 'aprobada')) {
    desiredStatus = 'reservado';
  } else if (statuses.some((status) => status === 'finalizada')) {
    desiredStatus = 'pendiente-validacion';
  }

  if (currentVehicleStatus !== desiredStatus) {
    await connection.query('UPDATE vehicles SET status = ? WHERE id = ?', [desiredStatus, vehicleId]);
  }

  return desiredStatus;
};

const validateReservationCentreCompatibility = async (connection, {
  userId,
  vehicleCentreId,
  requestedCentreId = null,
}) => {
  const [userCentreRows] = await connection.query(
    'SELECT centre_id FROM user_centres WHERE user_id = ?',
    [userId]
  );

  const userCentreIds = Array.isArray(userCentreRows)
    ? userCentreRows
        .map((row) => String(row.centre_id ?? '').trim())
        .filter((centreId) => centreId !== '')
    : [];

  const vehicleCentreValue = String(vehicleCentreId ?? '').trim();
  const requestedCentreValue = String(requestedCentreId ?? '').trim();

  if (!vehicleCentreValue) {
    return { ok: false, error: 'El vehículo no tiene un centro asociado' };
  }

  if (userCentreIds.length === 0) {
    return { ok: false, error: 'El usuario no tiene centros asociados' };
  }

  if (requestedCentreValue && requestedCentreValue !== vehicleCentreValue) {
    return { ok: false, error: 'El centro seleccionado no coincide con el vehículo' };
  }

  if (!userCentreIds.includes(vehicleCentreValue)) {
    return { ok: false, error: 'El vehículo no pertenece a un centro asociado al usuario' };
  }

  if (requestedCentreValue && !userCentreIds.includes(requestedCentreValue)) {
    return { ok: false, error: 'El centro seleccionado no pertenece a los centros asociados al usuario' };
  }

  return { ok: true };
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

// Funciones para centros
exports.getCentres = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, id_unifica, nombre, provincia, localidad, direccion, telefono, codigo_postal FROM centres ORDER BY nombre ASC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener centros' });
    }
};

exports.createCentre = async (req, res) => {
    try {
        const { id_unifica, nombre, provincia, localidad, direccion, telefono, codigo_postal } = req.body;
        if (!nombre) return res.status(400).json({ error: 'El nombre del centro es obligatorio' });

        const [result] = await db.query(
            'INSERT INTO centres (id_unifica, nombre, provincia, localidad, direccion, telefono, codigo_postal) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id_unifica || null, nombre, provincia || null, localidad || null, direccion || null, telefono || null, codigo_postal || null]
        );

        await auditLogger.logAction(req.user.id, 'CREATE', 'centres', result.insertId, req.user.role, {
            nombre,
            provincia,
            localidad
        });

        res.status(201).json({ id: result.insertId, message: 'Centro creado exitosamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear centro' });
    }
};

exports.updateCentre = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_unifica, nombre, provincia, localidad, direccion, telefono, codigo_postal } = req.body;

        const [existing] = await db.query('SELECT * FROM centres WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Centro no encontrado' });

        await db.query(
            'UPDATE centres SET id_unifica = ?, nombre = ?, provincia = ?, localidad = ?, direccion = ?, telefono = ?, codigo_postal = ? WHERE id = ?',
            [id_unifica || existing[0].id_unifica, nombre || existing[0].nombre, provincia || existing[0].provincia, localidad || existing[0].localidad, direccion || existing[0].direccion, telefono || existing[0].telefono, codigo_postal || existing[0].codigo_postal, id]
        );

        await auditLogger.logAction(req.user.id, 'UPDATE', 'centres', id, req.user.role, {
            previous: existing[0],
            current: { id_unifica, nombre, provincia, localidad, direccion, telefono, codigo_postal }
        });

        res.json({ message: 'Centro actualizado exitosamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar centro' });
    }
};

exports.deleteCentre = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id } = req.params;
        await connection.beginTransaction();

        // 1. Obtener los vehículos del centro
        const [vehicles] = await connection.query('SELECT id FROM vehicles WHERE centre_id = ?', [id]);
        const vehicleIds = vehicles.map(v => v.id);

        if (vehicleIds.length > 0) {
            const vehicleIdsPlaceholders = vehicleIds.map(() => '?').join(',');

            // 2. Obtener las reservas de esos vehículos
            const [reservations] = await connection.query(`SELECT id FROM reservations WHERE vehicle_id IN (${vehicleIdsPlaceholders})`, vehicleIds);
            const reservationIds = reservations.map(r => r.id);

            if (reservationIds.length > 0) {
                const resIdsPlaceholders = reservationIds.map(() => '?').join(',');

                // 3. Borrar validaciones de las reservas
                await connection.query(`DELETE FROM validations WHERE reservation_id IN (${resIdsPlaceholders})`, reservationIds);

                // 4. Borrar las reservas
                await connection.query(`DELETE FROM reservations WHERE id IN (${resIdsPlaceholders})`, reservationIds);
            }

            // 5. Borrar documentos de los vehículos
            await connection.query(`DELETE FROM documents WHERE vehicle_id IN (${vehicleIdsPlaceholders})`, vehicleIds);

            // 6. Borrar los vehículos
            await connection.query(`DELETE FROM vehicles WHERE id IN (${vehicleIdsPlaceholders})`, vehicleIds);
        }

        // 7. Borrar vinculaciones de usuarios con el centro
        await connection.query('DELETE FROM user_centres WHERE centre_id = ?', [id]);

        // 8. Borrar el centro (obtener nombre antes para auditoría)
        const [existing] = await connection.query('SELECT nombre FROM centres WHERE id = ?', [id]);
        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Centro no encontrado' });
        }

        await connection.query('DELETE FROM centres WHERE id = ?', [id]);

        // Registrar auditoría
        await auditLogger.logAction(req.user.id, 'DELETE', 'centres', id, req.user.role, {
            nombre: existing[0].nombre,
            cascade: true,
            deleted_vehicles_count: vehicleIds.length
        });

        await connection.commit();
        res.json({ message: 'Centro y todos sus datos asociados eliminados exitosamente' });
    } catch (error) {
        await connection.rollback();
        console.error('Error en deleteCentre cascade:', error);
        res.status(500).json({ error: 'Error al eliminar centro en cascada' });
    } finally {
        connection.release();
    }
};

exports.getCentreDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const [vehicles] = await db.query('SELECT id, license_plate, model, status FROM vehicles WHERE centre_id = ?', [id]);
        const [users] = await db.query(`
            SELECT u.id, u.username, u.role 
            FROM users u
            JOIN user_centres uc ON u.id = uc.user_id
            WHERE uc.centre_id = ?
        `, [id]);

        res.json({ vehicles, users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener detalles del centro' });
    }
};

// Recogemos todas las funciones relacionadas con el dashboard (estadísticas, gestión de reservas, vehículos y usuarios)
exports.getStats = async (req, res) => {
  try {
    let vehiculosParams = [];
    let vehiculosWhere = '';
    let docWhere = 'WHERE expiration_date < CURDATE()';
    let docParams = [];
    let partesWhere = "WHERE v.status != 'baja'";
    let partesParams = [];
    let resWhere = 'WHERE status = "activa"';
    let resParams = [];
    let resJoin = '';
    let docJoin = '';

    if (req.centreIds !== null) {
      if (req.centreIds.length === 0) {
        return res.json({ totalVehiculos: 0, reservasActivas: 0, vehiculosReservados: 0, vehiculosPendientesValidacion: 0, documentosExpirados: 0, partesTallerDesactualizados: 0 });
      }
      const inClause = req.centreIds.map(() => '?').join(',');
      vehiculosWhere = `WHERE centre_id IN (${inClause})`;
      vehiculosParams = req.centreIds;

      resJoin = 'JOIN vehicles v ON reservations.vehicle_id = v.id';
      resWhere = `WHERE v.centre_id IN (${inClause}) AND reservations.status = "activa"`;
      resParams = req.centreIds;

      docJoin = 'JOIN vehicles v ON documents.vehicle_id = v.id';
      docWhere = `WHERE v.centre_id IN (${inClause}) AND documents.expiration_date < CURDATE()`;
      docParams = req.centreIds;

      partesWhere = `WHERE v.status != 'baja' AND v.centre_id IN (${inClause})`;
      partesParams = req.centreIds;
    }

    const [vehiculos] = await db.query(`SELECT COUNT(*) as total FROM vehicles ${vehiculosWhere}`, vehiculosParams);
    
    let resQuery = `SELECT COUNT(*) as total FROM reservations ${resWhere}`;
    if (resJoin) resQuery = `SELECT COUNT(*) as total FROM reservations ${resJoin} ${resWhere}`;
    const [reservas] = await db.query(resQuery, resParams);

    const [reservados] = await db.query(`SELECT COUNT(*) as total FROM vehicles ${vehiculosWhere ? vehiculosWhere + ' AND' : 'WHERE'} status = "reservado"`, vehiculosParams);
    const [pendientes] = await db.query(`SELECT COUNT(*) as total FROM vehicles ${vehiculosWhere ? vehiculosWhere + ' AND' : 'WHERE'} status = "pendiente-validacion"`, vehiculosParams);

    let docQuery = `SELECT COUNT(*) as total FROM documents ${docWhere}`;
    if (docJoin) docQuery = `SELECT COUNT(*) as total FROM documents ${docJoin} ${docWhere}`;
    const [documentos] = await db.query(docQuery, docParams);

    const [partesTaller] = await db.query(`
      SELECT COUNT(*) as total FROM vehicles v
      ${partesWhere}
      AND (
        COALESCE(v.kilometers, 0) - (
          SELECT MAX(km_at_upload) FROM documents d WHERE d.vehicle_id = v.id AND d.type = 'parte-taller'
        ) > 15000
      )
    `, partesParams);

    res.json({
      totalVehiculos: vehiculos[0].total,
      reservasActivas: reservas[0].total,
      vehiculosReservados: reservados[0].total,
      vehiculosPendientesValidacion: pendientes[0].total,
      documentosExpirados: documentos[0].total,
      partesTallerDesactualizados: partesTaller[0].total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

// conseguimos las reservas más recientes y las mostramos con su informacion relacionada
exports.getRecentReservations = async (req, res) => {
  try {
    let whereClause = '';
    let params = [];
    
    if (req.centreIds !== null) {
      if (req.centreIds.length === 0) return res.json([]);
      const inClause = req.centreIds.map(() => '?').join(',');
      whereClause = `WHERE v.centre_id IN (${inClause})`;
      params = req.centreIds;
    }

    const [rows] = await db.query(`
      SELECT 
        r.id,
        u.username,
        v.license_plate,
        v.model,
        v.status AS vehicle_status,
        r.start_time,
        r.end_time,
        r.status,
        r.user_id,
        r.vehicle_id,
        val.km_inicial,
        val.km_entrega,
        val.informe_entrega,
        val.incidencias
      FROM reservations r
      JOIN users u ON r.user_id = u.id
      JOIN vehicles v ON r.vehicle_id = v.id
      LEFT JOIN validations val ON r.id = val.reservation_id
      ${whereClause}
      ORDER BY r.id DESC
    `, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener reservas recientes' });
  }
};

// Funcion para crear una reserva, con protecciones contra suplantación y validación de colisiones para evitar dobles reservas en el mismo horario.
exports.createReservation = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { user_id, vehicle_id, start_time, end_time, status, centre_id } = req.body;
    const normalizedStartTime = normalizeMySqlDateTime(start_time);
    const normalizedEndTime = normalizeMySqlDateTime(end_time);

    // Si es empleado, forzamos que la reserva sea para él mismo
    let finalUserId = user_id;
    if (req.user.role === 'empleado' || req.user.role === 'gestor') {
      finalUserId = req.user.id;
    }

    if (!finalUserId || !vehicle_id || !normalizedStartTime || !normalizedEndTime) {
      await connection.rollback();
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    if (Number.isNaN(new Date(normalizedStartTime).getTime()) || Number.isNaN(new Date(normalizedEndTime).getTime())) {
      await connection.rollback();
      return res.status(400).json({ error: 'Formato de fecha y hora inválido' });
    }

    if (new Date(normalizedStartTime) >= new Date(normalizedEndTime)) {
      await connection.rollback();
      return res.status(400).json({ error: 'La fecha de inicio debe ser anterior a la fecha de fin' });
    }

    // No permitir reservas en el pasado
    const now = new Date();
    if (new Date(normalizedStartTime) < now) {
      await connection.rollback();
      return res.status(400).json({ error: 'La fecha de inicio no puede estar en el pasado' });
    }

    // Fuerza Estado Pendiente para Empleados
    let finalStatus = status || 'pendiente';
    if (req.user.role === 'empleado' || req.user.role === 'gestor') {
      finalStatus = 'pendiente';
    }

    // Bloqueo para solo permitir reservas si el vehículo está en "disponible"
    const [vehicleRows] = await connection.query('SELECT status, centre_id FROM vehicles WHERE id = ?', [vehicle_id]);
    if (vehicleRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Vehículo no encontrado' });
    }
    if (String(vehicleRows[0].status || '').toLowerCase() !== 'disponible') {
      await connection.rollback();
      return res.status(400).json({ error: 'Este vehículo no está disponible para reservar' });
    }

    const centreValidation = await validateReservationCentreCompatibility(connection, {
      userId: finalUserId,
      vehicleCentreId: vehicleRows[0].centre_id,
      requestedCentreId: centre_id,
    });

    if (!centreValidation.ok) {
      await connection.rollback();
      return res.status(400).json({ error: centreValidation.error });
    }

    const [collisions] = await connection.query(`
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
      await connection.rollback();
      return res.status(400).json({ error: 'El vehículo ya está reservado en ese horario' });
    }

    // Verificar que el USUARIO no tenga ya otra reserva en el mismo horario
    const [userCollisions] = await connection.query(`
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
      await connection.rollback();
      return res.status(400).json({ error: 'Ya tienes una reserva activa en este horario' });
    }

    const [result] = await connection.query(
      'INSERT INTO reservations (user_id, vehicle_id, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)',
      [finalUserId, vehicle_id, normalizedStartTime, normalizedEndTime, finalStatus]
    );

    // Sincronizar estado inicial del vehículo (pendiente o aprobada -> reservado)
    let initialVehicleStatus = 'reservado';
    if (String(finalStatus || '').toLowerCase() === 'activa') initialVehicleStatus = 'en-uso';
    await connection.query('UPDATE vehicles SET status = ? WHERE id = ?', [initialVehicleStatus, vehicle_id]);

    await connection.commit();

    // Obtener info del vehículo para el audit y la respuesta
    const [vehicleInfoRows] = await connection.query('SELECT model, license_plate FROM vehicles WHERE id = ?', [vehicle_id]);
    const vehiculoInfo = vehicleInfoRows.length > 0
      ? `${vehicleInfoRows[0].model} (${vehicleInfoRows[0].license_plate})`
      : `ID: ${vehicle_id}`;

    // Registrar auditoría de creación de reserva
    try {
      await auditLogger.logAction(req.user.id, 'CREATE', 'reservations', result.insertId, req.user.role, {
        user_id: finalUserId,
        vehicle_id: vehicle_id,
        vehiculo: vehiculoInfo,
        start_time: normalizedStartTime,
        end_time: normalizedEndTime,
        status: finalStatus
      });
    } catch (auditError) {
      console.error('Error registrando auditoría de creación de reserva:', auditError);
    }

    // Obtener los datos de la nueva reserva para emitir al admin
    const [newReservation] = await connection.query(`
      SELECT 
        r.id,
        u.username,
        v.license_plate,
        v.model,
        v.status AS vehicle_status,
        r.start_time,
        r.end_time,
        r.status,
        r.user_id,
        r.vehicle_id,
        val.km_inicial,
        val.km_entrega,
        val.informe_entrega,
        val.incidencias
      FROM reservations r
      JOIN users u ON r.user_id = u.id
      JOIN vehicles v ON r.vehicle_id = v.id
      LEFT JOIN validations val ON r.id = val.reservation_id
      WHERE r.id = ?
    `, [result.insertId]);

    // Emitir evento de nueva reserva a todos los admins conectados
    if (newReservation.length > 0) {
      const io = getIO();
      io.to('admin_dashboard').emit('new_reservation', newReservation[0]);
    }

    res.status(201).json({ id: result.insertId, message: 'Reserva creada exitosamente' });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}
    console.error(error);
    res.status(500).json({ error: 'Error al crear reserva' });
  } finally {
    connection.release();
  }
};

// Función para actualizar una reserva.
exports.updateReservation = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const {
      user_id,
      vehicle_id,
      start_time,
      end_time,
      status,
      centre_id,
      km_entrega,
      estado_entrega,
      informe_entrega
    } = req.body;

    const [original] = await connection.query(
      'SELECT user_id, vehicle_id, start_time, end_time, status FROM reservations WHERE id = ?',
      [id]
    );
    if (original.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    if ((req.user.role === 'empleado' || req.user.role === 'gestor') && original[0].user_id !== req.user.id) {
      await connection.rollback();
      return res.status(403).json({ error: 'No tienes permiso para editar esta reserva' });
    }

    let finalUserId = user_id ?? original[0].user_id;
    const finalVehicleId = vehicle_id ?? original[0].vehicle_id;
    const normalizedStartTime = normalizeMySqlDateTime(start_time ?? original[0].start_time);
    const normalizedEndTime = normalizeMySqlDateTime(end_time ?? original[0].end_time);
    let finalStatus = status ?? original[0].status;
    const requestedStatus = String(status || '').toLowerCase();
    const currentStatus = String(original[0].status || '').toLowerCase();

    if (req.user.role === 'empleado' || req.user.role === 'gestor') {
      finalUserId = req.user.id;

      if (requestedStatus === 'finalizada' && ['pendiente', 'aprobada', 'activa'].includes(currentStatus)) {
        finalStatus = 'finalizada';
      } else if (requestedStatus === 'activa' && currentStatus === 'aprobada') {
        finalStatus = 'activa';
      } else {
        finalStatus = original[0].status;
      }
    }

    if (Number.isNaN(new Date(normalizedStartTime).getTime()) || Number.isNaN(new Date(normalizedEndTime).getTime())) {
      await connection.rollback();
      return res.status(400).json({ error: 'Formato de fecha y hora inválido' });
    }

    if (new Date(normalizedStartTime) >= new Date(normalizedEndTime)) {
      await connection.rollback();
      return res.status(400).json({ error: 'La fecha de inicio debe ser anterior a la fecha de fin' });
    }

    const isEmployee = req.user.role === 'empleado' || req.user.role === 'gestor';
    const isDeliveryUpdate =
      requestedStatus === 'finalizada' &&
      (km_entrega !== undefined || estado_entrega !== undefined || informe_entrega !== undefined);
    const isEmployeeFinalizingReservation =
      isEmployee &&
      isDeliveryUpdate &&
      ['activa', 'finalizada'].includes(currentStatus);
    const isEmployeeActivatingApprovedReservation = isEmployee && requestedStatus === 'activa' && currentStatus === 'aprobada';
    const isPendingOriginalReservation = currentStatus === 'pendiente';
    const allowPastStartForEdit =
      !isEmployee ||
      isPendingOriginalReservation ||
      isEmployeeFinalizingReservation ||
      isEmployeeActivatingApprovedReservation;

    const now = new Date();
    if (new Date(normalizedStartTime) < now && !allowPastStartForEdit) {
      await connection.rollback();
      return res.status(400).json({ error: 'La fecha de inicio no puede estar en el pasado' });
    }

    const [vehicleRows] = await connection.query('SELECT centre_id FROM vehicles WHERE id = ?', [finalVehicleId]);
    if (vehicleRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Vehículo no encontrado' });
    }

    const centreValidation = await validateReservationCentreCompatibility(connection, {
      userId: finalUserId,
      vehicleCentreId: vehicleRows[0].centre_id,
      requestedCentreId: centre_id,
    });

    if (!centreValidation.ok) {
      await connection.rollback();
      return res.status(400).json({ error: centreValidation.error });
    }

    const [collisions] = await connection.query(`
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
      await connection.rollback();
      return res.status(400).json({ error: 'El vehículo ya está reservado en ese horario' });
    }

    const [userCollisions] = await connection.query(`
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
      await connection.rollback();
      return res.status(400).json({ error: 'Ya tienes una reserva activa en este horario' });
    }

    const [result] = await connection.query(
      'UPDATE reservations SET user_id = ?, vehicle_id = ?, start_time = ?, end_time = ?, status = ? WHERE id = ?',
      [finalUserId, finalVehicleId, normalizedStartTime, normalizedEndTime, finalStatus, id]
    );

    if (String(finalStatus || '').toLowerCase() === 'finalizada') {
      const [vehicleRows] = await connection.query('SELECT kilometers FROM vehicles WHERE id = ?', [finalVehicleId]);
      const kmInicial = vehicleRows.length > 0 ? vehicleRows[0].kilometers : 0;

      if (km_entrega !== undefined && km_entrega !== null) {
        const parsedKm = Number.parseInt(km_entrega, 10);
        if (Number.isNaN(parsedKm) || parsedKm < 0) {
          await connection.rollback();
          return res.status(400).json({ error: 'Kilometraje de entrega inválido' });
        }

        const incidencias = String(estado_entrega || '').toLowerCase() === 'incorrecto';
        const informe = typeof informe_entrega === 'string' ? informe_entrega.trim() : null;

        await connection.query(`
          INSERT INTO validations (reservation_id, km_inicial, km_entrega, informe_entrega, incidencias, status)
          VALUES (?, ?, ?, ?, ?, 'pendiente')
          ON DUPLICATE KEY UPDATE km_entrega = VALUES(km_entrega), informe_entrega = VALUES(informe_entrega), incidencias = VALUES(incidencias)
        `, [id, kmInicial, parsedKm, informe, incidencias]);
      } else {
        await connection.query(`
          INSERT INTO validations (reservation_id, km_inicial, km_entrega, status)
          VALUES (?, ?, 0, 'pendiente')
          ON DUPLICATE KEY UPDATE km_inicial = IF(km_inicial IS NULL OR km_inicial = 0, VALUES(km_inicial), km_inicial)
        `, [id, kmInicial]);
      }
    }

    let vehicleStatus = null;
    const s = String(finalStatus || '').toLowerCase();
    if (s === 'aprobada' || s === 'pendiente') vehicleStatus = 'reservado';
    else if (s === 'activa') vehicleStatus = 'en-uso';
    else if (s === 'finalizada') vehicleStatus = 'pendiente-validacion';
    else if (s === 'rechazada') vehicleStatus = 'disponible';

    if (vehicleStatus) {
      await connection.query('UPDATE vehicles SET status = ? WHERE id = ?', [vehicleStatus, finalVehicleId]);
    }

    const oldVehicleId = original[0].vehicle_id;
    const [oldVehicleRows] = await connection.query('SELECT model, license_plate FROM vehicles WHERE id = ?', [oldVehicleId]);
    const [newVehicleRows] = await connection.query('SELECT model, license_plate FROM vehicles WHERE id = ?', [finalVehicleId]);
    const oldVehiculoInfo = oldVehicleRows.length > 0
      ? `${oldVehicleRows[0].model} (${oldVehicleRows[0].license_plate})`
      : `ID: ${oldVehicleId}`;
    const newVehiculoInfo = newVehicleRows.length > 0
      ? `${newVehicleRows[0].model} (${newVehicleRows[0].license_plate})`
      : `ID: ${finalVehicleId}`;

    const previousReservation = {
      user_id: original[0].user_id,
      vehicle_id: original[0].vehicle_id,
      vehiculo: oldVehiculoInfo,
      start_time: original[0].start_time,
      end_time: original[0].end_time,
      status: original[0].status
    };

    const currentReservation = {
      user_id: finalUserId,
      vehicle_id: finalVehicleId,
      vehiculo: newVehiculoInfo,
      start_time: normalizedStartTime,
      end_time: normalizedEndTime,
      status: finalStatus
    };

    const reservationChanges = {
      user_id: { from: previousReservation.user_id, to: currentReservation.user_id },
      vehicle_id: { from: previousReservation.vehicle_id, to: currentReservation.vehicle_id },
      vehiculo: { from: oldVehiculoInfo, to: newVehiculoInfo },
      start_time: { from: previousReservation.start_time, to: currentReservation.start_time },
      end_time: { from: previousReservation.end_time, to: currentReservation.end_time },
      status: { from: previousReservation.status, to: currentReservation.status }
    };

    const modifiedReservationFields = Object.keys(reservationChanges).filter(key =>
      String(reservationChanges[key].from) !== String(reservationChanges[key].to)
    );

    await connection.commit();

    try {
      await auditLogger.logAction(req.user.id, 'UPDATE', 'reservations', id, req.user.role, {
        previous: previousReservation,
        current: currentReservation,
        changes: reservationChanges,
        modifiedFields: modifiedReservationFields
      });
    } catch (auditError) {
      console.error('Error registrando auditoría de actualización de reserva:', auditError);
    }

    const [updatedReservation] = await connection.query(`
      SELECT 
        r.id,
        u.username,
        v.license_plate,
        v.model,
        v.status AS vehicle_status,
        r.start_time,
        r.end_time,
        r.status,
        r.user_id,
        r.vehicle_id,
        val.km_inicial,
        val.km_entrega,
        val.informe_entrega,
        val.incidencias
      FROM reservations r
      JOIN users u ON r.user_id = u.id
      JOIN vehicles v ON r.vehicle_id = v.id
      LEFT JOIN validations val ON r.id = val.reservation_id
      WHERE r.id = ?
    `, [id]);

    if (updatedReservation.length > 0) {
      const io = getIO();
      io.to('admin_dashboard').emit('updated_reservation', updatedReservation[0]);
    }

    res.json({ message: 'Reserva actualizada exitosamente' });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar reserva' });
  } finally {
    connection.release();
  }
};

// Función para eliminar una reserva.
exports.deleteReservation = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;

    // Verificar Propiedad (Solo el dueño o admin/supervisor pueden borrar)
    const [original] = await connection.query('SELECT user_id, vehicle_id, status FROM reservations WHERE id = ?', [id]);
    if (original.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    if (req.user.role === 'empleado' && original[0].user_id !== req.user.id) {
      await connection.rollback();
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta reserva' });
    }

    const vehicleId = original[0].vehicle_id;
    const reservationStatus = original[0].status;

    console.log(`[DELETE RESERVATION] ID: ${id}, Vehicle: ${vehicleId}, Status: ${reservationStatus}`);

    const [result] = await connection.query('DELETE FROM reservations WHERE id = ?', [id]);

    await syncVehicleStatusFromReservations(connection, vehicleId);

    await connection.commit();

    // Registrar auditoría de eliminación de reserva
    try {
      await auditLogger.logAction(req.user.id, 'DELETE', 'reservations', id, req.user.role, {
        user_id: original[0].user_id,
        vehicle_id: vehicleId,
        action: 'Reserva eliminada'
      });
    } catch (auditError) {
      console.error('Error registrando auditoría de eliminación de reserva:', auditError);
    }

    // Emitir evento de eliminación de reserva a todos los admins conectados
    const io = getIO();
    io.to('admin_dashboard').emit('deleted_reservation', { id });

    res.json({ message: 'Reserva eliminada exitosamente' });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}
    console.error('[DELETE RESERVATION ERROR]', error);
    res.status(500).json({ error: 'Error al eliminar reserva' });
  } finally {
    connection.release();
  }
};

// Funciones para gestionar vehículos (CRUD)
exports.getVehicles = async (req, res) => {
  try {
    const { start, end, excludeRes } = req.query;

    let query = `
      SELECT v.*, c.nombre as centre_name,
      (SELECT COUNT(*) FROM documents d WHERE d.vehicle_id = v.id AND d.expiration_date < CURDATE()) as has_expired_documents,
      (v.kilometers - (
        SELECT MAX(km_at_upload) FROM documents d WHERE d.vehicle_id = v.id AND d.type = "parte-taller"
      ) > 15000) as is_workshop_report_outdated
      FROM vehicles v
      LEFT JOIN centres c ON v.centre_id = c.id
    `;
    let params = [];
    let whereClauses = [];

    if (req.centreIds !== null) {
      if (req.centreIds.length === 0) return res.json([]);
      const inClause = req.centreIds.map(() => '?').join(',');
      whereClauses.push(`v.centre_id IN (${inClause})`);
      params.push(...req.centreIds);
    }

    if (start && end) {
      // Un vehículo NO está disponible si tiene una reserva que solape con el rango pedido.
      let availCond = `v.status = 'disponible' AND v.id NOT IN (
        SELECT vehicle_id FROM reservations 
        WHERE status NOT IN ('rechazada', 'finalizada')`;
      if (excludeRes) {
        availCond += ' AND id != ?';
        params.push(excludeRes);
      }
      availCond += ' AND start_time < ? AND end_time > ?)';
      params.push(end, start);
      whereClauses.push(availCond);
    }
    
    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
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
    let { license_plate, model, status, kilometers, centre_id } = req.body;
    if (!license_plate || !model) {
      return res.status(400).json({ error: 'La matrícula y el modelo son obligatorios' });
    }

    if (req.user.role !== 'admin') {
      centre_id = req.centreIds && req.centreIds.length > 0 ? req.centreIds[0] : null;
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
      'INSERT INTO vehicles (license_plate, model, status, kilometers, centre_id) VALUES (?, ?, ?, ?, ?)',
      [license_plate, model, status || 'disponible', kilometers || 0, centre_id || null]
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
    let { license_plate, model, status, kilometers, centre_id } = req.body;

    if (req.user.role !== 'admin') {
      // Non-admins cannot change the centre of a vehicle, they keep the existing one.
      centre_id = undefined;
    }

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
    const finalCentreId = centre_id !== undefined ? centre_id : current.centre_id;

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
      'UPDATE vehicles SET license_plate = ?, model = ?, status = ?, kilometers = ?, centre_id = ? WHERE id = ?',
      [finalLicensePlate, finalModel, finalStatus, finalKilometers, finalCentreId, id]
    );

    // Registrar auditoría de actualización de vehículo (incluye siempre valores previos y nuevos para evitar null)
    const vehiclePrevious = {
      license_plate: current.license_plate,
      model: current.model,
      status: current.status,
      kilometers: current.kilometers
    };

    const vehicleCurrent = {
      license_plate: finalLicensePlate,
      model: finalModel,
      status: finalStatus,
      kilometers: finalKilometers
    };

    const vehicleChanges = {
      license_plate: {
        from: vehiclePrevious.license_plate,
        to: vehicleCurrent.license_plate
      },
      model: {
        from: vehiclePrevious.model,
        to: vehicleCurrent.model
      },
      status: {
        from: vehiclePrevious.status,
        to: vehicleCurrent.status
      },
      kilometers: {
        from: vehiclePrevious.kilometers,
        to: vehicleCurrent.kilometers
      }
    };

    const modifiedFields = Object.keys(vehicleChanges).filter(
      (k) => vehicleChanges[k].from !== vehicleChanges[k].to
    );

    await auditLogger.logAction(req.user.id, 'UPDATE', 'vehicles', id, req.user.role, {
      action: 'vehicle_update',
      registro_id: id,
      previous: vehiclePrevious,
      current: vehicleCurrent,
      changes: vehicleChanges,
      modifiedFields
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

    // Cargar datos antes de eliminar
    const [existing] = await db.query('SELECT license_plate, model FROM vehicles WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }

    const deletedVehicle = existing[0];

    const [result] = await db.query('DELETE FROM vehicles WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }

    // Obtener username real del usuario que hace la eliminación
    const [userRows] = await db.query('SELECT username FROM users WHERE id = ?', [req.user.id]);
    const deletedByUsername = userRows.length > 0 ? userRows[0].username : `id:${req.user.id}`;

    // Registrar auditoría de eliminación de vehículo
    await auditLogger.logAction(req.user.id, 'DELETE', 'vehicles', id, req.user.role, {
      action: 'Vehículo eliminado',
      license_plate: deletedVehicle.license_plate,
      model: deletedVehicle.model,
      deleted_by: deletedByUsername
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
    let query = `
      SELECT u.id, u.username, u.role, u.created_at, u.deleted_at, 
             GROUP_CONCAT(uc.centre_id) as centre_ids
      FROM users u 
      LEFT JOIN user_centres uc ON u.id = uc.user_id
      WHERE u.deleted_at IS NULL
    `;
    let params = [];

    if (req.centreIds !== null) {
      if (req.centreIds.length === 0) return res.status(200).json([]);
      const inClause = req.centreIds.map(() => '?').join(',');
      query = `
        SELECT u.id, u.username, u.role, u.created_at, u.deleted_at,
               GROUP_CONCAT(uc.centre_id) as centre_ids
        FROM users u 
        JOIN user_centres auth_uc ON u.id = auth_uc.user_id 
        LEFT JOIN user_centres uc ON u.id = uc.user_id
        WHERE u.deleted_at IS NULL AND auth_uc.centre_id IN (${inClause})
      `;
      params = req.centreIds;
    }

    query += ' GROUP BY u.id ORDER BY u.id DESC';
    const [rows] = await db.query(query, params);
    
    const formattedRows = rows.map(r => ({
      ...r,
      centre_ids: r.centre_ids ? r.centre_ids.split(',').map(Number) : []
    }));
    
    res.status(200).json(formattedRows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los usuarios' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { username, password, role, centre_ids } = req.body;
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

    if (centre_ids && Array.isArray(centre_ids) && centre_ids.length > 0) {
      const values = centre_ids.map(cid => [result.insertId, cid]);
      await db.query('INSERT INTO user_centres (user_id, centre_id) VALUES ?', [values]);
    }

    // Registrar auditoría de creación de usuario
    await auditLogger.logAction(req.user.id, 'CREATE', 'users', result.insertId, req.user.role, {
      username: username,
      role: role,
      action: 'Nuevo usuario creado'
    });

    // Emitir evento de nuevo usuario a todos los admins
    const io = getIO();
    io.to('admin_dashboard').emit('new_user', {
      id: result.insertId,
      username: username,
      role: role,
      created_at: new Date()
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
    const { username, password, role, centre_ids } = req.body;

    // Obtener valores previos
    const [existingUsers] = await db.query('SELECT username, role FROM users WHERE id = ? AND deleted_at IS NULL', [id]);
    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const previousUser = existingUsers[0];

    // Si envían contraseña nueva, la hasheamos. Si no, solo actualizamos usuario y rol.
    let query, params;
    let passwordChanged = false;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      query = 'UPDATE users SET username = ?, password = ?, role = ? WHERE id = ? AND deleted_at IS NULL';
      params = [username, hashedPassword, role, id];
      passwordChanged = true;
    } else {
      query = 'UPDATE users SET username = ?, role = ? WHERE id = ? AND deleted_at IS NULL';
      params = [username, role, id];
    }

    const [result] = await db.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (centre_ids && Array.isArray(centre_ids)) {
      await db.query('DELETE FROM user_centres WHERE user_id = ?', [id]);
      if (centre_ids.length > 0) {
        const values = centre_ids.map(cid => [id, cid]);
        await db.query('INSERT INTO user_centres (user_id, centre_id) VALUES ?', [values]);
      }
    }

    const currentUser = {
      username,
      role
    };

    const userChanges = {
      username: {
        from: previousUser.username,
        to: currentUser.username
      },
      role: {
        from: previousUser.role,
        to: currentUser.role
      },
      password: {
        from: passwordChanged ? '*****' : 'sin cambio',
        to: passwordChanged ? '*****' : 'sin cambio'
      }
    };

    const modifiedFields = Object.keys(userChanges).filter((key) => {
      if (key === 'password') return passwordChanged;
      return userChanges[key].from !== userChanges[key].to;
    });

    // Registrar auditoría de actualización de usuario
    await auditLogger.logAction(req.user.id, 'UPDATE', 'users', id, req.user.role, {
      previous: previousUser,
      current: currentUser,
      changes: userChanges,
      modifiedFields
    });

    // Emitir evento de usuario actualizado a todos los admins
    const io = getIO();
    io.to('admin_dashboard').emit('updated_user', {
      id: id,
      username: username,
      role: role,
      previousRole: previousUser.role,
      changedFields: modifiedFields
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
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Identificar qué vehículos están afectados por las reservas de este usuario antes de borrarlas
    const [reservationsToDrop] = await connection.query('SELECT vehicle_id, status FROM reservations WHERE user_id = ?', [id]);

    // Borrar validaciones asociadas a las reservas del usuario
    await connection.query(`
      DELETE v FROM validations v
      INNER JOIN reservations r ON v.reservation_id = r.id
      WHERE r.user_id = ?
    `, [id]);

    // Borrar las reservas del usuario
    await connection.query('DELETE FROM reservations WHERE user_id = ?', [id]);

    // Actualizar el estado de los vehículos a 'disponible' para las reservas que no estaban finalizadas
    const uniqueVehicleIds = [...new Set((reservationsToDrop || []).map((r) => r.vehicle_id).filter((vehicleId) => vehicleId !== null && vehicleId !== undefined))];
    for (const vehicleId of uniqueVehicleIds) {
      // eslint-disable-next-line no-await-in-loop
      await syncVehicleStatusFromReservations(connection, vehicleId);
    }

    // Soft delete del usuario
    const [result] = await connection.query(
      'UPDATE users SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [id]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await connection.commit();

    // Registrar auditoría de eliminación de usuario
    try {
      await auditLogger.logAction(req.user.id, 'DELETE', 'users', id, req.user.role, {
        action: 'Usuario eliminado (soft delete)'
      });
    } catch (auditError) {
      console.error('Error registrando auditoría de eliminación de usuario:', auditError);
    }

    // Emitir evento de usuario eliminado a todos los admins
    const io = getIO();
    io.to('admin_dashboard').emit('deleted_user', { id });

    res.status(200).json({ message: 'Usuario y sus reservas eliminados' });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar al usuario y sus datos' });
  } finally {
    connection.release();
  }
};

// --- GESTIÓN DE DOCUMENTOS DE VEHÍCULOS ---
exports.getVehicleDocuments = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.centreIds !== null) {
      const [vehicle] = await db.query('SELECT centre_id FROM vehicles WHERE id = ?', [id]);
      if (vehicle.length === 0 || !req.centreIds.includes(vehicle[0].centre_id)) {
         return res.status(403).json({ error: 'No tienes permiso para ver los documentos de este vehículo' });
      }
    }

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

      const [vehicleRows] = await db.query('SELECT model, license_plate, kilometers FROM vehicles WHERE id = ?', [id]);
      const currentKm = vehicleRows.length > 0 ? vehicleRows[0].kilometers : 0;
      const vehiculoInfo = vehicleRows.length > 0 
        ? `${vehicleRows[0].model} (${vehicleRows[0].license_plate})`
        : `ID: ${id}`;

      const [result] = await db.query(
        'INSERT INTO documents (vehicle_id, type, expiration_date, file_path, original_name, km_at_upload) VALUES (?, ?, ?, ?, ?, ?)',
        [id, type, expiration_date, filePath, original_name, currentKm]
      );

      // Registrar auditoría de subida de documento (no bloqueante)
      try {
        await auditLogger.logAction(req.user.id, 'CREATE', 'documents', result.insertId, req.user.role, {
          vehicle_id: id,
          vehiculo: vehiculoInfo,
          type: type,
          original_name: original_name,
          expiration_date: expiration_date,
          file: filePath
        });
      } catch (auditError) {
        console.error('Fallo no bloqueante en auditoría (CREATE document):', auditError);
      }

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

    const [docRows] = await db.query(`
      SELECT d.type, d.original_name, d.file_path, v.id as vehicle_id, v.model, v.license_plate 
      FROM documents d
      JOIN vehicles v ON d.vehicle_id = v.id
      WHERE d.id = ?
    `, [id]);

    if (docRows.length === 0) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    const docResult = docRows[0];
    const vehiculoInfo = `${docResult.model} (${docResult.license_plate})`;
    const filePath = path.join(__dirname, '../uploads/documents', docResult.file_path);

    await db.query('DELETE FROM documents WHERE id = ?', [id]);

    // Registrar auditoría de eliminación de documento (no bloqueante)
    try {
      await auditLogger.logAction(req.user.id, 'DELETE', 'documents', id, req.user.role, {
        vehicle_id: docResult.vehicle_id,
        vehiculo: vehiculoInfo,
        document_type: docResult.type,
        original_name: docResult.original_name,
        file_path: docResult.file_path,
        action: 'Documento eliminado'
      });
    } catch (auditError) {
      console.error('Fallo no bloqueante en auditoría (DELETE document):', auditError);
    }

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

exports.updateVehicleDocument = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      const { id } = req.params;
      const { type, expiration_date, original_name } = req.body;

      if (!type || !expiration_date || !original_name) {
        // Si el admin subió un archivo pero olvidó llenar los campos, borramos el archivo
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
      }

      const [existingDocs] = await db.query('SELECT type, expiration_date, original_name, file_path, vehicle_id FROM documents WHERE id = ?', [id]);
      if (existingDocs.length === 0) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Documento no encontrado' });
      }

      const previousDoc = existingDocs[0];
      const oldFilePath = previousDoc.file_path;

      // Si hay un archivo nuevo, eliminar el antiguo
      if (req.file && oldFilePath) {
        const fileToDeletePath = path.join(__dirname, '../uploads/documents', oldFilePath);
        if (fs.existsSync(fileToDeletePath)) {
          try {
            fs.unlinkSync(fileToDeletePath);
          } catch (e) {
            console.error('Error deleting old file:', e);
          }
        }
      }

      // Preparar el nuevo file_path
      const newFilePath = req.file ? req.file.filename : oldFilePath;

      // Obtener el kilometraje del vehículo para el registro del documento
      const [vehicleForDoc] = await db.query('SELECT kilometers FROM vehicles WHERE id = (SELECT vehicle_id FROM documents WHERE id = ?)', [id]);
      const kmAtUpdate = vehicleForDoc.length > 0 ? vehicleForDoc[0].kilometers : previousDoc.km_at_upload;

      // Actualizar documento
      await db.query(
        'UPDATE documents SET type = ?, expiration_date = ?, original_name = ?, file_path = ?, km_at_upload = ? WHERE id = ?',
        [type, expiration_date, original_name, newFilePath, kmAtUpdate, id]
      );

      const currentDoc = {
        type,
        expiration_date,
        original_name,
        file_path: newFilePath
      };

      const changes = {
        type: { from: previousDoc.type, to: currentDoc.type },
        expiration_date: { from: previousDoc.expiration_date, to: currentDoc.expiration_date },
        original_name: { from: previousDoc.original_name, to: currentDoc.original_name }
      };

      if (req.file) {
        changes.file = { from: previousDoc.file_path, to: newFilePath };
      }

      const modifiedFields = Object.keys(changes).filter(key => changes[key].from !== changes[key].to);

      // Obtener info del vehículo para el audit
      const [vehicleRows] = await db.query('SELECT model, license_plate FROM vehicles WHERE id = ?', [previousDoc.vehicle_id]);
      const vehiculoInfo = vehicleRows.length > 0 
        ? `${vehicleRows[0].model} (${vehicleRows[0].license_plate})`
        : `ID: ${previousDoc.vehicle_id}`;

      // Registrar auditoría de actualización de documento (no bloqueante)
      try {
        await auditLogger.logAction(req.user.id, 'UPDATE', 'documents', id, req.user.role, {
          vehicle_id: previousDoc.vehicle_id,
          vehiculo: vehiculoInfo,
          previous: previousDoc,
          current: currentDoc,
          changes,
          modifiedFields,
          fileUpdated: !!req.file
        });
      } catch (auditError) {
        console.error('Fallo no bloqueante en auditoría (UPDATE document):', auditError);
      }

      res.json({
        message: 'Documento actualizado correctamente',
        document: {
          id,
          type,
          expiration_date,
          original_name,
          file_path: newFilePath
        }
      });
    } catch (error) {
      console.error(error);
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error('Error deleting file after error:', e);
        }
      }
      res.status(500).json({ error: 'Error al actualizar el documento' });
    }
  });
};

exports.getValidations = async (req, res) => {
  try {
    let whereClause = '';
    let params = [];
    if (req.centreIds !== null) {
      if (req.centreIds.length === 0) return res.json([]);
      const inClause = req.centreIds.map(() => '?').join(',');
      whereClause = `WHERE ve.centre_id IN (${inClause})`;
      params = req.centreIds;
    }

    const [rows] = await db.query(`
      SELECT 
        v.id, 
        v.km_inicial,
        v.km_entrega, 
        v.created_at, 
        v.incidencias,
        v.informe_incidencias,
        v.informe_entrega,
        v.informe_superior,
        v.status,
        v.decision_estado,
        u.username,
        ve.license_plate,
        ve.model
      FROM validations v
      INNER JOIN reservations r ON v.reservation_id = r.id
      INNER JOIN users u ON r.user_id = u.id
      INNER JOIN vehicles ve ON r.vehicle_id = ve.id
      ${whereClause}
      ORDER BY v.created_at DESC
    `, params);

    res.json(rows);
  } catch (err) {
    console.error("Error cargando validaciones con JOIN:", err);
    res.status(500).json({ error: "Error en el servidor al obtener validaciones" });
  }
};

exports.deleteValidation = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;

    if (!id) {
      await connection.rollback();
      return res.status(400).json({ error: 'ID de validación requerido' });
    }

    const [validationRows] = await connection.query(
      'SELECT reservation_id FROM validations WHERE id = ?',
      [id]
    );

    const reservationId = validationRows.length > 0 ? validationRows[0].reservation_id : null;
    const [result] = await connection.query('DELETE FROM validations WHERE id = ?', [id]);

    if (!result || result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Validación no encontrada' });
    }

    if (reservationId) {
      const [reservationRows] = await connection.query('SELECT vehicle_id FROM reservations WHERE id = ?', [reservationId]);
      if (reservationRows.length > 0) {
        await syncVehicleStatusFromReservations(connection, reservationRows[0].vehicle_id);
      }
    }

    await connection.commit();

    // Registrar auditoría de eliminación de validación
    try {
      await auditLogger.logAction(req.user.id, 'DELETE', 'validations', id, req.user.role, {
        action: 'Validación eliminada'
      });
    } catch (auditError) {
      console.error('Error registrando auditoría de eliminación de validación:', auditError);
    }

    res.json({ message: 'Validación eliminada correctamente' });
  } catch (err) {
    try {
      await connection.rollback();
    } catch {}
    console.error('Error eliminando validación:', err);
    res.status(500).json({ error: 'Error al eliminar la validación' });
  } finally {
    connection.release();
  }
};

exports.updateValidation = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, informe_superior, km_entrega, incidencias, informe_incidencias, decision_estado } = req.body;

    if (!id) return res.status(400).json({ error: 'ID de validación requerido' });

    const [existingValidations] = await db.query(
      'SELECT status, informe_superior, km_entrega, incidencias, informe_incidencias, decision_estado FROM validations WHERE id = ?',
      [id]
    );
    if (existingValidations.length === 0) {
      return res.status(404).json({ error: 'Validación no encontrada' });
    }

    const previousValidation = existingValidations[0];
    const newStatus = status || 'revisada';
    const normalizedInformeIncidencias = typeof informe_incidencias === 'string'
      ? informe_incidencias.trim()
      : informe_incidencias ?? null;

    await db.query(
      'UPDATE validations SET status = ?, informe_superior = ?, km_entrega = ?, incidencias = ?, informe_incidencias = ?, decision_estado = ? WHERE id = ?',
      [newStatus, informe_superior, km_entrega, incidencias, normalizedInformeIncidencias, decision_estado, id]
    );

    const currentValidation = {
      status: newStatus,
      informe_superior,
      km_entrega,
      incidencias,
      informe_incidencias: normalizedInformeIncidencias,
      decision_estado
    };

    const changes = {
      status: { from: previousValidation.status, to: currentValidation.status },
      informe_superior: { from: previousValidation.informe_superior, to: currentValidation.informe_superior },
      km_entrega: { from: previousValidation.km_entrega, to: currentValidation.km_entrega },
      incidencias: { from: previousValidation.incidencias, to: currentValidation.incidencias },
      informe_incidencias: { from: previousValidation.informe_incidencias, to: currentValidation.informe_incidencias },
      decision_estado: { from: previousValidation.decision_estado, to: currentValidation.decision_estado }
    };

    const modifiedFields = Object.keys(changes).filter(key => String(changes[key].from) !== String(changes[key].to));

    // Registrar auditoría de actualización de validación
    await auditLogger.logAction(req.user.id, 'UPDATE', 'validations', id, req.user.role, {
      previous: previousValidation,
      current: currentValidation,
      changes,
      modifiedFields
    });

    res.json({ message: 'Validación actualizada correctamente' });
  } catch (err) {
    console.error('Error actualizando validación:', err);
    res.status(500).json({ error: 'Error al actualizar la validación' });
  }
};

