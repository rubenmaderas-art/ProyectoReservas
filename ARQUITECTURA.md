🏗️ ARQUITECTURA - WEBSOCKETS EN TIEMPO REAL
═════════════════════════════════════════════════════════════

SISTEMA COMPLETO VISUALIZADO:

┌────────────────────────────────────────────────────────────────┐
│                     🌐 INTERNET                                 │
└────────────────────────────────────────────────────────────────┘
         ↓                                      ↓
    ┌────────────┐                      ┌────────────────┐
    │  ADMIN PC  │                      │  EMPLEADO PC   │
    │  (Firefox) │                      │  (Chrome)      │
    └────────────┘                      └────────────────┘
         ↓                                      ↓
    ┌────────────────────┐            ┌─────────────────────┐
    │   Frontend React   │            │   Frontend React    │
    │ :5173              │            │ :5173               │
    ├────────────────────┤            └─────────────────────┘
    │ Components:        │                    ↑
    │ - AdminDashboard   │───────────────────→│ Login
    │ - Reserves list    │                    │
    │ - Notifications    │            ┌─────────────────────┐
    └────────────────────┘            │ Crea NUEVA RESERVA  │
         │                             │ POST /api/dash...   │
         ↑↓ WebSocket                  └─────────────────────┘
         │  :4000                              │
         │                                     ↓
    ┌────────────────────────────────────────────────────┐
    │  🖥️  BACKEND - Node.js Express                      │
    │      http://localhost:4000                         │
    ├────────────────────────────────────────────────────┤
    │                                                    │
    │  ┌──────────────────────────────────────┐          │
    │  │ Socket.io Server (socketManager.js)  │          │
    │  ├──────────────────────────────────────┤          │
    │  │ • Escucha conexiones WebSocket       │          │
    │  │ • Gestiona salas (rooms)             │          │
    │  │ • Administra eventos                  │          │
    │  └──────────────────────────────────────┘          │
    │         ↑↓ emit eventos                            │
    │  ┌──────────────────────────────────────┐          │
    │  │ dashboardController.js               │          │
    │  ├──────────────────────────────────────┤          │
    │  │ • createReservation()                │          │
    │  │   → INSERT DB                        │          │
    │  │   → emit 'new_reservation'           │          │
    │  │                                      │          │
    │  │ • updateReservation()                │          │
    │  │   → UPDATE DB                        │          │
    │  │   → emit 'updated_reservation'       │          │
    │  │                                      │          │
    │  │ • deleteReservation()                │          │
    │  │   → DELETE DB                        │          │
    │  │   → emit 'deleted_reservation'       │          │
    │  └──────────────────────────────────────┘          │
    │         ↑↓ queries                                 │
    │  ┌──────────────────────────────────────┐          │
    │  │        🗄️ MySQL Database              │          │
    │  ├──────────────────────────────────────┤          │
    │  │ • reservations table                 │          │
    │  │ • users table                        │          │
    │  │ • vehicles table                     │          │
    │  └──────────────────────────────────────┘          │
    │                                                    │
    └────────────────────────────────────────────────────┘
         ↑↓ WebSocket                    ↑
         │  :4000                        │
         │                          HTTP POST
    ┌────────────────────────────────────────────────────┐
    │           ADMIN FRONTEND (Actualizado)             │
    ├────────────────────────────────────────────────────┤
    │ socket.on('new_reservation', (data) => {           │
    │   ✓ Notificación toast                            │
    │   ✓ Agregar fila a tabla                          │
    │   ✓ Animar ingreso                                │
    │ })                                                │
    │                                                    │
    │ 📊 TABLA ACTUALIZADA AL INSTANTE                   │
    │ ┌────────────────────────────────────┐            │
    │ │ Usuario    │ Vehículo  │ Estado     │            │
    │ ├────────────────────────────────────┤            │
    │ │ [NUEVO]    │ [NUEVO]   │ [NUEVO] ✨ │ ← INSTANTE│
    │ │ Juan López │ Ford Eco  │ Pendiente  │            │
    │ │ ...        │ ...       │ ...        │            │
    │ └────────────────────────────────────┘            │
    └────────────────────────────────────────────────────┘
         🔔 "Nueva reserva: Juan López - Ford Eco"


═════════════════════════════════════════════════════════════
FLUJO DETALLADO - CREACIÓN DE RESERVA EN TIEMPO REAL
═════════════════════════════════════════════════════════════

PASO 1: ADMIN ABRE DASHBOARD
┌──────────────────────────────────────────────────────────┐
│ Admin entra a http://localhost:5173/admin/dashboard      │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ AdminDashboard.jsx se monta (useEffect)                  │
│ - useSocket() hook se activa                             │
│ - Conecta a http://localhost:4000 (WebSocket)            │
│ - socket estado: isConnected = true                      │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ Admin emite: socket.emit('admin_dashboard_open', id)     │
│ Server recibe: socket.join('admin_dashboard')            │
│ → Admin ahora está en la SALA 'admin_dashboard'          │
└──────────────────────────────────────────────────────────┘
                          ↓
              Console log: ✓ Connected!


PASO 2: EMPLEADO CREA RESERVA
┌──────────────────────────────────────────────────────────┐
│ Empleado: Llenar formulario y hacer CLICK en Crear       │
│ POST /api/dashboard/reservations                         │
│ {                                                        │
│   user_id: 5,                                            │
│   vehicle_id: 12,                                        │
│   start_time: "2026-04-10 08:00:00",                     │
│   end_time: "2026-04-10 18:00:00"                        │
│ }                                                        │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ BACKEND: POST /api/dashboard/reservations                │
│ dashboardController.js → createReservation()             │
│                                                          │
│ 1. Validar datos                                         │
│ 2. Verificar colisiones (vehículo no ocupado)           │
│ 3. INSERT INTO reservations (...)                        │
│    → insertId = 47                                       │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ EMITIR EVENTO SOCKET.IO                                  │
│                                                          │
│ [Línea 188-200 dashboardController.js]                  │
│                                                          │
│ const io = getIO()                                       │
│ io.to('admin_dashboard').emit('new_reservation', {       │
│   id: 47,                                                │
│   username: 'juan.lopez',                                │
│   model: 'Ford Eco',                                     │
│   license_plate: 'ABC-1234',                            │
│   start_time: '2026-04-10 08:00:00',                    │
│   end_time: '2026-04-10 18:00:00',                      │
│   status: 'pendiente'                                    │
│ })                                                       │
│                                                          │
│ → Socket.io ENVÍA a TODOS en la sala admin_dashboard   │
└──────────────────────────────────────────────────────────┘
                          ↓
              ⚡ INSTANTÁNEO (< 100ms)
                          ↓
┌──────────────────────────────────────────────────────────┐
│ ADMIN NAVEGADOR: RECIBE EVENTO                           │
│                                                          │
│ [Línea 820 AdminDashboard.jsx]                          │
│                                                          │
│ socket.on('new_reservation', (newReservation) => {       │
│   // Mostrar notificación toast                         │
│   toast.success(                                         │
│     `Nueva reserva: ${newReservation.username} - ...`,  │
│     { duration: 5000, icon: '🚗' }                       │
│   )                                                      │
│                                                          │
│   // Actualizar estado React                           │
│   setReservations(prev =>                               │
│     [newReservation, ...prev]  ← Agregar al inicio     │
│   )                                                      │
│ })                                                       │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ UI SE ACTUALIZA AUTOMÁTICAMENTE                          │
│                                                          │
│ 1. 🔔 Toast notification aparece (5 segundos):          │
│    "Nueva reserva: juan.lopez - Ford Eco"              │
│                                                          │
│ 2. ✨ Nueva fila se inserta en la tabla (con animación)│
│    Usuario    │ Vehículo  │ Matrícula │ Estado         │
│    juan.lopez │ Ford Eco  │ ABC-1234  │ Pendiente      │
│    ...        │ ...       │ ...       │ ...            │
│                                                          │
│ 3. ⏱️ Automático sin recargar la página                │
└──────────────────────────────────────────────────────────┘


═════════════════════════════════════════════════════════════
COMUNICACIÓN POR EVENTOS - DETALLADO
═════════════════════════════════════════════════════════════

EVENTO: 'admin_dashboard_open'
┌─────────────────────────────────────┐
│ Origen: Admin Frontend              │
│ Destino: Backend Socket.io Server   │
│ Cuándo: Al entrar a /admin          │
│ Datos: { adminId: 1 }               │
│ Efecto: socket.join('admin_room')   │
└─────────────────────────────────────┘

EVENTO: 'new_reservation'
┌─────────────────────────────────────┐
│ Origen: Backend (al crear)          │
│ Destino: Todos en sala 'admin_...'  │
│ Cuándo: INSERT en reservations OK   │
│ Datos: { id, username, model, ... } │
│ Efecto: [nuevo] en tabla Admin      │
└─────────────────────────────────────┘

EVENTO: 'updated_reservation'
┌─────────────────────────────────────┐
│ Origen: Backend (al actualizar)     │
│ Destino: Todos en sala 'admin_...'  │
│ Cuándo: UPDATE en reservations OK   │
│ Datos: { id, username, status, ...} │
│ Efecto: Fila actualizada en tabla   │
└─────────────────────────────────────┘

EVENTO: 'deleted_reservation'
┌─────────────────────────────────────┐
│ Origen: Backend (al eliminar)       │
│ Destino: Todos en sala 'admin_...'  │
│ Cuándo: DELETE en reservations OK   │
│ Datos: { id }                       │
│ Efecto: Fila eliminada de tabla     │
└─────────────────────────────────────┘


═════════════════════════════════════════════════════════════
COMPARATIVA: ANTES vs DESPUÉS
═════════════════════════════════════════════════════════════

ANTES (Sin WebSocket):
┌──────────────────────────────────────┐
│ Admin: Crea reserva                  │
│        ↓ NO VE NADA NUEVO            │
│        Debe recargar F5              │
│        Aparece la nueva reserva      │
│                                      │
│ Experiencia: ❌ Lenta, manual        │
│ Tiempo: ⏱️ 3-5 segundos             │
└──────────────────────────────────────┘

DESPUÉS (Con WebSocket + Socket.io):
┌──────────────────────────────────────┐
│ Admin: Ver nuevas reservas           │
│        ↓ APARECEN AL INSTANTE        │
│        Notificación toast            │
│        Tabla se actualiza            │
│                                      │
│ Experiencia: ✅ Rápida, automática   │
│ Tiempo: ⚡ < 100ms                  │
└──────────────────────────────────────┘


═════════════════════════════════════════════════════════════
ESTRUCTURA DE CARPETAS (Cambios)
═════════════════════════════════════════════════════════════

Proyecto/
├── back/
│   ├── utils/
│   │   ├── auditLogger.js
│   │   └── socketManager.js ✨ NUEVO
│   ├── controllers/
│   │   └── dashboardController.js ⚙️ MODIFICADO
│   ├── routes/
│   ├── config/
│   ├── middleware/
│   ├── index.js ⚙️ MODIFICADO
│   └── package.json ⚙️ +socket.io
│
├── front/
│   └── src/
│       ├── hooks/
│       │   ├── useAuth.js
│       │   ├── useIsMobile.js
│       │   └── useSocket.js ✨ NUEVO
│       ├── components/
│       │   ├── AdminDashboard.jsx ⚙️ MODIFICADO
│       │   └── ...
│       └── package.json ⚙️ +socket.io-client
│
├── WEBSOCKETS.md ✨ NUEVO (Documentación completa)
├── TESTING.md ✨ NUEVO (Guía de testing)
├── README.md (ya existente)
└── docker-compose.yml


═════════════════════════════════════════════════════════════
TECNOLOGÍAS USADAS
═════════════════════════════════════════════════════════════

Frontend:
  • React 18.3.1
  • Vite 5.x
  • socket.io-client 4.7.x ✨ NUEVO
  • react-hot-toast (notificaciones)

Backend:
  • Node.js 24.x
  • Express 5.2.1
  • socket.io 4.7.x ✨ NUEVO
  • MySQL 3.17.3

Protocolo:
  • WebSocket (TCP bidireccional)
  • Socket.io (abstracción + features)
  • CORS habilitado

Base de Datos:
  • MySQL (sin cambios)


═════════════════════════════════════════════════════════════
VENTAJAS Y DESVENTAJAS
═════════════════════════════════════════════════════════════

VENTAJAS ✅
┌───────────────────────────────────────────┐
│ • Tiempo real (< 100ms latencia)          │
│ • Bidireccional (Server ↔ Client)         │
│ • Eficiente (tunél abierto, no polling)   │
│ • Escalable (cientos de conexiones)       │
│ • Auto-reconexión integrada               │
│ • Mejor UX (no requiere recargar)         │
│ • Notificaciones push instantáneas         │
│ • Fallback a polling automático            │
└───────────────────────────────────────────┘

DESVENTAJAS ⚠️
┌───────────────────────────────────────────┐
│ • Requiere conexión TCP abierta           │
│ • Mayor consumo de memoria en server       │
│ • Más complejo que REST puro              │
│ • Necesita manejo de desconexiones        │
│ • Debug más difícil que REST              │
│ • Estado compartido entre múltiples tabs  │
└───────────────────────────────────────────┘


═════════════════════════════════════════════════════════════
ESTIMACIÓN DE RENDIMIENTO
═════════════════════════════════════════════════════════════

Latencia Promedio:
  • Creación de reserva: 50ms
  • Propagación WebSocket: 20ms
  • Rendering en React: 16ms
  • Total: ~86ms

Consumo Servidor:
  • Por conexión: ~10KB memoria
  • 100 admins conectados: ~1MB extra
  • Transferencia: mínima (eventos pequeños)

Compatibilidad:
  • Chrome: ✅ 100%
  • Firefox: ✅ 100%
  • Safari: ✅ 100%
  • Edge: ✅ 100%
  • IE11: ⚠️ Con fallback a polling


═════════════════════════════════════════════════════════════
Implementación completada: 6 de Abril de 2026 ✨
═════════════════════════════════════════════════════════════
