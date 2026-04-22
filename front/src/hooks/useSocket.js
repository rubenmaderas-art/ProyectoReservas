import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// Instancia compartida para evitar que StrictMode cree y destruya el socket durante el arranque en desarrollo.
const socket = io({
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
});

export const useSocket = () => {
    const [isConnected, setIsConnected] = useState(socket.connected);

    useEffect(() => {
        const handleConnect = () => {
            setIsConnected(true);
        };

        const handleDisconnect = () => {
            setIsConnected(false);
        };

        const handleConnectError = (error) => {
            console.error('Error de conexión WebSocket:', error);
        };

        setIsConnected(socket.connected);
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('connect_error', handleConnectError);
        };
    }, []);

    return { socket, isConnected };
};
