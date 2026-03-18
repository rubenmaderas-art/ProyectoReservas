# 🚀 Sistema de Auditoría - Guía de Instalación y Uso

## 1️⃣ Instalación

### Paso 1: Aplicar índices de optimización (OPCIONAL pero recomendado)

```bash
# Conectarse a MySQL y ejecutar:
mysql -u usuario -p < init/optimize_audit_indexes.sql

# O directamente en MySQL:
USE proyecto_reservas;
-- Ejecutar el contenido de optimize_audit_indexes.sql
```

### Paso 2: Reiniciar el servidor backend

```bash
cd back
npm install  # Por si hay nuevas dependencias
npm run dev
```

## 2️⃣ Verificación Rápida

### Test 1: Verificar que la auditoría está registrando

1. Realiza cualquier acción en la web (crear vehículo, reserva, usuario, etc.)
2. Ejecuta en tu terminal:

```bash
curl -H "Authorization: Bearer TU_TOKEN_JWT" \
  "http://localhost:4000/api/audit/logs?limit=5"
```

Deberías ver los últimos 5 registros creados. ✅

### Test 2: Ver estadísticas

```bash
curl -H "Authorization: Bearer TU_TOKEN_JWT" \
  "http://localhost:4000/api/audit/statistics"
```

Deberías ver un JSON con estadísticas completas. ✅

### Test 3: Ver actividad de un usuario

```bash
curl -H "Authorization: Bearer TU_TOKEN_JWT" \
  "http://localhost:4000/api/audit/user-summary?userId=1"
```

Deberías ver las acciones de ese usuario. ✅

## 3️⃣ Integración en Frontend (React)

### Opción A: Usar el componente listo

1. El componente ya está en: `front/src/components/AuditLogView.jsx`
2. El CSS está en: `front/src/styles/AuditLogView.css`

```javascript
// En tu página (ej: AdminDashboard.jsx)
import AuditLogView from './AuditLogView';

export default function AdminDashboard() {
  return (
    <div>
      {/* ... otros componentes ... */}
      <AuditLogView />
    </div>
  );
}
```

### Opción B: Crear tu propio componente

```javascript
import { useEffect, useState } from 'react';

export function MyAuditComponent() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetch('/api/audit/logs?page=1&limit=10', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(r => r.json())
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

## 4️⃣ Consultas Útiles

### Ver acciones en las últimas 24 horas
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:4000/api/audit/recent?hours=24"
```

### Ver cambios en una reserva específica
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:4000/api/audit/record-history?table=reservations&recordId=42"
```

### Filtrar por múltiples criterios
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:4000/api/audit/logs?action=UPDATE&table=vehicles&userId=2&page=1&limit=20"
```

### Exportar logs de un período
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:4000/api/audit/export?startDate=2024-03-01&endDate=2024-03-18" \
  > audit_logs.json
```

### Limpiar logs más antiguos de 90 días (SOLO ADMIN)
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"daysOld": 90}' \
  "http://localhost:4000/api/audit/clean"
```

## 5️⃣ Estructura de Datos Importante

### JSON de detalles por acción

**CREATE:**
```json
{
  "username": "juan_perez",
  "vehicle_id": 5,
  "status": "disponible"
}
```

**UPDATE:**
```json
{
  "changes": {
    "status": { "from": "pendiente", "to": "aprobada" },
    "kilometers": { "from": 15000, "to": 15250 }
  }
}
```

**DELETE:**
```json
{
  "action": "Reservation deleted",
  "user_id": 7
}
```

## 6️⃣ Troubleshooting

### Error: "No Route Found /api/audit/..."
- Verificar que `auditRoutes` esté registrado en `back/index.js`
- Reiniciar el servidor

### Error: "Unauthorized"
- El token JWT ha expirado o es inválido
- Hacer login de nuevo

### Logs no aparecen
- Verificar que las operaciones CRUD se ejecuten correctamente
- Revisar logs del servidor con `npm run dev`

### Query lenta
- Ejecutar el script de índices: `optimize_audit_indexes.sql`
- Usar filtros específicos (reducir cantidad de registros)

## 7️⃣ Mejoras Futuras Sugeridas

1. **Alertas en tiempo real**: WebSocket para notificar cambios
2. **Dashboard gráfico**: Gráficas de actividad
3. **Archivado automático**: Mover logs antiguos a tabla separada
4. **Búsqueda por contenido**: Buscar en detalles_admin
5. **Comparación de versiones**: Ver diff entre estados

## 8️⃣ Documentación Completa

Para documentación detallada, ver:
- `AUDIT_DOCUMENTATION.md` - Referencia completa de API
- `AUDIT_IMPLEMENTATION_SUMMARY.md` - Resumen de cambios

## ✨ ¡Listo!

Tu sistema de auditoría está completamente funcional. Ahora puedes:
- ✅ Rastrear todas las acciones de usuarios
- ✅ Ver reportes y estadísticas
- ✅ Exportar datos para análisis
- ✅ Auditar cambios históricos
- ✅ Cumplir con requisitos de compliance

---

**¿Preguntas?** Revisar la documentación o los test cases en este archivo.
