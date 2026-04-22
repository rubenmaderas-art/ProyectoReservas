import { RESERVATION_STATUS, normalizeReservationStatus } from './statusConcordance';
import { parseMySqlDateTime } from './dateTime';

const parseDate = (value) => {
  return parseMySqlDateTime(value);
};

export const getDesiredReservationStatusForTime = (reservation, now = new Date()) => {
  const current = normalizeReservationStatus(reservation?.status);

  if (current !== RESERVATION_STATUS.APROBADA && current !== RESERVATION_STATUS.ACTIVA) {
    return null;
  }

  const start = parseDate(reservation?.start_time);
  const end = parseDate(reservation?.end_time);
  if (!start || !end) return null;

  if (start <= now && now <= end) return RESERVATION_STATUS.ACTIVA;

  if (now > end) return RESERVATION_STATUS.FINALIZADA;

  return null;
};

export const planReservationTimeBasedUpdates = (reservations, now = new Date()) => {
  const list = Array.isArray(reservations) ? reservations : [];
  const updates = [];

  for (const reservation of list) {
    const desired = getDesiredReservationStatusForTime(reservation, now);
    if (!desired) continue;

    const current = normalizeReservationStatus(reservation?.status);
    if (current !== desired) updates.push({ reservation, newStatus: desired });
  }

  return updates;
};
