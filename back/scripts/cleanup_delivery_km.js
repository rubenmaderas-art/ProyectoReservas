#!/usr/bin/env node

/**
 * Limpia entregas históricas inválidas.
 *
 * Convierte km_entrega = 0 (o valores no positivos) a NULL en:
 * - validations (solo filas no borradas)
 *
 * Esto evita que una entrega vacía siga pareciendo completada.
 */

const db = require('../config/db');

function log(message, type = 'INFO') {
  const timestamp = new Date().toLocaleString('es-ES');
  console.log(`[${timestamp}] [${type}] ${message}`);
}

async function cleanupDeliveryKilometers() {
  const connection = await db.getConnection();

  try {
    log('Iniciando limpieza de km_entrega inválidos...');
    const [columnRows] = await connection.query(
      `
        SELECT IS_NULLABLE
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'validations'
          AND COLUMN_NAME = 'km_entrega'
        LIMIT 1
      `
    );

    if (columnRows[0]?.IS_NULLABLE === 'NO') {
      log('Ajustando validations.km_entrega para permitir NULL...');
      await connection.query('ALTER TABLE validations MODIFY km_entrega INT NULL');
    }

    await connection.beginTransaction();

    const [validationResult] = await connection.query(
      `
        UPDATE validations
        SET km_entrega = NULL
        WHERE deleted_at IS NULL
          AND km_entrega IS NOT NULL
          AND km_entrega <= 0
      `
    );

    await connection.commit();

    const validationsUpdated = validationResult?.affectedRows ?? 0;

    log(`Limpieza completada. Validaciones actualizadas: ${validationsUpdated}.`);
  } catch (error) {
    await connection.rollback();
    log(`Error limpiando km_entrega inválidos: ${error.message}`, 'ERROR');
    throw error;
  } finally {
    connection.release();
  }
}

if (require.main === module) {
  cleanupDeliveryKilometers()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { cleanupDeliveryKilometers };
