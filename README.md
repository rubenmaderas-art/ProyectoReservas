# Sistema de Gestión de Reservas de Vehículos

Panel de administración integral diseñado para gestionar flotas de vehículos corporativos, reservas de empleados y control estricto de documentación y auditoría.

---

## 🚀 Flujo Principal del Sistema

El sistema está diseñado para manejar todo el ciclo de vida de la reserva de un vehículo, desde la solicitud inicial hasta la validación final post-uso.

### 1. Solicitud de Reserva (Empleado)
- El empleado inicia sesión y visualiza únicamente los vehículos disponibles en las fechas deseadas.
- Si un vehículo ya está reservado o en mantenimiento, no aparecerá en el listado para esas fechas.
- El empleado crea una reserva y su estado inicial es **Pendiente**.

### 2. Aprobación y Seguimiento (Administrador / Supervisor)
- El supervisor o revisa las reservas pendientes pudiendo pasarlas a estado **Aprobada** o **Rechazada**.
- Cuando llega el momento de la reserva y el empleado recoge el coche, el estado típicamente avanza a **En Progreso**.
- En la entrega del vehículo, se registra el kilometraje final y el estado de entrega (**Correcto** o **Incorrecto**). Si es incorrecto, el sistema obliga a rellenar un parte de incidencias (informe de entrega).

### 3. Validación y Auditoría (Administrador / Supervisor)
- Tras la entrega, el vehículo pasa a estado **Validado** una vez que un rol superior certifica que todo está en orden o se revisan las incidencias en el panel de validaciones.
- Toda acción de cualquier usuario (creación, edición, cambio de estado) queda registrada de forma inmutable en el **Registro de Auditoría**.

---

## 🌟 Funcionalidades por Módulo

### 📊 Dashboard Principal (AdminDashboard)
- **Vista Dinámica:** Panel de control con métricas rápidas y estado del entorno.
- **Alertas Prioritarias:** Destaca los documentos de vehículos expirados o próximos a expirar para facilitar el mantenimiento preventivo por parte del equipo.
- **Personalización:** Soporte completo de modo oscuro/claro, Scroll Infinito en carga de datos y diseño responsive completo para móviles.

### 🚗 Gestión de Vehículos (VehiclesView)
- **Control del Parque Móvil:** Listado completo de vehículos con su estado actual e información básica (matrícula, marca, modelo).
- **Gestión Documental Avanzada:** Modal especializado para adjuntar y consultar documentación técnica (Seguro, ITV, Ficha Técnica) exclusivamente en formato PDF. Alertas automáticas de caducidad.
- **Filtros Avanzados:** Búsqueda y filtrado dinámico en tablas enriquecidas con Glassmorphism.

### 📅 Gestión de Reservas (ReservationsView)
- **Vistas Especializadas:** Sistema dinámico con scroll infinito u opciones de paginación para agilizar la lista de reservas.
- **Asistente (Wizard) de Creación:** Modal con proceso guiado (2 o 3 pasos según rol) para la selección de fechas, vehículos y confirmación.
- **Flujo de Estados:** Visualización clara de la transición de la reserva (Pendiente ➔ Aprobada ➔ En Progreso ➔ Entregado ➔ Validado).

### 👥 Gestión de Usuarios y Perfil (UsersView / Perfil)
- **Control de Accesos:** Panel del Administrador para crear, editar, deshabilitar y reasignar roles a los usuarios dentro de la base de datos.
- **Manejo de Sesión:** Autenticación segura mediante tokens almacenados en LocalStorage y panel de Login centralizado.
- **Perfil de Usuario:** Panel personal adaptado para la actualización de datos propios e información de contacto.

### 🛡️ Auditoría y Validaciones (AuditLogView / ValidationsView)
- **Registro de Auditoría Inmutable:** Tabla que guarda de forma estricta el usuario, rol, fecha y un detalle exhaustivo ("antes" y "después" / informe JSON) de cada acción crítica.
- **Panel de Validaciones:** Entorno exclusivo para visualizar vehículos entregados con problemas o incidencias reportadas tras el uso, y leer el informe detallado del operario.

---

## 🔐 Sistema de Roles y Accesos (RBAC)

Se ha implementado una jerarquía de tres niveles para garantizar la seguridad y operatividad:

1. **Administrador:** Control total (CRUD absoluto). Gestión vital de usuarios, edición de documentación maestra de vehículos, acceso pleno a la auditoría y configuración global.
2. **Supervisor:** Control operativo. Gestiona y aprueba reservas de forma genérica, revisa incidencias (validaciones), pero **no** puede crear/eliminar usuarios ni borrar registros de auditoría o vehículos.
3. **Empleado:** Acceso restringido base. Solo puede solicitar reservas para vehículos que efectivamente se encuentren disponibles en su rango de fechas, y visualizar el historial de sus propias peticiones. No tiene acceso a los paneles de gestión administrativa.

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología | Puerto / Contenedor |
| :--- | :--- | :--- |
| **Frontend** | React.js (Vite) + Tailwind CSS + Diseño UI Glassmorphism | `5173` |
| **Backend** | Node.js (Express) + JWT Auth + CORS | `4000` (ver `.env`) |
| **Base de Datos** | MySQL (Dockerizado) | `3306` |

---

## ⚙️ Instalación y Configuración

### 1. Requisitos Previos
* [Node.js](https://nodejs.org/) (v18+)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 2. Base de Datos
Levanta el contenedor y ejecuta el script de inicialización desde la raíz del proyecto:
```bash
docker-compose up -d
```
Ejecutar el script SQL de inicialización (ejemplo en PowerShell):
```PowerShell
Get-Content init/init.sql | docker exec -i mysql_reservas mysql -u root -proot proyecto_reservas
```
*(Nota: El middleware en backend limpia automáticamente los espacios de elementos como matrículas al guardar).*

### 3. Despliegue de los Servicios

**Backend:**
```bash
cd back
npm install
npm run dev
```

**Frontend:**
```bash
cd front
npm install
npm run dev
```

---

*Desarrollado por Rubén Maderas*

---

## Docker de desarrollo

La forma recomendada de arrancar el proyecto en local ahora es con Docker completo:

```bash
docker compose up --build
```

Eso levanta:
- MySQL,
- phpMyAdmin,
- el backend como `back-reservas-desarrollo`,
- y el frontend en modo desarrollo con recarga automática.

Rutas habituales:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- phpMyAdmin: `http://localhost:8080`

La sincronización de centros se ejecuta con `cron` dentro del backend.

Si estabas usando PM2 en Windows, para evitar conflicto de puerto conviene pararlo antes de levantar Docker:

```powershell
cd back
npm run pm2:stop
```

En Docker, los cambios en `back/` y `front/` se reflejan al guardar gracias a los volúmenes montados y a los scripts `dev:docker`.

## Correo de reservas

El backend ya prepara correos automáticos para estos casos:
- reserva aprobada,
- reserva activa,
- reserva finalizada,
- recordatorio de formulario de entrega pendiente 24 horas después,
- reserva cancelada o rechazada,
- reserva eliminada,
- y un correo de prueba manual desde el dashboard.

Variables útiles en `back/.env` o `back/.env.docker`:
- `MAIL_FROM`: remitente visible del correo.
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_PASS`: configuración SMTP real.
- `MAIL_TO_OVERRIDE`: fuerza un destinatario fijo en desarrollo o pruebas.
- `MAIL_TEST_RECIPIENT`: destinatario por defecto del correo de prueba.

Si no hay configuración SMTP, el sistema funciona en modo de previsualización y deja trazas en consola, así no bloquea el flujo de reservas.

### Desarrollo local con Mailpit

En Docker, el entorno de desarrollo usa Mailpit como buzón capturador:
- SMTP: `localhost:1025`
- Web UI: `http://localhost:8025`

Todo lo que envía el backend queda visible en la interfaz de Mailpit sin salir a Internet.
## Variables de entorno Docker

El backend usa [back/.env.docker](/c:/Proyectos/ProyectoReservas/back/.env.docker) dentro del contenedor.
El frontend usa [front/.env.docker](/c:/Proyectos/ProyectoReservas/front/.env.docker) con `vite --mode docker`.

Si cambias esas variables, reinicia los contenedores para que Vite y Node las vuelvan a leer.
