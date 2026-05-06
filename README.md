# Proyecto Reservas MACROSAD

Plataforma web para gestionar reservas de vehiculos de empresa, con control de usuarios, flota, centros, validaciones y trazabilidad de acciones.

La aplicacion esta pensada para ofrecer una experiencia completa tanto al equipo operativo como al administrativo: cada reserva sigue un flujo controlado, cada cambio relevante queda auditado y los documentos del vehiculo se supervisan desde el panel central.

## Resumen

- Gestion de reservas de principio a fin.
- Control de vehiculos, usuarios, centros y perfil personal.
- Validacion de entregas e incidencias.
- Registro de auditoria para acciones criticas.
- Notificaciones por correo y actualizaciones en tiempo real.

## Que incluye

### Dashboard
- Vista central con metricas y accesos rapidos.
- Alertas sobre documentacion caducada o proxima a caducar.
- Navegacion por secciones desde un unico panel.

### Vehiculos
- Listado y gestion del parque movil.
- Datos basicos de cada vehiculo, estado actual y documentacion asociada.
- Control de documentos tecnicos y seguimiento de vencimientos.

### Reservas
- Creacion y seguimiento de reservas por rango de fechas.
- Flujo de estados para aprobar, iniciar, entregar y validar.
- Compatibilidad con vistas largas y carga progresiva de informacion.

### Usuarios
- Gestion de cuentas y roles.
- Edicion de datos de perfil.
- Control de acceso segun permisos.

### Centros
- Administracion de centros o ubicaciones asociadas al sistema.
- Uso integrado en filtros y procesos internos.

### Validaciones
- Revision de entregas con incidencias.
- Consulta del informe asociado a cada caso.

### Auditoria
- Historial de acciones sensibles.
- Trazabilidad de cambios con informacion de usuario, fecha y detalle de la operacion.

## Roles

- Administrador: acceso completo, gestion total de usuarios, vehiculos, auditoria y configuracion operativa.
- Supervisor: supervision del flujo de reservas, revision de incidencias y validaciones.
- Empleado: consulta de disponibilidad y creacion de solicitudes dentro de su alcance.

## Arquitectura

- Frontend: React + Vite + Tailwind CSS.
- Backend: Node.js + Express + JWT + Socket.IO.
- Integraciones: correo automatico, cron jobs, subida de documentos y exportacion de datos.

## Tecnologias destacadas

- React 18
- Vite
- Tailwind CSS
- React Router
- Axios
- Express 5
- MySQL
- Socket.IO
- Nodemailer
- Zod

## Estructura del repositorio

- `front/`: interfaz de usuario y componentes React.
- `back/`: API, controladores, rutas, middleware y utilidades de servidor.
- `init/`: scripts de esquema e inicializacion.

## Rutas principales

- `/` y `/login`: acceso al sistema.
- `/inicio`: dashboard principal.
- `/vehiculos`: gestion de flota.
- `/reservas`: gestion de reservas.
- `/usuarios`: administracion de usuarios.
- `/centros`: gestion de centros.
- `/validaciones`: revision de incidencias.
- `/auditoria`: registro de auditoria.
- `/mi-perfil`: perfil de usuario.

## Scripts utiles

Frontend:

```bash
npm run dev
npm run build
npm run lint
```

Backend:

```bash
npm run dev
npm run sync:centros
npm run cleanup:delivery-km
```

## Flujo funcional

1. El usuario accede con su cuenta y ve solo las opciones permitidas por su rol.
2. Se consulta disponibilidad y se crean reservas dentro del rango seleccionado.
3. La reserva avanza por estados hasta su entrega y validacion final.
4. Las incidencias, cambios de estado y acciones sensibles quedan registradas.
5. El sistema mantiene la comunicacion con el usuario mediante notificaciones y avisos.

## Observaciones

- El frontend esta preparado para navegacion modular por secciones.
- El backend centraliza autenticacion, auditoria, mensajeria y sincronizaciones automaticas.
- La aplicacion ya contempla componentes para experiencia responsive y carga diferida.

---

Desarrollado por Ruben Maderas
