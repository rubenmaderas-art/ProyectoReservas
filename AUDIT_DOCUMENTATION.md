# Sistema de Auditoría - Documentación

## Descripción General

El sistema de auditoría registra automáticamente todas las acciones realizadas por los usuarios en la aplicación web. Esto incluye creación, actualización, lectura y eliminación de registros en las siguientes tablas:

- **Users** (Usuarios)
- **Vehicles** (Vehículos)
- **Reservations** (Reservas)
- **Documents** (Documentos)
- **Validations** (Validaciones)
- **Auth** (Autenticación - Login/Registro)

## Estructura de Datos en la BD

### Tabla `audit_logs`

```sql
CREATE TABLE audit_logs (
    id_auditoria INT AUTO_INCREMENT PRIMARY KEY,
    users_id INT,
    rol_momento VARCHAR(50),          -- Rol del usuario en el momento
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accion VARCHAR(20),               -- CREATE, READ, UPDATE, DELETE
    tabla_afectada VARCHAR(50),       -- Tabla sobre la que se actuó
    registro_id INT,                  -- ID del registro afectado
    detalles_admin TEXT,              -- JSON con detalles adicionales
    FOREIGN KEY (users_id) REFERENCES users(id)
);
```

## Acciones Registradas

### 1. **Autenticación**
- Login: Cada vez que un usuario inicia sesión
- Registro: Creación de nuevos usuarios

### 2. **Gestión de Usuarios**
- CREATE: Crear nuevo usuario
- UPDATE: Actualizar datos de usuario
- DELETE: Eliminar usuario (soft delete)

### 3. **Gestión de Vehículos**
- CREATE: Crear nuevo vehículo
- UPDATE: Modificar datos del vehículo
- DELETE: Eliminar vehículo

### 4. **Gestión de Reservas**
- CREATE: Crear nueva reserva
- UPDATE: Modificar reserva (cambios de estado, horarios, etc.)
- DELETE: Eliminar reserva

### 5. **Gestión de Documentos**
- CREATE: Subir nuevo documento
- UPDATE: Actualizar información del documento
- DELETE: Eliminar documento

### 6. **Validaciones**
- UPDATE: Validar o aprobar una reserva
- DELETE: Eliminar validación

## Endpoints de Auditoría

### 1. Obtener todos los registros de auditoría
```
GET /api/audit/logs
```

**Query Parameters:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Registros por página (default: 50)
- `userId` (opcional): Filtrar por ID del usuario
- `action` (opcional): Filtrar por tipo de acción (CREATE, UPDATE, DELETE, READ)
- `table` (opcional): Filtrar por tabla afectada
- `startDate` (opcional): Filtrar desde fecha (YYYY-MM-DD)
- `endDate` (opcional): Filtrar hasta fecha (YYYY-MM-DD)

**Ejemplo:**
```bash
GET /api/audit/logs?page=1&limit=50&action=CREATE&table=reservations
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id_auditoria": 1,
      "users_id": 5,
      "username": "juan_perez",
      "rol_momento": "empleado",
      "fecha": "2024-03-18T14:30:00Z",
      "accion": "CREATE",
      "tabla_afectada": "reservations",
      "registro_id": 42,
      "detalles_admin": "{\"user_id\": 5, \"vehicle_id\": 3, \"status\": \"pendiente\"}"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalRecords": 234,
    "recordsPerPage": 50
  }
}
```

### 2. Obtener estadísticas globales
```
GET /api/audit/statistics
```

**Respuesta:**
```json
{
  "success": true,
  "estadisticas": {
    "total_registros": 1254,
    "acciones_por_tipo": [
      { "accion": "CREATE", "cantidad": 342 },
      { "accion": "UPDATE", "cantidad": 567 },
      { "accion": "DELETE", "cantidad": 89 },
      { "accion": "READ", "cantidad": 256 }
    ],
    "tablas_mas_auditadas": [
      { "tabla_afectada": "reservations", "cantidad": 450 },
      { "tabla_afectada": "vehicles", "cantidad": 250 },
      { "tabla_afectada": "users", "cantidad": 180 }
    ],
    "usuarios_mas_activos": [
      { "id": 1, "username": "admin", "total_acciones": 342 },
      { "id": 5, "username": "supervisor1", "total_acciones": 267 }
    ],
    "rango_fechas": {
      "fecha_inicio": "2024-01-01T00:00:00Z",
      "fecha_fin": "2024-03-18T14:30:00Z"
    }
  }
}
```

### 3. Resumen de acciones por usuario
```
GET /api/audit/user-summary?userId=5
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "username": "juan_perez",
      "role": "empleado",
      "total_acciones": 156,
      "creaciones": 42,
      "actualizaciones": 89,
      "eliminaciones": 5,
      "lecturas": 20,
      "ultima_accion": "2024-03-18T14:30:00Z"
    }
  ]
}
```

### 4. Resumen de acciones por tabla
```
GET /api/audit/table-summary?table=reservations
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "tabla_afectada": "reservations",
      "accion": "CREATE",
      "cantidad": 180,
      "usuarios_unicos": 15,
      "primera_accion": "2024-01-01T10:00:00Z",
      "ultima_accion": "2024-03-18T14:30:00Z"
    },
    {
      "tabla_afectada": "reservations",
      "accion": "UPDATE",
      "cantidad": 220,
      "usuarios_unicos": 8,
      "primera_accion": "2024-01-02T11:00:00Z",
      "ultima_accion": "2024-03-18T14:15:00Z"
    }
  ]
}
```

### 5. Historial de un registro específico
```
GET /api/audit/record-history?table=reservations&recordId=42
```

**Respuesta:**
```json
{
  "success": true,
  "table": "reservations",
  "recordId": 42,
  "history": [
    {
      "id_auditoria": 156,
      "users_id": 2,
      "username": "supervisor",
      "rol_momento": "supervisor",
      "fecha": "2024-03-18T14:30:00Z",
      "accion": "UPDATE",
      "tabla_afectada": "reservations",
      "detalles_admin": "{\"previous_status\": \"pendiente\", \"new_status\": \"aprobada\"}"
    },
    {
      "id_auditoria": 105,
      "users_id": 5,
      "username": "juan_perez",
      "rol_momento": "empleado",
      "fecha": "2024-03-17T10:15:00Z",
      "accion": "CREATE",
      "tabla_afectada": "reservations",
      "detalles_admin": "{\"user_id\": 5, \"vehicle_id\": 3, \"status\": \"pendiente\"}"
    }
  ]
}
```

### 6. Acciones recientes
```
GET /api/audit/recent?hours=24&limit=50
```

**Parámetros:**
- `hours` (opcional): Últimas N horas (default: 24)
- `limit` (opcional): Máximo de registros (default: 50)

### 7. Exportar registros de auditoría
```
GET /api/audit/export?startDate=2024-03-01&endDate=2024-03-18&action=CREATE
```

Descarga un archivo JSON con todos los registros que cumplen los filtros.

### 8. Limpiar registros antiguos (Solo Admin)
```
POST /api/audit/clean
```

**Body:**
```json
{
  "daysOld": 90
}
```

Elimina todos los registros de auditoría más antiguos de X días.

## Ejemplos de Uso

### Ver actividad de un usuario específico en un período
```bash
curl "http://localhost:4000/api/audit/logs?userId=5&startDate=2024-03-01&endDate=2024-03-18&limit=100"
```

### Ver todas las creaciones de reservas en la última semana
```bash
curl "http://localhost:4000/api/audit/logs?table=reservations&action=CREATE&hours=168"
```

### Ver historial completo de modificaciones de un vehículo
```bash
curl "http://localhost:4000/api/audit/record-history?table=vehicles&recordId=7"
```

### Obtener resumen de acciones del usuario 2 (supervisor)
```bash
curl "http://localhost:4000/api/audit/user-summary?userId=2"
```

## Consideraciones de Seguridad

1. **Autenticación**: Todos los endpoints requieren autenticación. El usuario debe tener un token JWT válido.

2. **Autorización**: El acceso a ciertos endpoints (como `/clean`) está restringido a usuarios con rol `admin`.

3. **Sensibilidad de Datos**: Los registros de auditoría pueden contener información sensible. Asegúrate de que solo usuarios autorizados puedan acceder a ellos.

4. **Retención de Datos**: Se recomienda ejecutar la limpieza de registros antiguos periódicamente para evitar que la base de datos crezca excesivamente.

## Índices Recomendados

Para optimizar las consultas de auditoría, se recomienda añadir los siguientes índices:

```sql
ALTER TABLE audit_logs ADD INDEX idx_users_id (users_id);
ALTER TABLE audit_logs ADD INDEX idx_fecha (fecha);
ALTER TABLE audit_logs ADD INDEX idx_accion (accion);
ALTER TABLE audit_logs ADD INDEX idx_tabla_afectada (tabla_afectada);
ALTER TABLE audit_logs ADD INDEX idx_usuario_fecha (users_id, fecha);
ALTER TABLE audit_logs ADD INDEX idx_tabla_registro (tabla_afectada, registro_id);
```

## Información de Detalles (detalles_admin)

El campo `detalles_admin` contiene un JSON con información específica sobre la acción realizada:

### CREATE (Crear registro)
```json
{
  "username": "juan_perez",
  "field1": "value1",
  "field2": "value2"
}
```

### UPDATE (Actualizar registro)
```json
{
  "changes": {
    "status": { "from": "pendiente", "to": "aprobada" },
    "kilometers": { "from": 15000, "to": 15250 }
  }
}
```

### DELETE (Eliminar registro)
```json
{
  "action": "Record deleted",
  "affected_user_id": 5
}
```

### READ (Login)
```json
{
  "username": "user",
  "action": "User logged in"
}
```

## Integración con Frontend

El frontend puede consumir estos endpoints para mostrar:

1. **Panel de Administrador**: Resumen de auditoría con estadísticas
2. **Historial de Usuario**: Mostrar las acciones de un usuario específico
3. **Auditoría de Registro**: Ver cambios históricos de un registro
4. **Reportes**: Generar reportes de actividad por período

Ejemplo de componente React:
```javascript
import { useEffect, useState } from 'react';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetch('/api/audit/logs?limit=50')
      .then(res => res.json())
      .then(data => setLogs(data.data));
  }, []);

  return (
    <table>
      <thead>
        <tr>
          <th>Usuario</th>
          <th>Acción</th>
          <th>Tabla</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>
        {logs.map(log => (
          <tr key={log.id_auditoria}>
            <td>{log.username}</td>
            <td>{log.accion}</td>
            <td>{log.tabla_afectada}</td>
            <td>{new Date(log.fecha).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```
