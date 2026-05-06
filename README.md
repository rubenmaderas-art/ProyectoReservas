# Proyecto Reservas de vehiculos
Plataforma web para gestionar reservas de vehiculos de empresa, con control de usuarios, vehiculos, centros, validaciones y trazabilidad de acciones.

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
- Alertas sobre documentacion caducada y partes de taller desactualizados.
- Navegacion por secciones desde un unico panel.

### Vehiculos
- Listado y gestion de la flota de vehiculos.
- Datos basicos de cada vehiculo, estado actual y documentacion asociada.
- Control de documentos tecnicos y seguimiento de vencimientos.
- Datos de partes de taller y seguimiento de las mismas.

### Reservas
- Creacion y seguimiento de reservas por rango de fechas y disponibilidad por centro y vehiculo.
- Flujo de estados para saber como se encuentra la reserva en todo momento.
- Carga progresiva de informacion.

### Usuarios
- Gestion de cuentas y roles.
- Edicion de datos de perfil.
- Control de acceso segun permisos.

### Centros
- Administracion de centros asociadas al sistema.
- Uso integrado en filtros y procesos internos.
- Actualizacion diaria y automatizada desde sistema externo.

### Validaciones
- Revision de entregas de vehiculos con o sin incidencias.
- Capacidad de comunicacion entre empleados y administrador/responsable de centro.

### Auditoria
- Historial de acciones en toda la web.
- Trazabilidad de cambios con informacion de usuario, fecha y detalle de la operacion.

## Roles

- Administrador: acceso completo, gestion total de usuarios, vehiculos, auditoria y configuracion operativa.
- Supervisor: supervision del flujo de reservas, revision de incidencias y validaciones.
- Gestor: es como un empleado pero con permiso de visualizacion de vehiculos y sus documentos.
- Empleado: consulta de disponibilidad y creacion de reservas, a la espera de aprovacion por un supervisor o administrador.

## Arquitectura

- Frontend: React + Vite + Tailwind CSS.
- Backend: Node.js + Express + JWT + Socket.IO.
- Integraciones: correo automatico, cron jobs, subida de documentos y exportacion de datos.

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

## Flujo funcional

1. El usuario accede con su cuenta y ve solo las opciones permitidas por su rol.
2. Se consulta disponibilidad y se crean reservas dentro del rango seleccionado.
3. La reserva avanza por estados hasta su entrega, rellenado del formulario de entrega y validacion final.
4. Las incidencias, cambios de estado y acciones sensibles quedan registradas en auditoria para el administrador.
5. El sistema mantiene la comunicacion con el usuario mediante notificaciones y avisos tipo toast y correo electronico, ademas de los avisos del dashboard.

---

Desarrollado por Ruben Maderas