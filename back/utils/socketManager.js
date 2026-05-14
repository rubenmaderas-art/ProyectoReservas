const socketIo = require('socket.io');

let io = null;

const getAllowedOrigins = () => {
    const rawOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:5173')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    return [...new Set(rawOrigins)];
};

const initializeSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: getAllowedOrigins(),
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        // Cuando el admin entra al dashboard, se une a una sala específica
        socket.on('admin_dashboard_open', (adminId) => {
            socket.join('admin_dashboard');
        });

        // Cuando un usuario entra a un centro, se une a la sala del centro
        socket.on('join_centre', (centreId) => {
            if (centreId) {
                socket.join(`centre_${centreId}`);
            }
        });

        // Dejar sala del centro
        socket.on('leave_centre', (centreId) => {
            if (centreId) {
                socket.leave(`centre_${centreId}`);
            }
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io no ha sido inicializado');
    }
    return io;
};

// Emitir evento a un centro y a admins
const emitToCentreAndAdmin = (eventName, centreId, data) => {
    if (!io) return;

    // Emitir al centro específico (SOLO si centreId es válido)
    if (centreId !== null && centreId !== undefined && String(centreId).trim() !== '') {
        const room = `centre_${centreId}`;
        io.to(room).emit(eventName, data);
    }

    // Siempre emitir a admins
    io.to('admin_dashboard').emit(eventName, data);
};

// Emitir solo a admin
const emitToAdmin = (eventName, data) => {
    if (!io) return;
    io.to('admin_dashboard').emit(eventName, data);
};

// Emitir solo a un centro
const emitToCentre = (eventName, centreId, data) => {
    if (!io || !centreId) return;
    io.to(`centre_${centreId}`).emit(eventName, data);
};

module.exports = {
    initializeSocket,
    getIO,
    emitToCentreAndAdmin,
    emitToAdmin,
    emitToCentre
};
