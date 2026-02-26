# 🚗 Sistema de Gestión de Reservas de Vehículos

Este es un panel de administración integral diseñado para gestionar la flota de vehículos, reservas de empleados y control de documentación técnica (ITV y Seguros).

## Tecnologías utilizadas

* **Frontend:** React.js, Tailwind CSS.
* **Backend:** Node.js, Express.
* **Base de Datos:** MySQL (ejecutándose en Docker).
* **Iconografía:** FontAwesome.

## Instalación y Configuración

### 1. Requisitos Previos
* [Node.js](https://nodejs.org/) (v18+)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/)
* [Git](https://git-scm.com/)

### 2. Configuración de la Base de Datos
Levanta el contenedor de MySQL utilizando Docker Compose:
```bash
docker-compose up -d
```

### 🗄️ Inicialización de la Base de Datos

Una vez levantados los contenedores, debes ejecutar el script de SQL para crear las tablas e insertar los datos iniciales. Ejecuta el siguiente comando en tu terminal (**PowerShell**):

```powershell
Get-Content init/init.sql | docker exec -i mysql_reservas mysql -u root -proot proyecto_reservas
```

### 3. Configuración del Backend
```
cd back
npm install
npm run dev
```

### 4. Configuración del Frontend
```
cd front
npm install
npm run dev
```

## Funcionalidades Actuales
Dashboard Administrativo: Resumen dinámico de vehículos totales, reservas aprobadas y alertas de documentos pendientes.
Sidebar Interactivo: Navegación colapsable e integración de iconos personalizados.
Gestión de Datos: Arquitectura CRUD de reservas, vehículos y usuarios.
Sistema de roles (Admin, Empleado, Supervisor).
Alerts mejorados. Modo oscuro. Desplegables modificados.

## Autor
Rubén Maderas - rubenmaderas-art
