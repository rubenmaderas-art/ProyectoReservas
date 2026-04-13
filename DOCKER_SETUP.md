# Setup con Docker - Desarrollo Local

## 📦 Servicios Docker

Solo los servicios esenciales:

1. **MySQL** (`db`) - Base de datos
2. **PhpMyAdmin** (`phpmyadmin`) - Gestor visual de BD
3. **Sincronización PHP** (`sync_centros`) - Script automático cada noche (03:00)

**Backend (Node.js) y Frontend (React)** se ejecutan localmente en tu máquina.

## 🚀 Iniciar Docker

```bash
# En la raíz del proyecto
docker-compose up -d

# Ver que están corriendo
docker-compose ps
```

## 🛑 Detener Docker

```bash
# Detener solo
docker-compose stop

# Detener y eliminar contenedores
docker-compose down

# Detener, eliminar y limpiar datos (reinicia BD)
docker-compose down -v
```

## 🌐 Acceso a Servicios

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| **PhpMyAdmin** | http://localhost:8080 | Usuario: `root` / Contraseña: `root` |
| **MySQL** | localhost:3306 | Usuario: `root` / Contraseña: `root` |
| **Backend (local)** | http://localhost:4000 | npm run dev |
| **Frontend (local)** | http://localhost:5173 | npm run dev |

## 🔄 Sincronización Automática

El contenedor `sync_centros` ejecuta automáticamente cada noche a las **03:00 AM**:

```
03:00 (cada noche) →
  Ejecuta script PHP →
    Se conecta a UnificaPP →
      Extrae centros y sedes →
        Inserta en tabla "centres"
```

**Logs de sincronización:**
```bash
# Ver logs en tiempo real
docker-compose logs -f sync_centros

# Ver archivo de log
cat back/logs/sync_centros.log
cat back/logs/cron_sync.log
```

### Cambiar hora de sincronización

Edita `back/Dockerfile` línea con el cron:

```dockerfile
RUN echo "0 3 * * * cd /app && php scripts/sync_centros.php >> /app/logs/cron_sync.log 2>&1" > /etc/cron.d/sync-centros
```

Cambia `0 3` por la hora que quieras:
- `0 2` = 02:00 AM
- `30 3` = 03:30 AM
- `0 0` = 00:00 (medianoche)

Luego reconstruye:
```bash
docker-compose up -d --build sync_centros
```

## 💻 Ejecutar Backend Localmente

```bash
# Terminal 1 - Backend
cd back
npm install
npm run dev

# Terminal 2 - Frontend
cd front
npm install
npm run dev
```

Esto arranca:
- Backend: http://localhost:4000
- Frontend: http://localhost:5173

## 🐛 Troubleshooting

### Problema: "Port 3306 already in use"

MySQL ya está corriendo. Opciones:

```bash
# Cambiar puerto en docker-compose.yml línea 20
ports:
  - "3307:3306"  # Cambiar a 3307

# Luego en tu .env:
DB_HOST=localhost
```

O detener MySQL que está en tu máquina:
```bash
# Windows
net stop MySQL80

# Linux
sudo systemctl stop mysql
```

### Problema: PhpMyAdmin no carga

Espera 10 segundos a que MySQL arranque completamente. Los logs mostrarán cuando esté listo:

```bash
docker-compose logs db
```

### Problema: No puedo conectar desde Node.js a MySQL

Asegúrate que en `.env` (para desarrollo local):
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=proyecto_reservas
```

(No uses `db` como host - eso es solo dentro de Docker)

## 📊 Ver Logs

```bash
# Todo
docker-compose logs -f

# Solo MySQL
docker-compose logs -f db

# Solo PhpMyAdmin
docker-compose logs -f phpmyadmin

# Solo sincronización
docker-compose logs -f sync_centros
```

## 🔐 Variables de Entorno

En `docker-compose.yml` están preconfiguradas para desarrollo:

```
MYSQL_DATABASE: proyecto_reservas
MYSQL_ROOT_PASSWORD: root
```

Para producción, cambia estas credenciales.

## ✨ Comandos Útiles

```bash
# Ver estado
docker-compose ps

# Ver espacio
docker system df

# Limpieza completa
docker system prune

# Reconstruir imagen
docker-compose up -d --build sync_centros

# Ejecutar sincronización manual
docker-compose exec sync_centros php scripts/sync_centros.php

# Acceder a MySQL desde terminal
docker exec -it mysql_reservas mysql -uroot -proot proyecto_reservas
```

## 📝 Resumen

✅ **¿Qué está en Docker?**
- MySQL (BD)
- PhpMyAdmin (Gestor BD)
- Script de sincronización PHP (cron automático)

❌ **¿Qué NO está en Docker?**
- Backend Node.js (ejecuta localmente con `npm run dev`)
- Frontend React (ejecuta localmente con `npm run dev`)

**Flujo de desarrollo:**
1. `docker-compose up -d` (inicia MySQL, PhpMyAdmin, Cron)
2. `cd back && npm run dev` (arranca Backend en terminal)
3. `cd front && npm run dev` (arranca Frontend en terminal)
4. Desarrolla localmente con hot-reload
5. MySQL en Docker sirve los datos
6. Cada noche a las 03:00, el script de sincronización se ejecuta automáticamente

---

Mucho más simple y eficiente para desarrollo. ✅

