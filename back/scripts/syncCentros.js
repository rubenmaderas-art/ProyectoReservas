/**
 * Script de sincronización de centros desde UnificaPP
 * Sincroniza datos de MySQL remoto (UnificaPP) a MySQL local (PC)
 * 
 * La sincronización se hace de la siguiente manera:
 * 1. Se conecta a la base de datos local.
 * 2. Se verifica si la tabla "centres" existe en la base de datos local.
 * 3. Se conecta a la base de datos remota de UnificaPP.
 * 4. Se extraen los datos de centros y sedes de la base de datos remota.
 * 5. Se insertan/actualizan los registros en la base de datos local.
 * 
 * Al finalizar la sincronización, se muestra el resultado en la consola.
 */

const { syncCentresFromUnifica } = require('../utils/centresSync');
require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });
syncCentresFromUnifica()
  .then(({ count, errors, total }) => {
    console.log('\n' + '='.repeat(60));
    console.log('SINCRONIZACIÓN EXITOSA');
    console.log('='.repeat(60));
    console.log(`Registros procesados: ${count}`);
    console.log(`Errores: ${errors}`);
    console.log(`Total extraído: ${total}`);
    console.log('Fecha: ' + new Date().toLocaleString('es-ES'));
    console.log('='.repeat(60) + '\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error no controlado:', err);
    process.exit(1);
  });
