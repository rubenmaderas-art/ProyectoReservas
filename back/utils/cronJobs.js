const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');

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
 * Inicia todas las tareas cron del sistema
 */
function initializeAllCronJobs() {
    try {
        initializeSyncCentrosCron();
    } catch (error) {
        logCronEvent(`Error al inicializar tareas cron: ${error.message}`, 'ERROR');
    }
}

module.exports = {
    initializeAllCronJobs,
    initializeSyncCentrosCron
};
