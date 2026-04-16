const db = require('../config/db');

const normalizeStatus = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, '-');

const parseDate = (value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getDesiredReservationStatusForTime = (reservation, now = new Date()) => {
  const current = normalizeStatus(reservation?.status);
  if (current !== 'aprobada' && current !== 'activa') return null;

  const start = parseDate(reservation?.start_time);
  const end = parseDate(reservation?.end_time);
  if (!start || !end) return null;

  if (start <= now && now <= end) return 'activa';
  if (now > end) return 'finalizada';

  return null;
};

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

const syncReservationStatusesByTime = async () => {
  const connection = await db.getConnection();
  const touchedVehicleIds = new Set();
  const updatedReservations = [];

  try {
    await connection.beginTransaction();

    const [reservations] = await connection.query(`
      SELECT id, vehicle_id, status, start_time, end_time
      FROM reservations
      WHERE status IN ('aprobada', 'activa')
    `);

    const now = new Date();

    for (const reservation of Array.isArray(reservations) ? reservations : []) {
      const desiredStatus = getDesiredReservationStatusForTime(reservation, now);
      if (!desiredStatus) continue;

      const currentStatus = normalizeStatus(reservation.status);
      if (currentStatus === desiredStatus) continue;

      // eslint-disable-next-line no-await-in-loop
      await connection.query(
        'UPDATE reservations SET status = ? WHERE id = ?',
        [desiredStatus, reservation.id]
      );

      updatedReservations.push({
        id: reservation.id,
        vehicle_id: reservation.vehicle_id,
        previous_status: currentStatus,
        status: desiredStatus,
      });

      if (reservation.vehicle_id !== null && reservation.vehicle_id !== undefined) {
        touchedVehicleIds.add(String(reservation.vehicle_id));
      }
    }

    for (const vehicleId of touchedVehicleIds) {
      // eslint-disable-next-line no-await-in-loop
      await syncVehicleStatusFromReservations(connection, vehicleId);
    }

    await connection.commit();
    return updatedReservations;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  getDesiredReservationStatusForTime,
  syncReservationStatusesByTime,
  syncVehicleStatusFromReservations,
};
