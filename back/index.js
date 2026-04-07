const express = require('express');
const cors = require('cors');
const http = require('http');
const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const { hashStoredPasswords } = require('./scripts/hash_passwords');
const { initializeSocket } = require('./utils/socketManager');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json());

const bcrypt = require('bcryptjs');

// PROBAR CONEXIÓN AL ARRANCAR Y EJECUTAR TAREAS INICIALES
db.getConnection()
    .then(async connection => {
        console.log("Conectado a la base de datos correctamente");
        connection.release();
        
        // Ejecutar tareas de mantenimiento inicial
        await hashStoredPasswords();
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

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});