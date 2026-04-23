export const getDeliveryKilometers = (record) => {
  const rawKm = record?.km_entrega;

  if (rawKm === null || rawKm === undefined || rawKm === '') return null;

  const km = Number(rawKm);
  if (!Number.isFinite(km) || km <= 0) return null;

  return km;
};

export const hasValidDeliveryKilometers = (record) => getDeliveryKilometers(record) !== null;

export const formatDeliveryKilometers = (record, fallback = 'Pendiente') => {
  const km = getDeliveryKilometers(record);
  return km === null ? fallback : `${km} km`;
};
