import { RESERVATION_STATUS, normalizeReservationStatus } from './statusConcordance';

const parseDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
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
