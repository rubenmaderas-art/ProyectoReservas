const mysql = require('mysql2/promise');

function createLogger(logger = console) {
  return (message, type = 'INFO') => {
    if (logger && typeof logger.log === 'function') {
      logger.log(`[${new Date().toLocaleString('es-ES')}] [${type}] ${message}`);
      return;
    }

    console.log(`[${new Date().toLocaleString('es-ES')}] [${type}] ${message}`);
  };
}

async function createLocalConnectionIfNeeded(localConnection) {
  if (localConnection) {
    return { connection: localConnection, shouldClose: false };
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'proyecto_reservas'
  });

  return { connection, shouldClose: true };
}

async function syncCentresFromUnifica({
  localConnection = null,
  logger = console,
} = {}) {
  let mysqlConn = null;
  let unificaConn = null;
  const log = createLogger(logger);

  try {
    const local = await createLocalConnectionIfNeeded(localConnection);
    mysqlConn = local.connection;

    log('Iniciando sincronización de centros desde UnificaPP');
    log('Conectando a MySQL local...');
    log('Conectado a MySQL local');

    const [tables] = await mysqlConn.query("SHOW TABLES LIKE 'centres'");
    if (tables.length === 0) {
      throw new Error('La tabla "centres" no existe');
    }

    log('Tabla "centres" existe');
    log('Conectando a UnificaPP (MySQL remoto)...');

    unificaConn = await mysql.createConnection({
      host: process.env.DB_UNIFICA_HOST,
      port: process.env.DB_UNIFICA_PORT || 3306,
      user: process.env.DB_UNIFICA_USER,
      password: process.env.DB_UNIFICA_PASSWORD,
      database: process.env.DB_UNIFICA_NAME,
      connectTimeout: 15000
    });

    log('Conectado a UnificaPP (MySQL remoto)');
    log('Extrayendo datos de centros y sedes...');

    const [centros] = await unificaConn.query(`
      SELECT 
          (id * 10 + 1) AS id_unifica, 
          nombre_centro AS nombre, 
          provincia, 
          localidad, 
          NULLIF(direccion, '') AS direccion, 
          NULL AS telefono, 
          NULLIF(codigo_postal, '') AS codigo_postal 
      FROM centros
    `);

    const [sedes] = await unificaConn.query(`
      SELECT 
          (id * 10 + 2) AS id_unifica, 
          nombre_sede AS nombre, 
          provincia, 
          localidad, 
          NULLIF(direccion, '') AS direccion, 
          NULLIF(telefono, '') AS telefono, 
          NULLIF(codigo_postal, '') AS codigo_postal 
      FROM sedes
    `);

    const datos = [...centros, ...sedes];
    log(`Datos extraídos: ${datos.length} registros`);

    if (datos.length === 0) {
      log('No hay datos para sincronizar');
      return { count: 0, errors: 0, total: 0 };
    }

    log('Insertando/actualizando registros en MySQL local...');

    let count = 0;
    let errors = 0;

    for (const fila of datos) {
      try {
        await mysqlConn.execute(
          `INSERT INTO centres (id_unifica, nombre, provincia, localidad, direccion, telefono, codigo_postal)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
              nombre = VALUES(nombre),
              provincia = VALUES(provincia),
              localidad = VALUES(localidad),
              direccion = VALUES(direccion),
              telefono = VALUES(telefono),
              codigo_postal = VALUES(codigo_postal),
              fecha_update = CURRENT_TIMESTAMP`,
          [
            fila.id_unifica,
            fila.nombre,
            fila.provincia,
            fila.localidad,
            fila.direccion,
            fila.telefono,
            fila.codigo_postal
          ]
        );
        count++;
      } catch (error) {
        errors++;
        log(`Error en fila ${fila.id_unifica}: ${error.message}`, 'ERROR');
      }
    }

    log(`Sincronización completada: ${count} registros procesados, ${errors} errores`);

    return { count, errors, total: datos.length };
  } catch (error) {
    log(`Error crítico: ${error.message}`, 'ERROR');
    throw error;
  } finally {
    if (unificaConn) {
      await unificaConn.end().catch((err) => log(`Error cerrando conexión remota: ${err.message}`, 'ERROR'));
    }

    if (mysqlConn && mysqlConn !== localConnection) {
      await mysqlConn.end().catch((err) => log(`Error cerrando conexión local: ${err.message}`, 'ERROR'));
    }
  }
}

module.exports = {
  syncCentresFromUnifica,
};
