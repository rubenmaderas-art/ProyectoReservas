#!/usr/bin/env node

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

const mysql = require('mysql2/promise');
require('dotenv').config();

// Función para registrar
function log(msg, type = 'INFO') {
    const timestamp = new Date().toLocaleString('es-ES');
    console.log(`[${timestamp}] [${type}] ${msg}`);
}


async function syncCentros() {
    let mysqlConn = null;
    let unificaConn = null;

    try {
        log('Iniciando sincronización de centros desde UnificaPP');

        // ========== CONEXIÓN A MYSQL LOCAL ==========
        log('Conectando a MySQL local...');
        mysqlConn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'root',
            database: process.env.DB_NAME || 'proyecto_reservas'
        });
        log('✓ Conectado a MySQL local');

        // Verificar tabla
        const [tables] = await mysqlConn.query("SHOW TABLES LIKE 'centres'");
        if (tables.length === 0) {
            log('Tabla "centres" no existe');
            process.exit(1);
        }
        log('✓ Tabla "centres" existe');

        // ========== CONEXIÓN A MYSQL REMOTO (UnificaPP) ==========
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

        // ========== EXTRAE DATOS ==========
        log('Extrayendo datos de centros y sedes...');

        // Queries separadas para evitar error de collation entre tablas
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
            await unificaConn.end();
            await mysqlConn.end();
            return;
        }

        // ========== INSERCIÓN EN MYSQL LOCAL ==========
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
                    [fila.id_unifica, fila.nombre, fila.provincia, fila.localidad, 
                     fila.direccion, fila.telefono, fila.codigo_postal]
                );
                count++;
            } catch (error) {
                errors++;
                log(`Error en fila ${fila.id_unifica}: ${error.message}`, 'ERROR');
            }
        }

        log(`Sincronización completada: ${count} registros procesados, ${errors} errores`);

        // ========== RESULTADO ==========
        console.log('\n' + '='.repeat(60));
        console.log('SINCRONIZACIÓN EXITOSA');
        console.log('='.repeat(60));
        console.log(`Registros procesados: ${count}`);
        console.log(`Errores: ${errors}`);
        console.log('Fecha: ' + new Date().toLocaleString('es-ES'));
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        log(`Error crítico: ${error.message}`, 'ERROR');
        console.error(error);
        process.exit(1);
    } finally {
        if (unificaConn) await unificaConn.end();
        if (mysqlConn) await mysqlConn.end();
    }
}

// Ejecutar
syncCentros();
