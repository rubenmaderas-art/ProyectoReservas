const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auditLogger = require('../utils/auditLogger');
const axios = require('axios');

const JWT_EXPIRES_IN = '4h';

const getCurrentUserWithCentres = async (userId) => {
    const [users] = await db.query(
        'SELECT id, username, role FROM users WHERE id = ? AND deleted_at IS NULL',
        [userId]
    );

    if (!Array.isArray(users) || users.length === 0) {
        return null;
    }

    const user = users[0];
    const [centreRows] = await db.query(
        'SELECT uc.centre_id, c.nombre FROM user_centres uc JOIN centres c ON uc.centre_id = c.id WHERE uc.user_id = ?',
        [user.id]
    );

    const centreIds = Array.isArray(centreRows) ? centreRows.map((r) => r.centre_id) : [];

    return {
        id: user.id,
        username: user.username,
        role: user.role,
        centre_ids: centreIds,
        centres: centreRows,
    };
};

exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        const [rows] = await db.query('SELECT * FROM users WHERE username = ? AND deleted_at IS NULL', [username]);
        if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

        const user = rows[0];
        let isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
            if (password === user.password) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
                isMatch = true;
            }
        }

        if (!isMatch) return res.status(401).json({ error: 'Contraseña incorrecta' });

        const userData = await getCurrentUserWithCentres(user.id);
        if (!userData) return res.status(404).json({ error: 'Usuario no encontrado' });

        const token = jwt.sign(
            { id: userData.id, role: userData.role, centre_ids: userData.centre_ids },
            process.env.JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        await auditLogger.logAction(user.id, 'READ', 'auth', user.id, user.role, {
            username,
            action: 'Usuario inició sesión',
        });

        res.json({
            message: 'Login correcto',
            token,
            user: userData,
        });
    } catch (error) {
        res.status(500).json({ error: 'Error en el login', details: error.message });
    }
};

exports.externalLogin = (req, res) => {
    const url = `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/authorize?client_id=${process.env.MS_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(process.env.MS_REDIRECT_URI)}&response_mode=query&scope=User.Read`;
    res.redirect(url);
};

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
                grant_type: 'authorization_code',
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const userRes = await axios.get('https://graph.microsoft.com/v1.0/me', {
            headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` },
        });

        const email = userRes.data.userPrincipalName;

        let [users] = await db.query('SELECT * FROM users WHERE username = ? AND deleted_at IS NULL', [email]);
        let user;

        if (users.length === 0) {
            const [result] = await db.query(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                [email, 'OAUTH_USER_EXTERNAL', 'empleado']
            );
            user = { id: result.insertId, username: email, role: 'empleado' };

            await auditLogger.logAction(user.id, 'CREATE', 'users', user.id, 'empleado', {
                username: email,
                action: 'Registro automático via Login Externo',
            });
        } else {
            user = users[0];
        }

        const userData = await getCurrentUserWithCentres(user.id);
        if (!userData) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const token = jwt.sign(
            { id: userData.id, role: userData.role, centre_ids: userData.centre_ids },
            process.env.JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        await auditLogger.logAction(user.id, 'READ', 'auth', user.id, user.role, {
            username: email,
            action: 'Login exitoso via Externo',
        });

        const encodedUserData = encodeURIComponent(JSON.stringify(userData));
        res.redirect(`http://localhost:5173/login?token=${token}&user=${encodedUserData}`);
    } catch (error) {
        console.error('Error Externo:', error.message);
        res.redirect('http://localhost:5173/login?error=external_auth_failed');
    }
};

exports.me = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const userData = await getCurrentUserWithCentres(req.user.id);
        if (!userData) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ user: userData });
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo el usuario actual', details: error.message });
    }
};
