const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
const { syncReservationStatusesByTime } = require('./reservationStatusSync');

// Registrar eventos de cron
function logCronEvent(message, type = 'INFO') {
    const timestamp = new Date().toLocaleString('es-ES');
    console.log(`[${timestamp}] [CRON ${type}] ${message}`);
}

/**
 * Ejecuta el script de sincronización de centros
 * Se ejecuta todos los días a las 03:00
 */
function initializeSyncCentrosCron() {
    // Expresión cron: "0 3 * * *" = Todos los días a las 03:00
    // Format: segundo minuto hora día mes día-de-semana
    const cronExpression = '0 3 * * *';

    const task = cron.schedule(cronExpression, () => {
        logCronEvent('Iniciando sincronización de centros...');

        // Ruta al script Node.js
        const syncScript = path.join(__dirname, '..', 'scripts', 'syncCentros.js');

        // Ejecutar el script Node.js
        exec(`node "${syncScript}"`, (error, stdout, stderr) => {
            if (error) {
                logCronEvent(`Error ejecutando sincronización: ${error.message}`, 'ERROR');
                if (stderr) {
                    logCronEvent(`Stderr: ${stderr}`, 'ERROR');
                }
                return;
            }

            logCronEvent(`Sincronización completada:\n${stdout}`, 'SUCCESS');
        });
    });

    logCronEvent(`Tarea cron de sincronización de centros a las 03:00`, 'INFO');
    
    return task;
}



/**
 * Sincroniza automáticamente las reservas por fecha/hora
 * Se ejecuta cada 30 segundos para no depender de visitas al front
 */
function initializeReservationStatusCron() {
    const cronExpression = '*/30 * * * * *';

    const task = cron.schedule(cronExpression, async () => {
        try {
            const updatedReservations = await syncReservationStatusesByTime();
            if (updatedReservations.length > 0) {
                logCronEvent(`Reservas sincronizadas por tiempo: ${updatedReservations.length}`, 'SUCCESS');
            }
        } catch (error) {
            logCronEvent(`Error sincronizando reservas por tiempo: ${error.message}`, 'ERROR');
        }
    });

    syncReservationStatusesByTime()
        .then((updatedReservations) => {
            if (updatedReservations.length > 0) {
                logCronEvent(`Sincronización inicial de reservas completada: ${updatedReservations.length}`, 'SUCCESS');
            }
        })
        .catch((error) => {
            logCronEvent(`Error en sincronización inicial de reservas: ${error.message}`, 'ERROR');
        });

    return task;
}

/**
 * Inicia todas las tareas cron del sistema
 */
function initializeAllCronJobs() {
    try {
        initializeSyncCentrosCron();
        initializeReservationStatusCron();
    } catch (error) {
        logCronEvent(`Error al inicializar tareas cron: ${error.message}`, 'ERROR');
    }
}

module.exports = {
    initializeAllCronJobs,
    initializeSyncCentrosCron,
    initializeReservationStatusCron
};
