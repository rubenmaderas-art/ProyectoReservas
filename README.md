# Sistema de Gestión de Reservas de Vehículos

Panel de administración integral diseñado para gestionar flotas de vehículos, reservas de empleados y control estricto de documentación técnica (ITV, Seguros, etc.).

---

## Stack Tecnológico y Puertos

| Componente | Tecnología | Puerto / Contenedor |
| :--- | :--- | :--- |
| **Frontend** | React.js (Vite) + Tailwind CSS | `5173` |
| **Backend** | Node.js (Express) | `4000` (ver `.env`) |
| **Base de Datos** | MySQL (Docker) | `3306` |

---

## Sistema de Roles y Control de Acceso (RBAC)

Se ha implementado una jerarquía de tres niveles para garantizar la seguridad y operatividad del sistema:

* **Administrador:** Control total (CRUD) sobre todas las tablas. Gestión de usuarios, edición de documentación maestra y configuración global.
* **Supervisor:** Encargado de la aplicación en ejecución. Gestiona reservas y validaciones, pero **no** tiene acceso al panel de gestión de usuarios ni a la edición de documentación crítica.
* **Empleado:** Acceso limitado a la reserva de vehículos. No puede ver reservas de otros usuarios. Solo visualiza vehículos disponibles en el rango de fechas seleccionado.

---

## Funcionalidades Actualizadas

### Dashboard e Interfaz
* **Modo Oscuro:** Intercambiable mediante icono de Sol/Luna.
* **Dashboard Dinámico:** Ahora muestra prioritariamente los **documentos expirados** en lugar de los pendientes.
* **UX Mejorada:** Modales de mayor tamaño, alertas personalizadas y ordenación de tablas (alfabética, numérica y por fecha de creación).
* **Buscador:** Barra de búsqueda por múltiples parámetros en cada apartado.
* **Responsive:** Rediseño de la cabecera en formato móvil para la sección de vehículos.

### Gestión de Vehículos y Documentación
* **Control Documental Avanzado:** Nuevo icono de "hoja de texto" en la tabla de vehículos que abre un modal con la documentación específica (solo PDF).
* **Subida de Archivos:** Segundo nivel de modales para agregar documentos con tipo (Enum), fecha de expiración y path encriptado.
* **Lógica de Disponibilidad:** Si un vehículo está reservado en una fecha/hora específica, desaparece automáticamente de la lista para el empleado.

### Reservas y Auditoría
* **Flujo de Estados:** `Pendiente` (creada), `Aprobada`, `Rechazada`, `En Progreso` (uso), `Entregado` y `Validado` (revisión final del superior).
* **Control de Entrega:** Registro de KM finales y estado (`Correcto`/`Incorrecto`). Si es incorrecto, se habilita un campo de informe detallado.
* **Tabla de Auditoría:** Nueva tabla que registra: `usuario`, `rol`, `fecha`, `acción` y `detalles/apuntes`.

---

## Instalación y Configuración

### 1. Requisitos Previos
* [Node.js](https://nodejs.org/) (v18+)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 2. Base de Datos
Levanta el contenedor y ejecuta el script de inicialización:
```bash
docker-compose up -d
```
Ejecutar el script SQL (PowerShell):

```PowerShell
Get-Content init/init.sql | docker exec -i mysql_reservas mysql -u root -proot proyecto_reservas
Nota: El sistema limpia automáticamente los espacios en las matrículas al guardar en la BD.
```
### 3. Configuración del Proyecto
Backend:

```Bash
cd back
npm install
npm run dev
```

Frontend:
```Bash
cd front
npm install
npm run dev
```
Cambios Recientes en la Base de Datos
Tabla Reservas: Añadidos campos km_entrega, estado_entrega, validacion_entrega (timestamp) e informe_entrega.

Enums: Actualizados todos los tipos de documentación y estados de reserva.

Seguridad: Implementación de tokens almacenados en localStorage con sistema de Logout para limpieza de sesión.

Autor
Rubén Maderas
