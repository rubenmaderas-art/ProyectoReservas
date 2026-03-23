const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const { hashStoredPasswords } = require('./scripts/hash_passwords');
require('dotenv').config();

const app = express();
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
        console.log("CONECTADO A MYSQL CORRECTAMENTE");
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

// Ruta principal
app.get('/', (req, res) => {
    res.send('<h1>¡El Backend está conectado!</h1>');
});


app.use('/api/dashboard', dashboardRoutes);

// ARRANCAR SERIDOR
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});