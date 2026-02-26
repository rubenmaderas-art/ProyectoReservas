const jwt = require('jsonwebtoken');

/**
 * Para verificar si el usuario tiene un token válido
 */
exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Acceso denegado. No se proporcionó un token." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Guardamos { id, role } en la petición
        next();
    } catch (error) {
        res.status(403).json({ error: "Token inválido o expirado." });
    }
};

/**
 * Middleware para restringir acceso por roles
 * @param {Array} roles - Lista de roles permitidos (ej: ['admin', 'supervisor'])
 */
exports.checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: "No tienes permiso para realizar esta acción." });
        }
        next();
    };
};
