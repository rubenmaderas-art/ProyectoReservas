const express = require('express');
const cors = require('cors');
const db = require('./config/db');
require('dotenv').config();

const app = express();

app.use(cors()); // Permite que el Front (5173) hable con el Back (4000)
app.use(express.json());

// PROBAR CONEXIÓN AL ARRANCAR
db.getConnection()
    .then(connection => {
        console.log("CONECTADO A MYSQL CORRECTAMENTE");
        connection.release();
    })
    .catch(err => {
        console.error("ERROR DE CONEXIÓN A LA DB:", err.message);
    });

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Usar las rutas
app.use('/api/auth', authRoutes);

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