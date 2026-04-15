# Guía para explicar el proyecto al profe

Este documento está pensado para repasarlo rápido antes de la visita. La idea no es memorizarlo palabra por palabra, sino tener claro qué hace tu web, por qué es interesante y cómo explicarlo con seguridad.

## 1. Resumen corto para abrir la explicación

Puedes presentarlo así:

> Es una plataforma de reservas de vehículos con panel administrativo, control de roles, auditoría de acciones y actualizaciones en tiempo real. No es solo un CRUD: también sincroniza datos externos, gestiona documentos y mantiene consistencia entre reservas y vehículos.

Si te pide una versión más simple:

> La web sirve para reservar vehículos, validar entregas, gestionar usuarios y controlar todo el proceso con permisos, auditoría y avisos en tiempo real.

## 2. Funcionalidades chulas que conviene destacar

### WebSockets

Esto es de lo más llamativo del proyecto.

- El panel se actualiza sin recargar la página.
- Si otro usuario crea, edita o borra una reserva, el cambio llega al momento.
- Lo mismo ocurre con usuarios.
- Evita tener que estar haciendo peticiones manuales o refrescando.

Cómo explicarlo técnicamente:

- El frontend usa `socket.io-client`.
- El backend usa `socket.io`.
- Hay una sala lógica para el dashboard de administración.
- Se escuchan eventos como `new_reservation`, `updated_reservation` o `deleted_user`.

Si te preguntan por qué es útil:

- Porque da sensación de aplicación viva.
- Porque reduce latencia visual.
- Porque mejora coordinación entre usuarios trabajando a la vez.

### Sincronización de centros

Esto también es interesante porque parece “mantenimiento automático”.

- Hay un script que sincroniza centros desde una base externa.
- Se ejecuta de forma programada con `cron` a las `03:00`.
- Inserta o actualiza datos en la base local.

Cómo explicarlo:

- No todo depende de meter datos a mano.
- El sistema puede traer datos maestros desde otra fuente y mantenerlos al día.
- Eso evita inconsistencias entre bases distintas.

### Cron en el backend local

En tu caso ya no hace falta el Programador de tareas de Windows.

- El backend se arranca en local desde VS Code.
- `node-cron` vive dentro del propio proceso Node.
- La sincronización diaria se ejecuta mientras el backend esté levantado.
- Docker te sirve solo para MySQL y phpMyAdmin, no para la API.

### Base de datos en Docker

Esto queda muy bien explicarlo.

- La base MySQL se levanta en contenedor.
- Usa un volumen para persistir datos.
- Aunque reinicies el contenedor, los datos siguen ahí.
- Además hay un `init.sql` para inicializar estructura/tablas.

Si te preguntan por qué es importante:

- Porque facilita montar el proyecto en otro equipo.
- Porque separa el entorno de desarrollo del sistema anfitrión.
- Porque hace el proyecto más portable.

### Autenticación y roles

El sistema no deja entrar a cualquiera a cualquier sitio.

- Usa JWT para autenticación.
- Refresca el usuario actual desde backend.
- Revisa si el usuario sigue válido y qué rol tiene.
- Aplica permisos distintos para `admin`, `supervisor`, `gestor` y `empleado`.

Cómo explicarlo:

- El token identifica al usuario.
- El backend comprueba el token y vuelve a consultar la base de datos.
- Así el sistema no se queda con datos viejos si cambian roles o centros.

### Auditoría

Esto demuestra que el proyecto está pensado con trazabilidad.

- Se registran acciones críticas.
- Se guarda quién hizo qué, sobre qué tabla y cuándo.
- También se almacenan detalles en JSON.

Si te preguntan para qué sirve:

- Para saber qué pasó si hay un problema.
- Para controlar cambios importantes.
- Para tener historial y trazabilidad.

### Gestión de reservas con coherencia de negocio

Aquí está la parte “inteligente” del flujo.

- Una reserva cambia de estado: pendiente, aprobada, activa, finalizada, rechazada.
- El vehículo también cambia de estado: disponible, reservado, en uso, pendiente-validación.
- El sistema intenta que ambos estados tengan sentido entre sí.

Cómo explicarlo:

- Si una reserva está aprobada o pendiente, el vehículo puede quedar reservado.
- Si la reserva está activa, el coche pasa a en uso.
- Si termina, puede pasar a pendiente de validación.

### Validaciones y entregas

Esta parte hace que el flujo no termine solo al devolver el vehículo.

- El usuario rellena datos de entrega.
- Se valida kilometraje.
- Si hay incidencias, se obliga a documentarlas.
- Luego el supervisor o administrador revisa la validación.

### Exportación a PDF

También es una funcionalidad bonita de enseñar.

- Se genera un informe PDF desde el navegador.
- Usa `jsPDF`.
- Incluye datos del vehículo, validación y observaciones.

Si te preguntan por qué mola:

- Porque convierte datos de la app en documentación formal.
- Porque no depende de una herramienta externa.

### Interfaz responsive y moderna

No es solo funcional, también está cuidada visualmente.

- Está hecha con React y Vite.
- Usa Tailwind.
- Tiene diseño adaptable a móvil.
- Hay componentes reutilizables para calendario, selectores y tablas.

## 3. Preguntas típicas del profe y cómo responder

### "¿Qué parte es la más interesante técnicamente?"

Puedes responder:

> Yo destacaría tres cosas: los WebSockets para tiempo real, la sincronización programada de centros y la auditoría de acciones. Ahí hay lógica de negocio real, no solo pantallas.

### "¿Por qué usaste WebSockets?"

> Para que los cambios se reflejen al instante en el panel sin refrescar. En un sistema con varios usuarios gestionando reservas, eso mejora mucho la coordinación.

### "¿Cómo controlas quién puede hacer cada cosa?"

> Con JWT y roles. El backend verifica el token, refresca el usuario real desde base de datos y aplica permisos según rol.

### "¿Qué pasa si cambian datos del usuario mientras está logueado?"

> El backend vuelve a consultar la base de datos al verificar la sesión, así no me quedo solo con lo que había en localStorage.

### "¿Cómo haces la parte de sincronización de centros?"

> Hay un script que se ejecuta por cron. Lee datos de una base externa y hace upsert en la base local para mantener los centros actualizados.

### "¿Cómo aseguras que la base no se pierde al reiniciar?"

> La base corre en Docker con un volumen persistente, así los datos se mantienen aunque el contenedor se reinicie.

### "¿Qué aporta la auditoría?"

> Trazabilidad. Si alguien cambia algo importante, queda registrado el usuario, la acción, la tabla y el registro afectado.

### "¿Qué hace que el sistema sea más robusto?"

> La combinación de validación de negocio, sincronización de estados, autenticación, auditoría y refresco en tiempo real.

## 4. Puntos concretos que puedes mencionar con naturalidad

- El dashboard escucha eventos en tiempo real.
- El sistema usa salas lógicas para separar el flujo del panel.
- La base de datos está dockerizada y persistida con volumen.
- Hay tareas automáticas programadas para sincronización.
- Las acciones importantes quedan registradas.
- El flujo de reservas y vehículos está alineado por estados.
- Se pueden exportar informes PDF.
- La app está pensada para trabajar con varios roles.

## 5. Mini guion de 1 minuto

Si quieres sonar claro y seguro:

> Mi proyecto es una aplicación de reservas de vehículos con panel de administración. Lo más interesante es que no solo gestiona CRUD, sino que tiene actualización en tiempo real con WebSockets, control de acceso por roles, auditoría de acciones y sincronización automática de centros desde una fuente externa. Además, la base de datos está en Docker con persistencia, y la parte de validaciones genera informes PDF. En resumen, es una web pensada para gestionar todo el ciclo de vida de una reserva de forma segura y ordenada.

## 6. Cosas que conviene tener claras por si te repregunta

- Qué diferencia hay entre `pendiente`, `aprobada`, `activa` y `finalizada`.
- Por qué el backend vuelve a consultar al usuario al validar el token.
- Qué ventajas tiene usar un volumen de Docker.
- Para qué sirve `cron`.
- Cómo llegan los cambios en tiempo real al dashboard.
- Qué se guarda en la auditoría.
- Qué hace el sistema cuando una entrega tiene incidencias.

## 7. Qué diría yo que es lo más fuerte del proyecto

Si te toca elegir solo una o dos cosas:

1. `WebSockets` para actualización instantánea.
2. `Auditoría` para trazabilidad real.
3. `Sincronización automática` de centros.
4. `Control por roles` bien integrado.

## 8. Frase final útil

> Lo bueno del proyecto es que combina interfaz, lógica de negocio, seguridad y automatización, así que no es solo una web visual: está pensada como una herramienta de gestión real.
