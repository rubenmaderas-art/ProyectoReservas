const socketIo = require('socket.io');

let io = null;

const initializeSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {

        // Cuando el admin entra al dashboard, se une a una sala específica
        socket.on('admin_dashboard_open', (adminId) => {
            socket.join('admin_dashboard');
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

module.exports = {
    initializeSocket,
    getIO
};
