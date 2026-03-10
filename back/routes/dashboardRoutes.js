const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// TODAS las rutas de este router requieren token válido y roles específicos según la ruta.
router.use(verifyToken);

// Estadisticas (Solo Admin y Supervisor)
router.get('/stats', checkRole(['admin', 'supervisor']), dashboardController.getStats);

// Rutas de validaciones (Solo Admin y Supervisor)
router.get('/validations', checkRole(['admin', 'supervisor']), dashboardController.getValidations);
router.post('/validations', checkRole(['admin', 'supervisor']), dashboardController.createValidation);
router.put('/validations/:id', checkRole(['admin', 'supervisor']), dashboardController.updateValidation);
router.delete('/validations/:id', checkRole(['admin', 'supervisor']), dashboardController.deleteValidation);

// Rutas de reservas (Todos los roles autenticados)
router.get('/reservations', dashboardController.getRecentReservations);
router.post('/reservations', dashboardController.createReservation);
router.put('/reservations/:id', dashboardController.updateReservation);
router.delete('/reservations/:id', dashboardController.deleteReservation);

// Rutas de vehículos
router.get('/vehicles', checkRole(['admin', 'supervisor', 'empleado']), dashboardController.getVehicles);
router.post('/vehicles', checkRole(['admin', 'supervisor']), dashboardController.createVehicle);
router.put('/vehicles/:id', checkRole(['admin', 'supervisor']), dashboardController.updateVehicle);
router.delete('/vehicles/:id', checkRole(['admin', 'supervisor']), dashboardController.deleteVehicle);

// Rutas de documentación de vehículos
router.get('/vehicles/:id/documents', dashboardController.getVehicleDocuments);
router.post('/vehicles/:id/documents', checkRole(['admin', 'supervisor']), dashboardController.uploadVehicleDocument);
router.put('/documents/:id', checkRole(['admin', 'supervisor']), dashboardController.updateVehicleDocument);
router.delete('/documents/:id', checkRole(['admin', 'supervisor']), dashboardController.deleteVehicleDocument);

// Rutas de usuarios
router.get('/users', checkRole(['admin', 'supervisor']), dashboardController.getUsers);
router.post('/users', checkRole(['admin']), dashboardController.createUser);
router.put('/users/:id', checkRole(['admin']), dashboardController.updateUser);
router.delete('/users/:id', checkRole(['admin']), dashboardController.deleteUser);

module.exports = router;