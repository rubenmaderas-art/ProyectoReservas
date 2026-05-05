const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Verifica el token y refresca el usuario actual desde la base de datos.
exports.verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const tokenFromHeader = authHeader && authHeader.split(' ')[1];
    const sanitizedHeaderToken =
        tokenFromHeader && tokenFromHeader !== 'null' && tokenFromHeader !== 'undefined'
            ? tokenFromHeader
            : null;
    const tokenFromCookie = req.cookies?.auth_token || null;
    const token = sanitizedHeaderToken || tokenFromCookie;

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. No se proporciono un token.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded?.id;

        if (!userId) {
            return res.status(403).json({ error: 'Token invalido o expirado.' });
        }

        const [users] = await db.query(
            'SELECT id, username, role FROM users WHERE id = ? AND deleted_at IS NULL',
            [userId]
        );

        if (!Array.isArray(users) || users.length === 0) {
            return res.status(403).json({ error: 'Token invalido o expirado.' });
        }

        const [centreRows] = await db.query(
            'SELECT uc.centre_id, c.nombre FROM user_centres uc JOIN centres c ON uc.centre_id = c.id WHERE uc.user_id = ?',
            [userId]
        );

        const currentUser = users[0];
        currentUser.centre_ids = Array.isArray(centreRows) ? centreRows.map((row) => row.centre_id) : [];
        currentUser.centres = centreRows;

        req.user = currentUser;
        next();
    } catch (error) {
        res.status(403).json({ error: 'Token invalido o expirado.' });
    }
};

// Revision de roles por si no tiene permisos para acceder a determinada pagina
exports.checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'No tienes permiso para realizar esta accion.' });
        }
        next();
    };
};

// Inyecta los IDs de centro del usuario ya refrescados por verifyToken.
exports.injectCentreFilter = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        req.centreIds = null;
    } else {
        req.centreIds = req.user?.centre_ids || [];
    }
    next();
};
