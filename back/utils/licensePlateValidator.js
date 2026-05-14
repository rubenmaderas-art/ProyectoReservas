/**
 * Validador de matrículas españolas (formato desde los años 90)
 * Formato: 4 dígitos + 3 letras (sin vocales: A, E, I, O, U ni Ñ)
 * Ejemplo: 1234BCB, 5678DFG
 */

const SPANISH_PLATE_REGEX = /^(\d{4})([BCDFGHJKLMNPRSTVWXYZ]{3})$/;

/**
 * Valida el formato de matrícula española
 * @param {string} plate - La matrícula a validar
 * @returns {object} { isValid: boolean, error: string }
 */
const validateSpanishPlate = (plate) => {
  if (!plate || typeof plate !== 'string') {
    return {
      isValid: false,
      error: 'La matrícula no puede estar vacía'
    };
  }

  const cleaned = plate.replace(/[\s\-]/g, '').toUpperCase();

  if (!SPANISH_PLATE_REGEX.test(cleaned)) {
    return {
      isValid: false,
      error: 'La matrícula debe tener un formato válido: 4 dígitos seguidos de 3 letras (sin vocales A, E, I, O, U ni Ñ). Ejemplo: 1234BCB'
    };
  }

  return { isValid: true, error: '' };
};

/**
 * Normaliza una matrícula para base de datos
 * @param {string} plate - La matrícula a normalizar
 * @returns {string} - Matrícula normalizada (sin espacios, sin guiones, mayúsculas)
 */
const normalizePlate = (plate) => {
  return plate.replace(/[\s\-]/g, '').toUpperCase();
};

module.exports = {
  validateSpanishPlate,
  normalizePlate,
  SPANISH_PLATE_REGEX
};
