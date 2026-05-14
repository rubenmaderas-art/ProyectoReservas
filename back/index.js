process.env.TZ = 'Europe/Madrid';

require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const http = require('http');
const { createApp } = require('./app');
const { initializeSocket } = require('./utils/socketManager');
const { runBootstrapTasks } = require('./bootstrap');

const PORT = process.env.PORT || 4000;
const app = createApp();
const server = http.createServer(app);

initializeSocket(server);

runBootstrapTasks().catch((error) => {
  console.error('ERROR DE CONEXIÓN A LA DB:', error.message);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
