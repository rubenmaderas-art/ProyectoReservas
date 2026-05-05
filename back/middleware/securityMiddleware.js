const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // Increased from 600
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes desde esta IP, por favor inténtalo de nuevo más tarde.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 25,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos de inicio de sesión. Inténtalo más tarde.' },
});

const helmetMiddleware = helmet({
    contentSecurityPolicy: false,
});

module.exports = {
    helmetMiddleware,
    apiLimiter,
    authLimiter,
};
