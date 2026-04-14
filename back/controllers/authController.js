const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auditLogger = require('../utils/auditLogger');
const axios = require('axios');

exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Buscar usuario
        const [rows] = await db.query('SELECT * FROM users WHERE username = ? AND deleted_at IS NULL', [username]);
        if (rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });

        const user = rows[0];
        let isMatch = await bcrypt.compare(password, user.password);

        // Si no coincide, comprobamos si es porque la contraseña en la DB es texto plano (sin hashear)
        if (!isMatch && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
            if (password === user.password) {
                // Es texto plano y coincide, entonces hasheamos la contraseña y actualizamos la DB para futuras comparaciones
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
                isMatch = true;
            }
        }

        if (!isMatch) return res.status(401).json({ error: "Contraseña incorrecta" });

        // Obtener centros del usuario (relación N:M)
        const [centreRows] = await db.query(
            'SELECT uc.centre_id, c.nombre FROM user_centres uc JOIN centres c ON uc.centre_id = c.id WHERE uc.user_id = ?',
            [user.id]
        );
        const centreIds = centreRows.map(r => r.centre_id);

        // Generar Token JWT (incluye centre_ids)
        const token = jwt.sign(
            { id: user.id, role: user.role, centre_ids: centreIds },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Registrar auditoría del login
        await auditLogger.logAction(user.id, 'READ', 'auth', user.id, user.role, {
            username: username,
            action: 'Usuario inició sesión'
        });

        res.json({
            message: "Login correcto",
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                centre_ids: centreIds,
                centres: centreRows
            }
        });
    } catch (error) {
        res.status(500).json({ error: "Error en el login", details: error.message });
    }
};

// Rutas para autenticación con Microsoft
exports.externalLogin = (req, res) => {
    const url = `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/authorize?client_id=${process.env.MS_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(process.env.MS_REDIRECT_URI)}&response_mode=query&scope=User.Read`;
    res.redirect(url);
};

//Procesar resultado de (http://localhost:4000/api/auth/callback)
exports.externalCallback = async (req, res) => {
    const { code } = req.query;
    
    try {
        const tokenResponse = await axios.post(
            `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`,
            new URLSearchParams({
                client_id: process.env.MS_CLIENT_ID,
                client_secret: process.env.MS_CLIENT_SECRET,
                code,
                redirect_uri: process.env.MS_REDIRECT_URI,
                grant_type: 'authorization_code'
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const userRes = await axios.get('https://graph.microsoft.com/v1.0/me', {
            headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }
        });

        const email = userRes.data.userPrincipalName;

        let [users] = await db.query('SELECT * FROM users WHERE username = ? AND deleted_at IS NULL', [email]);
        let user;

        if (users.length === 0) {
            // Registro automático si no existe
            const [result] = await db.query(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                [email, 'OAUTH_USER_EXTERNAL', 'empleado']
            );
            user = { id: result.insertId, username: email, role: 'empleado' };
            
            await auditLogger.logAction(user.id, 'CREATE', 'users', user.id, 'empleado', {
                username: email, action: 'Registro automático via Login Externo'
            });
        } else {
            user = users[0];
        }

        // Obtener centros del usuario
        const [centreRows] = await db.query(
            'SELECT uc.centre_id, c.nombre FROM user_centres uc JOIN centres c ON uc.centre_id = c.id WHERE uc.user_id = ?',
            [user.id]
        );
        const centreIds = centreRows.map(r => r.centre_id);

        const token = jwt.sign({ id: user.id, role: user.role, centre_ids: centreIds }, process.env.JWT_SECRET, { expiresIn: '1d' });

        await auditLogger.logAction(user.id, 'READ', 'auth', user.id, user.role, {
            username: email, action: 'Login exitoso via Externo'
        });

        // Redirección final al puerto de React (5173)
        const userData = encodeURIComponent(JSON.stringify({
            id: user.id,
            username: user.username,
            role: user.role,
            centre_ids: centreIds,
            centres: centreRows
        }));
        res.redirect(`http://localhost:5173/login?token=${token}&user=${userData}`);

    } catch (error) {
        console.error("Error Externo:", error.message);
        res.redirect(`http://localhost:5173/login?error=external_auth_failed`);
    }
};