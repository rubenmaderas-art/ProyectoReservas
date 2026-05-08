/**
 * Validador de matrículas españolas (formato desde los años 90)
 * Formato: 4 dígitos + 3 letras (sin vocales: A, E, I, O, U ni Ñ)
 * Ejemplo: 1234BCB, 5678DFG
 */

// Letras válidas para matrícula española (sin vocales ni Ñ)
const VALID_PLATE_LETTERS = 'BCDFGHJKLMNPRSTVWXYZ';

/**
 * Valida el formato de matrícula española
 * @param {string} plate - La matrícula a validar
 * @returns {object} { isValid: boolean, formatted: string, error: string }
 */
export const validateSpanishPlate = (plate) => {
  if (!plate) {
    return { isValid: false, formatted: '', error: 'La matrícula no puede estar vacía' };
  }

  // Eliminar espacios y guiones
  const cleaned = plate.replace(/[\s\-]/g, '').toUpperCase();

  // Debe tener exactamente 7 caracteres: 4 dígitos + 3 letras
  if (cleaned.length !== 7) {
    return {
      isValid: false,
      formatted: cleaned,
      error: 'La matrícula debe tener 4 dígitos y 3 letras (7 caracteres)'
    };
  }

  // Primeros 4 caracteres deben ser dígitos
  if (!/^\d{4}/.test(cleaned)) {
    return {
      isValid: false,
      formatted: cleaned,
      error: 'Los primeros 4 caracteres deben ser dígitos'
    };
  }

  // Últimos 3 caracteres deben ser letras válidas (sin vocales)
  const letters = cleaned.slice(4, 7);
  if (!/^[A-Z]{3}$/.test(letters)) {
    return {
      isValid: false,
      formatted: cleaned,
      error: 'Los últimos 3 caracteres deben ser letras'
    };
  }

  // Verificar que no contenga vocales
  if (/[AEIOUÑ]/.test(letters)) {
    return {
      isValid: false,
      formatted: cleaned,
      error: 'La matrícula no puede contener vocales (A, E, I, O, U) ni Ñ'
    };
  }

  // Formato válido: 1234-BCB (con guión opcional para presentación)
  const formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}`;

  return { isValid: true, formatted: cleaned, error: '' };
};

/**
 * Filtra caracteres válidos mientras se escribe
 * @param {string} input - Input del usuario
 * @returns {string} - Texto filtrado
 */
export const filterPlateInput = (input) => {
  const cleaned = input.toUpperCase().replace(/[\s\-]/g, '');

  // Limitar a 7 caracteres
  let result = cleaned.slice(0, 7);

  // Mantener solo dígitos y letras válidas
  let finalResult = '';
  for (let i = 0; i < result.length; i++) {
    if (i < 4) {
      // Primeros 4: solo dígitos
      if (/\d/.test(result[i])) {
        finalResult += result[i];
      }
    } else {
      // Últimos 3: solo letras válidas (sin vocales)
      if (VALID_PLATE_LETTERS.includes(result[i])) {
        finalResult += result[i];
      }
    }
  }

  return finalResult;
};

/**
 * Formatea la matrícula con guión para presentación
 * @param {string} plate - Matrícula sin formato
 * @returns {string} - Matrícula formateada (1234-BCB)
 */
export const formatPlateDisplay = (plate) => {
  const cleaned = plate.replace(/[\s\-]/g, '').toUpperCase();
  if (cleaned.length === 7) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}`;
  }
  return cleaned;
};
