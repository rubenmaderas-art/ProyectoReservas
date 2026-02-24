const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
// Aquí podremos añadir un middleware de verificarToken para proteger esta ruta si queremos que solo usuarios autenticados puedan acceder a las estadísticas
// const verifyToken = require('../middleware/authMiddleware');

// rutas necesarias para el dashboard
// Estadisticas (numeros)
router.get('/stats', dashboardController.getStats);

// Tabla de últimas reservas
router.get('/reservations', dashboardController.getRecentReservations);

// Tabla de vehículos
router.get('/vehicles', dashboardController.getVehicles);

// Tabla de usuarios
router.get('/users', dashboardController.getUsers);

module.exports = router;