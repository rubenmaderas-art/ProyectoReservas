# 🚀 Implementación de WebSockets con Socket.io

## ¿Qué se implementó?

Sistema de **notificaciones en tiempo real** para el dashboard del admin. Cuando un empleado crea una reserva, **el admin la ve al instante sin necesidad de recargar la página**.

---

## 📋 PASOS COMPLETADOS

### ✅ Paso 1: Instalación de dependencias

**Backend:**
```bash
cd back
npm install socket.io
```

**Frontend:**
```bash
cd front
npm install socket.io-client
```

---

### ✅ Paso 2: Configuración del servidor WebSocket

**Archivo: `back/utils/socketManager.js`** (NUEVO)
```javascript
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
        console.log('Nuevo usuario conectado:', socket.id);

        // Cuando el admin entra al dashboard
        socket.on('admin_dashboard_open', (adminId) => {
            socket.join('admin_dashboard');
            console.log(`Admin ${adminId} conectado al dashboard`);
        });

        socket.on('disconnect', () => {
            console.log('Usuario desconectado:', socket.id);
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

module.exports = { initializeSocket, getIO };
```

**Archivo: `back/index.js`** (MODIFICADO)
- Cambié `const app = express()` por usar `http.createServer(app)`
- Inicializo Socket.io antes de arrancar el servidor
- Cambié `app.listen()` por `server.listen()`

```javascript
const http = require('http');
const { initializeSocket } = require('./utils/socketManager');

// ...

const server = http.createServer(app);

// ...

// Inicializar Socket.io
initializeSocket(server);

server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
```

---

### ✅ Paso 3: Emitir eventos cuando se crean/actualizan reservas

**Archivo: `back/controllers/dashboardController.js`** (MODIFICADO)

#### Importación:
```javascript
const { getIO } = require('../utils/socketManager');
```

#### En `createReservation()` - Al final:
```javascript
// Obtener los datos de la nueva reserva
const [newReservation] = await db.query(`
    SELECT 
        r.id, u.username, v.license_plate, v.model,
        r.start_time, r.end_time, r.status, r.user_id, r.vehicle_id
    FROM reservations r
    JOIN users u ON r.user_id = u.id
    JOIN vehicles v ON r.vehicle_id = v.id
    WHERE r.id = ?
`, [result.insertId]);

// Emitir a todos los admins conectados
if (newReservation.length > 0) {
    const io = getIO();
    io.to('admin_dashboard').emit('new_reservation', newReservation[0]);
}
```

#### En `updateReservation()` - Al final:
```javascript
// Similar: obtener datos actualizados y emitir 'updated_reservation'
io.to('admin_dashboard').emit('updated_reservation', updatedReservation[0]);
```

#### En `deleteReservation()` - Al final:
```javascript
// Emitir evento de eliminación
const io = getIO();
io.to('admin_dashboard').emit('deleted_reservation', { id });
```

---

### ✅ Paso 4: Conectar el cliente WebSocket (Frontend)

**Archivo: `front/src/hooks/useSocket.js`** (NUEVO)
```javascript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const useSocket = () => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const newSocket = io('http://localhost:4000', {
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 10
        });

        newSocket.on('connect', () => {
            console.log('Conectado a WebSocket');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('Desconectado de WebSocket');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Error de conexión WebSocket:', error);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    return { socket, isConnected };
};
```

**Archivo: `front/src/components/AdminDashboard.jsx`** (MODIFICADO)

#### Importación:
```javascript
import { useSocket } from '../hooks/useSocket';
```

#### Dentro del componente:
```javascript
const { socket, isConnected } = useSocket();
```

#### Nuevo useEffect para escuchar eventos:
```javascript
useEffect(() => {
    if (socket && isConnected && (currentUser.role === 'admin' || currentUser.role === 'supervisor')) {
        // Notificar al servidor que estamos en el dashboard
        socket.emit('admin_dashboard_open', currentUser.id);
        console.log('Admin conectado al dashboard en tiempo real');

        // Escuchar nuevas reservas
        socket.on('new_reservation', (newReservation) => {
            console.log('Nueva reserva recibida:', newReservation);
            
            // Notificación visual
            toast.success(`Nueva reserva: ${newReservation.username} - ${newReservation.model}`, {
                duration: 5000,
                icon: '🚗'
            });

            // Agregar a la lista
            setReservations(prevReservations => [newReservation, ...prevReservations]);
        });

        // Escuchar cambios en reservas
        socket.on('updated_reservation', (updatedReservation) => {
            setReservations(prevReservations =>
                prevReservations.map(r => 
                    r.id === updatedReservation.id ? updatedReservation : r
                )
            );
        });

        // Escuchar eliminación de reservas
        socket.on('deleted_reservation', (data) => {
            setReservations(prevReservations =>
                prevReservations.filter(r => r.id !== data.id)
            );
        });

        return () => {
            socket.off('new_reservation');
            socket.off('updated_reservation');
            socket.off('deleted_reservation');
        };
    }
}, [socket, isConnected, currentUser.role, currentUser.id]);
```

---

## 🔄 FLUJO DE TRABAJO

```
EMPLEADO CREA RESERVA
      ↓
Backend: insertReservation()
      ↓
io.to('admin_dashboard').emit('new_reservation', {...})
      ↓
ADMIN RECIBE EN TIEMPO REAL
      ↓
- Notificación toast "Nueva reserva"
- Tabla actualizada automáticamente
- SIN NECESIDAD DE RECARGAR
```

---

## 🧪 CÓMO PROBAR

### 1. Iniciar servidor backend
```bash
cd back
npm run dev
# O si tienes nodemon: nodemon index.js
```

### 2. Iniciar servidor frontend
```bash
cd front
npm run dev
```

### 3. Abrir dos navegadores
- **Navegador 1 (Admin)**: `http://localhost:5173`
  - Login como admin
  - Navega a "Inicio" (dashboard)
  - Deja la ventana abierta

- **Navegador 2 (Empleado)**: `http://localhost:5173`
  - Login como empleado
  - Crea una nueva reserva
  - Completa el formulario y envía

### 4. Verificar
- En el Navegador 1 debería aparecer:
  - 🔔 Notificación toast: "Nueva reserva: [nombre] - [vehículo]"
  - La nueva reserva en la tabla, en la parte superior
  - **TODO SIN RECARGAR LA PÁGINA**

---

## 📱 ARQUITECTURA

### Backend - Socket.io
```
back/
├── utils/
│   └── socketManager.js (NUEVO - Gestiona Socket.io)
├── controllers/
│   └── dashboardController.js (MODIFICADO - Emite eventos)
└── index.js (MODIFICADO - Inicializa Socket.io)
```

### Frontend - Socket.io Client
```
front/src/
├── hooks/
│   └── useSocket.js (NUEVO - Hook para WebSocket)
└── components/
    └── AdminDashboard.jsx (MODIFICADO - Escucha eventos)
```

---

## 🔧 CONFIGURACIÓN IMPORTANTE

### CORS (Cross-Origin)
Socket.io está configurado para aceptar conexiones desde `http://localhost:5173`

Si cambias el puerto del frontend, actualiza en `back/utils/socketManager.js`:
```javascript
cors: {
    origin: 'http://localhost:5173',  // ← AQUÍ
    methods: ['GET', 'POST'],
    credentials: true
}
```

### Reconexión Automática
El cliente se reconecta automáticamente si se desconecta. Configuración en `useSocket.js`:
```javascript
reconnection: true,
reconnectionDelay: 1000,      // Espera 1 segundo antes de reconectar
reconnectionDelayMax: 5000,   // Máximo 5 segundos
reconnectionAttempts: 10      // Máximo 10 intentos
```

---

## 📊 EVENTOS SOCKET.IO

| Evento | Origen | Destino | Cuándo se emite |
|--------|--------|---------|-----------------|
| `admin_dashboard_open` | Cliente (Admin) | Servidor | Admin abre el dashboard |
| `new_reservation` | Servidor | Cliente (Admin) | Se crea una nueva reserva |
| `updated_reservation` | Servidor | Cliente (Admin) | Se actualiza una reserva |
| `deleted_reservation` | Servidor | Cliente (Admin) | Se elimina una reserva |

---

## 🚀 VENTAJAS

✅ **Instantáneo**: Los cambios aparecen al instante  
✅ **Eficiente**: WebSocket usa un "túnel" abierto (no polling)  
✅ **Escalable**: Socket.io maneja miles de conexiones  
✅ **Robusto**: Reconexión automática  
✅ **Sin recargas**: Experiencia de usuario mejorada  

---

## ⚠️ POSIBLES PROBLEMAS

### "Socket no está conectado"
- Asegúrate de que el backend está corriendo
- Verifica que el puerto 4000 está disponible
- Revisa la consola del navegador para errores

### "Notificaciones no aparecen"
- Verifica que estás logeado como admin o supervisor
- Revisa la consola: debería decir "Admin conectado al dashboard en tiempo real"
- Comprueba que la reserva se creó (aparecerá en la tabla)

### "Múltiples notificaciones"
- Normal si el admin está abierto en múltiples pestañas
- Cada pestaña es una conexión diferente

---

## 📝 PRÓXIMAS MEJORAS (Opcional)

- [ ] Notificar actualizaciones de vehículos
- [ ] Notificar cambios de estadísticas
- [ ] Historial de eventos en tiempo real
- [ ] Presencia de usuarios (quién está viendo qué)

---

**Implementado**: 6 de Abril de 2026
**Versiones**: Socket.io v4.x, React 18.3.1
