export const VEHICLE_STATUS = Object.freeze({
  DISPONIBLE: 'disponible',
  NO_DISPONIBLE: 'no-disponible',
  RESERVADO: 'reservado',
  EN_USO: 'en-uso',
  PENDIENTE_VALIDACION: 'pendiente-validacion',
});

export const RESERVATION_STATUS = Object.freeze({
  PENDIENTE: 'pendiente',
  APROBADA: 'aprobada',
  ACTIVA: 'activa',
  FINALIZADA: 'finalizada',
  RECHAZADA: 'rechazada',
});

const normalize = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, '-');

export const normalizeVehicleStatus = (status) => normalize(status);
export const normalizeReservationStatus = (status) => normalize(status);

export const isVehicleReservable = (vehicleStatus) =>
  normalizeVehicleStatus(vehicleStatus) === VEHICLE_STATUS.DISPONIBLE;

export const getCompatibleReservationStatusesForVehicle = (vehicleStatus) => {
  const s = normalizeVehicleStatus(vehicleStatus);
  switch (s) {
    case VEHICLE_STATUS.NO_DISPONIBLE:
      return [RESERVATION_STATUS.RECHAZADA];
    case VEHICLE_STATUS.RESERVADO:
      return [RESERVATION_STATUS.PENDIENTE, RESERVATION_STATUS.APROBADA];
    case VEHICLE_STATUS.EN_USO:
      return [RESERVATION_STATUS.ACTIVA];
    case VEHICLE_STATUS.PENDIENTE_VALIDACION:
      return [RESERVATION_STATUS.FINALIZADA];
    case VEHICLE_STATUS.DISPONIBLE:
    default:
      return [];
  }
};

export const isReservationStatusCompatibleWithVehicle = (vehicleStatus, reservationStatus) => {
  const allowed = getCompatibleReservationStatusesForVehicle(vehicleStatus);
  if (allowed.length === 0) return true;
  return allowed.includes(normalizeReservationStatus(reservationStatus));
};

export const getDesiredVehicleStatusForReservation = (reservationStatus) => {
  const s = normalizeReservationStatus(reservationStatus);
  if (s === RESERVATION_STATUS.PENDIENTE || s === RESERVATION_STATUS.APROBADA) return VEHICLE_STATUS.RESERVADO;
  if (s === RESERVATION_STATUS.ACTIVA) return VEHICLE_STATUS.EN_USO;
  if (s === RESERVATION_STATUS.FINALIZADA) return VEHICLE_STATUS.PENDIENTE_VALIDACION;
  return null;
};

export const NON_TERMINAL_RESERVATION_STATUSES = Object.freeze([
  RESERVATION_STATUS.PENDIENTE,
  RESERVATION_STATUS.APROBADA,
  RESERVATION_STATUS.ACTIVA,
]);

export const isNonTerminalReservationStatus = (reservationStatus) =>
  NON_TERMINAL_RESERVATION_STATUSES.includes(normalizeReservationStatus(reservationStatus));
