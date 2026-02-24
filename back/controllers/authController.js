const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    const { username, password, role } = req.body;

    try {
        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insertar en la base de datos
        const [result] = await db.query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hashedPassword, role || 'empleado']
        );

        res.status(201).json({ message: "Usuario creado con éxito", userId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: "Error al registrar usuario", details: error.message });
    }
};

exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Buscar usuario
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });

        const user = rows[0];
        let isMatch = await bcrypt.compare(password, user.password);

        // Si no coincide, comprobamos si es porque la contraseña en la DB es texto plano (sin hashear)
        if (!isMatch && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
            if (password === user.password) {
                // Es texto plano y coincide: la hasheamos ahora mismo
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
                isMatch = true;
            }
        }

        if (!isMatch) return res.status(401).json({ error: "Contraseña incorrecta" });

        // Generar Token JWT
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({ message: "Login correcto", token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
        res.status(500).json({ error: "Error en el login", details: error.message });
    }
};