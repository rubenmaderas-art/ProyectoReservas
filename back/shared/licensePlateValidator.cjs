const VALID_PLATE_LETTERS = 'BCDFGHJKLMNPRSTVWXYZ';
const SPANISH_PLATE_REGEX = /^(\d{4})([BCDFGHJKLMNPRSTVWXYZ]{3})$/;

const normalizePlate = (plate) => String(plate ?? '').replace(/[\s\-]/g, '').toUpperCase();

const validateSpanishPlate = (plate) => {
  if (!plate || typeof plate !== 'string') {
    return {
      isValid: false,
      formatted: '',
      error: 'La matrícula no puede estar vacía',
    };
  }

  const cleaned = normalizePlate(plate);

  if (!SPANISH_PLATE_REGEX.test(cleaned)) {
    return {
      isValid: false,
      formatted: cleaned,
      error: 'La matrícula debe tener un formato válido: 4 dígitos seguidos de 3 letras (sin vocales A, E, I, O, U ni Ñ). Ejemplo: 1234BCB',
    };
  }

  return { isValid: true, formatted: cleaned, error: '' };
};

const filterPlateInput = (input) => {
  const cleaned = normalizePlate(input).slice(0, 7);

  let result = '';
  for (let i = 0; i < cleaned.length; i += 1) {
    if (i < 4) {
      if (/\d/.test(cleaned[i])) {
        result += cleaned[i];
      }
      continue;
    }

    if (VALID_PLATE_LETTERS.includes(cleaned[i])) {
      result += cleaned[i];
    }
  }

  return result;
};

const formatPlateDisplay = (plate) => {
  const cleaned = normalizePlate(plate);
  if (cleaned.length === 7) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}`;
  }
  return cleaned;
};

module.exports = {
  VALID_PLATE_LETTERS,
  SPANISH_PLATE_REGEX,
  normalizePlate,
  validateSpanishPlate,
  filterPlateInput,
  formatPlateDisplay,
};
