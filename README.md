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
