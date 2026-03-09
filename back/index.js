const express = require('express');
const cors = require('cors');
const db = require('./config/db');
require('dotenv').config();

const app = express();
app.use(cors()); // Permite que el Front (5173) hable con el Back (4000)
app.use(express.json());

const bcrypt = require('bcryptjs');

// PROBAR CONEXIÓN AL ARRANCAR
db.getConnection()
    .then(async connection => {
        console.log("CONECTADO A MYSQL CORRECTAMENTE");

        // --- Rutina silenciosa de hasheo de seguridad ---
        try {
            const [users] = await connection.query('SELECT id, password FROM users');
            for (const user of users) {
                if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash(user.password, salt);
                    await connection.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
                }
            }
        } catch (err) {

        }
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