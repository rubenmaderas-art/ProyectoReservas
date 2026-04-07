# 🔄 ACTUALIZACIÓN - Nuevos Eventos WebSocket

## ¿Qué Se Agregó?

### 1. **Notificaciones para cambios de USUARIOS**
- Cuando se crea un usuario → todos ven la notificación
- Cuando se actualiza un usuario (especialmente el rol) → notificación
- Cuando se elimina un usuario → notificación

### 2. **Auto-Recarga Inteligente**
- Si NO hay modal abierto → la página se recarga automáticamente
- Si HAY modal abierto → solo se actualiza la lista (no recarga)
- Esto permite que si estás editando algo, no se pierda el trabajo

### 3. **Detección de Modales**
El sistema detecta automáticamente:
- Modal de logout
- Modal de eliminar reserva
- Modal de agregar reserva
- Modal de editar reserva

---

## 📊 NUEVOS EVENTOS

### Backend emite:

| Evento | Datos | Cuándo |
|--------|-------|--------|
| `new_user` | `{ id, username, role, created_at }` | Se crea un usuario |
| `updated_user` | `{ id, username, role, previousRole, changedFields }` | Se actualiza un usuario |
| `deleted_user` | `{ id }` | Se eliminan un usuario |

### Frontend escucha:

```javascript
// Nuevas reservas
socket.on('new_reservation', (data) => {
  // Si no hay modal: recarga
  // Si hay modal: actualiza lista
});

// Usuarios
socket.on('new_user', (data) => { ... });
socket.on('updated_user', (data) => { ... });
socket.on('deleted_user', (data) => { ... });
```

---

## 🎯 FLUJO DE FUNCIONAMIENTO

### CASO 1: Admin viendo el dashboard (SIN modal abierto)

```
1. Employee crea usuario
   ↓
2. Backend emite 'new_user'
   ↓
3. Admin recibe evento
   ↓
4. Toast notification: "Nuevo usuario: juan (admin)"
   ↓
5. Espera 1 segundo
   ↓
6. window.location.reload() ← RECARGA LA PÁGINA
   ↓
7. Tabla muestra el nuevo usuario
```

### CASO 2: Admin en modal de edición (CON modal abierto)

```
1. Employee crea usuario
   ↓
2. Backend emite 'new_user'
   ↓
3. Admin recibe evento
   ↓
4. Toast notification: "Nuevo usuario: juan (admin)"
   ↓
5. Sistema detecta: "Hay modal abierto"
   ↓
6. NO recarga la página
   ↓
7. Solo actualiza la lista interna (si aplica)
   ↓
8. Cuando cierre el modal, verá los cambios
```

---

## 📝 CAMBIOS EN EL CÓDIGO

### Backend: `dashboardController.js`

```javascript
// En createUser()
const io = getIO();
io.to('admin_dashboard').emit('new_user', {
  id: result.insertId,
  username: username,
  role: role,
  created_at: new Date()
});

// En updateUser()
io.to('admin_dashboard').emit('updated_user', {
  id: id,
  username: username,
  role: role,
  previousRole: previousUser.role,
  changedFields: modifiedFields
});

// En deleteUser()
io.to('admin_dashboard').emit('deleted_user', { id });
```

### Frontend: `AdminDashboard.jsx`

```javascript
// Detectar si hay modal abierto
const hasModalOpen = () => {
  return (
    showLogoutModal ||
    triggerDeleteReservationId ||
    triggerAddReservation ||
    triggerEditReservation !== null
  );
};

// En cada evento
socket.on('new_user', (newUser) => {
  toast.success(`Nuevo usuario: ${newUser.username}`);
  
  if (!hasModalOpen()) {
    // Recargar página después de 1 segundo
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
});
```

---

## 🧪 TESTING

### Escenario 1: Sin modal (Recarga automática)

1. Admin abre dashboard
2. En otra ventana, crear un usuario
3. **Resultado**: 
   - Toast aparece
   - Página se recarga automáticamente
   - Nuevo usuario aparece en la tabla

### Escenario 2: Con modal (No recarga)

1. Admin abre dashboard
2. Admin abre modal de "Editar usuario" o "Eliminar reserva"
3. En otra ventana, crear un usuario
4. **Resultado**:
   - Toast aparece
   - Página NO se recarga (modal sigue abierto)
   - Cuando cierre el modal, verá los cambios

### Escenario 3: Cambio de rol

1. Admin abre dashboard
2. En otra ventana, cambiar el rol de un usuario
3. **Resultado**:
   - Toast: "Rol de [nombre] cambió a: [nuevo rol]"
   - Si no hay modal: recarga
   - Si hay modal: no recarga

---

## ⚙️ LÓGICA DE DECISIÓN

```
¿Llegó evento por WebSocket?
    ↓
¿Hay algún modal abierto?
    ├─ SÍ → Mostrar toast + actualizar lista (sin recargar)
    └─ NO → Mostrar toast + esperar 1s + recargar página
              ↓
              window.location.reload()
```

---

## 📌 PUNTOS IMPORTANTES

1. **Retraso de 1 segundo**: Permite que el usuario vea la notificación antes de recargar
2. **Detección de modales**: Suma 4 condiciones diferentes:
   - `showLogoutModal` - Modal de logout
   - `triggerDeleteReservationId` - Modal de eliminar
   - `triggerAddReservation` - Modal de crear
   - `triggerEditReservation` - Modal de editar

3. **Scope del evento**: Los eventos se emiten solo a la sala `admin_dashboard`
4. **Reconexión**: Si el admin se desconecta, se reconecta automáticamente

---

## 🔄 COMPARACIÓN ANTES vs DESPUÉS

### ANTES ❌
```
Admin: Veo cambios solo si recargo F5
       Lento y manual
       Fácil perder cambios en modales
```

### DESPUÉS ✅
```
Admin: Cambios aparecen al instante
       Recarga automática (si no hay modal)
       No pierdo cambios en modales
       Notificaciones visuales claras
```

---

## 📊 TODOS LOS EVENTOS AHORA SOPORTADOS

| Evento | Origen | Destino | Recarga |
|--------|--------|---------|---------|
| `new_reservation` | Empleado crea | Admin recibe | ↻ Sí |
| `updated_reservation` | Admin/Emp actualiza | Admin recibe | ↻ Sí |
| `deleted_reservation` | Admin/Emp elimina | Admin recibe | ↻ Sí |
| `new_user` | Admin crea usuario | Admin recibe | ↻ Sí |
| `updated_user` | Admin actualiza usuario | Admin recibe | ↻ Sí |
| `deleted_user` | Admin elimina usuario | Admin recibe | ↻ Sí |

---

## 🚀 PRÓXIMAS MEJORAS POSIBLES

- [ ] Eventos para cambios de vehículos (create/update/delete)
- [ ] Notificaciones de validaciones pendientes
- [ ] Presencia de usuarios (quién está viendo dónde)
- [ ] Contador de cambios pendientes
- [ ] Deshacer/Rehacer en tiempo real

---

**Actualizado**: 6 de Abril de 2026
**Versión**: 2.0 - Con auto-reload y notificaciones de usuarios
