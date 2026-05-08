process.env.TZ = 'Europe/Madrid';
const express = require('express');
const cors = require('cors');
const http = require('http');
const cookieParser = require('cookie-parser');
const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const { hashStoredPasswords } = require('./scripts/hash_passwords');
const { initializeSocket } = require('./utils/socketManager');
const { initializeAllCronJobs } = require('./utils/cronJobs');
const { syncCentresFromUnifica } = require('./utils/centresSync');
const { ensureReservationMailStateColumns } = require('./utils/reservationMailState');
const { ensureUserAuthProviderColumn } = require('./utils/authProviderMigration');
const { helmetMiddleware, apiLimiter } = require('./middleware/securityMiddleware');
require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const app = express();
const server = http.createServer(app);
const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(helmetMiddleware);
app.use('/api/', apiLimiter);

const bcrypt = require('bcryptjs');

// PROBAR CONEXIÓN AL ARRANCAR Y EJECUTAR TAREAS INICIALES
db.getConnection()
    .then(async connection => {
        console.log("Conectado a la base de datos correctamente");
        connection.release();
        
        // Ejecutar tareas de mantenimiento inicial
        await ensureReservationMailStateColumns();
        await ensureUserAuthProviderColumn();
        await hashStoredPasswords();
        initializeAllCronJobs();
        syncCentresFromUnifica({ localConnection: db, logger: console })
            .then((result) => {
                console.log(`Sincronización inicial de centros completada: ${result.count} registros procesados y ${result.errors} errores`);
            })
            .catch((error) => {
                console.error(`Error en la sincronización inicial de centros: ${error.message}`);
            });
    })
    .catch(err => {
        console.error("ERROR DE CONEXIÓN A LA DB:", err.message);
    });

const dashboardRoutes = require('./routes/dashboardRoutes');
const auditRoutes = require('./routes/auditRoutes');

// Usar las rutas
app.use('/api/auth', authRoutes);
app.use('/api/audit', auditRoutes);

app.use('/api/dashboard', dashboardRoutes);

// ARRANCAR SERVIDOR
const PORT = process.env.PORT || 4000;

// Inicializar Socket.io
initializeSocket(server);

server.listen(PORT, '0.0.0.0', () => {
});
