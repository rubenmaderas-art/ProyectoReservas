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

    // No permitir reservas en el pasado
    const now = new Date();
    if (new Date(normalizedStartTime) < now) {
      return res.status(400).json({ error: 'La fecha de inicio no puede estar en el pasado' });
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

    // Sincronizar estado inicial del vehículo (pendiente o aprobada -> reservado)
    let initialVehicleStatus = 'reservado';
    if (String(finalStatus || '').toLowerCase() === 'activa') initialVehicleStatus = 'en-uso';
    await db.query('UPDATE vehicles SET status = ? WHERE id = ?', [initialVehicleStatus, vehicle_id]);

    // Obtener info del vehículo para el audit
    const [vehicleInfoRows] = await db.query('SELECT model, license_plate FROM vehicles WHERE id = ?', [vehicle_id]);
    const vehiculoInfo = vehicleInfoRows.length > 0
      ? `${vehicleInfoRows[0].model} (${vehicleInfoRows[0].license_plate})`
      : `ID: ${vehicle_id}`;

    // Registrar auditoría de creación de reserva
    await auditLogger.logAction(req.user.id, 'CREATE', 'reservations', result.insertId, req.user.role, {
      user_id: finalUserId,
      vehicle_id: vehicle_id,
      vehiculo: vehiculoInfo,
      start_time: normalizedStartTime,
      end_time: normalizedEndTime,
      status: finalStatus
    });

    // Obtener los datos de la nueva reserva para emitir al admin
    const [newReservation] = await db.query(`
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
    const requestedStatus = String(status || '').toLowerCase();
    const currentStatus = String(original[0].status || '').toLowerCase();

    if (req.user.role === 'empleado') {
      finalUserId = req.user.id;

      // El empleado solo puede finalizar su propia reserva o activarla automáticamente
      if (requestedStatus === 'finalizada' && ['pendiente', 'aprobada', 'activa'].includes(currentStatus)) {
        finalStatus = 'finalizada';
      } else if (requestedStatus === 'activa' && currentStatus === 'aprobada') {
        finalStatus = 'activa';
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

    const now = new Date();
    const isEmployee = req.user.role === 'empleado';
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

    if (new Date(normalizedStartTime) < now && !allowPastStartForEdit) {
      return res.status(400).json({ error: 'La fecha de inicio no puede estar en el pasado' });
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
      // Capturar los km actuales del vehículo ANTES de actualizarlos (son los km iniciales de la reserva)
      const [vehicleRows] = await db.query('SELECT kilometers FROM vehicles WHERE id = ?', [finalVehicleId]);
      const kmInicial = vehicleRows.length > 0 ? vehicleRows[0].kilometers : 0;

      // Si se está entregando ahora (km_entrega viene en el payload)
      if (km_entrega !== undefined && km_entrega !== null) {
        const parsedKm = Number.parseInt(km_entrega, 10);
        if (Number.isNaN(parsedKm) || parsedKm < 0) {
          return res.status(400).json({ error: 'Kilometraje de entrega inválido' });
        }

        const incidencias = String(estado_entrega || '').toLowerCase() === 'incorrecto';
        const informe = typeof informe_entrega === 'string' ? informe_entrega.trim() : null;

        await db.query(`
          INSERT INTO validations (reservation_id, km_inicial, km_entrega, informe_entrega, incidencias, status)
          VALUES (?, ?, ?, ?, ?, 'pendiente')
          ON DUPLICATE KEY UPDATE km_entrega = VALUES(km_entrega), informe_entrega = VALUES(informe_entrega), incidencias = VALUES(incidencias)
        `, [id, kmInicial, parsedKm, informe, incidencias]);
      } else {
        // Si NO se está entregando ahora (solo se finaliza), creamos/actualizamos el registro con km_inicial para que admin/supervisor lo puedan rellenar después
        await db.query(`
          INSERT INTO validations (reservation_id, km_inicial, status)
          VALUES (?, ?, 'pendiente')
          ON DUPLICATE KEY UPDATE km_inicial = IF(km_inicial IS NULL OR km_inicial = 0, VALUES(km_inicial), km_inicial)
        `, [id, kmInicial]);
      }
    }

    // Sincronizar estado del vehículo
    let vehicleStatus = null;
    const s = String(finalStatus || '').toLowerCase();
    if (s === 'aprobada' || s === 'pendiente') vehicleStatus = 'reservado';
    else if (s === 'activa') vehicleStatus = 'en-uso';
    else if (s === 'finalizada') vehicleStatus = 'pendiente-validacion';
    else if (s === 'rechazada') {
      vehicleStatus = 'disponible';
    }

    if (vehicleStatus) {
      await db.query('UPDATE vehicles SET status = ? WHERE id = ?', [vehicleStatus, finalVehicleId]);
    }

    // Registrar auditoría de actualización de reserva
    // Obtener info de ambos vehículos para el audit
    const oldVehicleId = original[0].vehicle_id;
    const [oldVehicleRows] = await db.query('SELECT model, license_plate FROM vehicles WHERE id = ?', [oldVehicleId]);
    const [newVehicleRows] = await db.query('SELECT model, license_plate FROM vehicles WHERE id = ?', [finalVehicleId]);
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
      user_id: {
        from: previousReservation.user_id,
        to: currentReservation.user_id
      },
      vehicle_id: {
        from: previousReservation.vehicle_id,
        to: currentReservation.vehicle_id
      },
      vehiculo: {
        from: oldVehiculoInfo,
        to: newVehiculoInfo
      },
      start_time: {
        from: previousReservation.start_time,
        to: currentReservation.start_time
      },
      end_time: {
        from: previousReservation.end_time,
        to: currentReservation.end_time
      },
      status: {
        from: previousReservation.status,
        to: currentReservation.status
      }
    };

    const modifiedReservationFields = Object.keys(reservationChanges).filter(key =>
      String(reservationChanges[key].from) !== String(reservationChanges[key].to)
    );

    await auditLogger.logAction(req.user.id, 'UPDATE', 'reservations', id, req.user.role, {
      previous: previousReservation,
      current: currentReservation,
      changes: reservationChanges,
      modifiedFields: modifiedReservationFields
    });

    // Obtener los datos actualizados de la reserva para emitir al admin
    const [updatedReservation] = await db.query(`
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

    // Emitir evento de actualización de reserva a todos los admins conectados
    if (updatedReservation.length > 0) {
      const io = getIO();
      io.to('admin_dashboard').emit('updated_reservation', updatedReservation[0]);
    }

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
    const [original] = await db.query('SELECT user_id, vehicle_id, status FROM reservations WHERE id = ?', [id]);
    if (original.length === 0) return res.status(404).json({ error: 'Reserva no encontrada' });

    if (req.user.role === 'empleado' && original[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta reserva' });
    }

    const vehicleId = original[0].vehicle_id;
    const reservationStatus = original[0].status;

    console.log(`[DELETE RESERVATION] ID: ${id}, Vehicle: ${vehicleId}, Status: ${reservationStatus}`);

    const [result] = await db.query('DELETE FROM reservations WHERE id = ?', [id]);

    // Si la reserva no estaba finalizada, cambiar el vehículo a disponible
    if (reservationStatus !== 'finalizada') {
      console.log(`[DELETE RESERVATION] Actualizando vehículo ${vehicleId} a disponible`);
      const [updateResult] = await db.query('UPDATE vehicles SET status = ? WHERE id = ?', ['disponible', vehicleId]);
      console.log(`[DELETE RESERVATION] Update result:`, updateResult);
    } else {
      console.log(`[DELETE RESERVATION] Reserva finalizada, no se actualiza el vehículo`);
    }

    // Registrar auditoría de eliminación de reserva
    await auditLogger.logAction(req.user.id, 'DELETE', 'reservations', id, req.user.role, {
      user_id: original[0].user_id,
      vehicle_id: vehicleId,
      action: 'Reserva eliminada'
    });

    // Emitir evento de eliminación de reserva a todos los admins conectados
    const io = getIO();
    io.to('admin_dashboard').emit('deleted_reservation', { id });

    res.json({ message: 'Reserva eliminada exitosamente' });
  } catch (error) {
    console.error('[DELETE RESERVATION ERROR]', error);
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
    const { username, password, role } = req.body;

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

  try {
    // Iniciamos una transacción para asegurar que todo se borre correctamente o nada se borre
    await db.query('START TRANSACTION');

    // Identificar qué vehículos están afectados por las reservas de este usuario antes de borrarlas
    const [reservationsToDrop] = await db.query('SELECT vehicle_id, status FROM reservations WHERE user_id = ?', [id]);

    // Borrar validaciones asociadas a las reservas del usuario
    await db.query(`
      DELETE v FROM validations v
      INNER JOIN reservations r ON v.reservation_id = r.id
      WHERE r.user_id = ?
    `, [id]);

    // Borrar las reservas del usuario
    await db.query('DELETE FROM reservations WHERE user_id = ?', [id]);

    // Actualizar el estado de los vehículos a 'disponible' para las reservas que no estaban finalizadas
    for (const r of reservationsToDrop) {
      if (r.status !== 'finalizada') {
        await db.query('UPDATE vehicles SET status = ? WHERE id = ?', ['disponible', r.vehicle_id]);
      }
    }

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

    // Emitir evento de usuario eliminado a todos los admins
    const io = getIO();
    io.to('admin_dashboard').emit('deleted_user', { id });

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

      const [vehicleRows] = await db.query('SELECT model, license_plate FROM vehicles WHERE id = ?', [id]);
      const vehiculoInfo = vehicleRows.length > 0 
        ? `${vehicleRows[0].model} (${vehicleRows[0].license_plate})`
        : `ID: ${id}`;

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

      // Actualizar documento
      await db.query(
        'UPDATE documents SET type = ?, expiration_date = ?, original_name = ?, file_path = ? WHERE id = ?',
        [type, expiration_date, original_name, newFilePath, id]
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

