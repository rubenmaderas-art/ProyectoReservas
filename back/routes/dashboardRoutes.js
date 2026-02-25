const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
// Aquí podremos añadir un middleware de verificarToken para proteger esta ruta si queremos que solo usuarios autenticados puedan acceder a las estadísticas
// const verifyToken = require('../middleware/authMiddleware');

// rutas necesarias para el dashboard
// Estadisticas (numeros)
router.get('/stats', dashboardController.getStats);

// Rutas de reservas
router.get('/reservations', dashboardController.getRecentReservations);
router.post('/reservations', dashboardController.createReservation);
router.put('/reservations/:id', dashboardController.updateReservation);
router.delete('/reservations/:id', dashboardController.deleteReservation);

// Rutas de vehículos
router.get('/vehicles', dashboardController.getVehicles);
router.post('/vehicles', dashboardController.createVehicle);
router.put('/vehicles/:id', dashboardController.updateVehicle);
router.delete('/vehicles/:id', dashboardController.deleteVehicle);

// Rutas de usuarios
router.get('/users', dashboardController.getUsers);
router.post('/users', dashboardController.createUser);
router.put('/users/:id', dashboardController.updateUser);
router.delete('/users/:id', dashboardController.deleteUser);

module.exports = router;