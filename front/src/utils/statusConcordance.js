export const VEHICLE_STATUS = Object.freeze({
  DISPONIBLE: 'disponible',
  NO_DISPONIBLE: 'no-disponible',
  RESERVADO: 'reservado',
  EN_USO: 'en-uso',
  FORMULARIO_ENTREGA_PENDIENTE: 'formulario-entrega-pendiente',
  PENDIENTE_VALIDACION: 'pendiente-validacion',
});

export const RESERVATION_STATUS = Object.freeze({
  PENDIENTE: 'pendiente',
  APROBADA: 'aprobada',
  ACTIVA: 'activa',
  FINALIZADA: 'finalizada',
  RECHAZADA: 'rechazada',
});

export const getFormKilometersDelivery = (km_entrega) => Object.freeze({
  COMPLETADO: km_entrega != null,
  PENDIENTE: km_entrega == null,
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
    case VEHICLE_STATUS.FORMULARIO_ENTREGA_PENDIENTE:
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

export const getDesiredVehicleStatusForReservation = (reservationStatus, km_entrega) => {
  const s = normalizeReservationStatus(reservationStatus);
  if (s === RESERVATION_STATUS.PENDIENTE || s === RESERVATION_STATUS.APROBADA) return VEHICLE_STATUS.RESERVADO;
  if (s === RESERVATION_STATUS.ACTIVA) return VEHICLE_STATUS.EN_USO;

  const formStatus = getFormKilometersDelivery(km_entrega);

  if (s === RESERVATION_STATUS.FINALIZADA && formStatus.COMPLETADO)
    return VEHICLE_STATUS.PENDIENTE_VALIDACION;

  if (s === RESERVATION_STATUS.FINALIZADA && formStatus.PENDIENTE)
    return VEHICLE_STATUS.FORMULARIO_ENTREGA_PENDIENTE;
  return null;
};

export const getDesiredVehicleStatusForReservations = (vehicle, reservations) => {
  const currentVehicleStatus = normalizeVehicleStatus(vehicle?.status);

  // Si el vehículo está fuera de servicio o esperando validación técnica de entrega, 
  // no permitimos que la sincronización automática de reservas cambie su estado.
  if (currentVehicleStatus === VEHICLE_STATUS.NO_DISPONIBLE) return null;

  const vehicleId = vehicle?.id;
  if (vehicleId === undefined || vehicleId === null) return null;

  const list = Array.isArray(reservations) ? reservations : [];

  const vehicleReservations = list.filter(
    (r) => String(r?.vehicle_id) === String(vehicleId)
  );

  const hasFinalizedReservation = vehicleReservations.some(
    (r) => normalizeReservationStatus(r?.status) === RESERVATION_STATUS.FINALIZADA
  );

  if (
    (currentVehicleStatus === VEHICLE_STATUS.FORMULARIO_ENTREGA_PENDIENTE ||
     currentVehicleStatus === VEHICLE_STATUS.PENDIENTE_VALIDACION) &&
    hasFinalizedReservation
  ) {
    return null;
  }

  if (vehicleReservations.some((r) => normalizeReservationStatus(r?.status) === RESERVATION_STATUS.ACTIVA)) {
    return VEHICLE_STATUS.EN_USO;
  }

  if (vehicleReservations.some((r) => {
    const s = normalizeReservationStatus(r?.status);
    return s === RESERVATION_STATUS.PENDIENTE || s === RESERVATION_STATUS.APROBADA;
  })) {
    return VEHICLE_STATUS.RESERVADO;
  }

  return VEHICLE_STATUS.DISPONIBLE;
};

export const NON_TERMINAL_RESERVATION_STATUSES = Object.freeze([
  RESERVATION_STATUS.PENDIENTE,
  RESERVATION_STATUS.APROBADA,
  RESERVATION_STATUS.ACTIVA,
]);

export const isNonTerminalReservationStatus = (reservationStatus) =>
  NON_TERMINAL_RESERVATION_STATUSES.includes(normalizeReservationStatus(reservationStatus));
