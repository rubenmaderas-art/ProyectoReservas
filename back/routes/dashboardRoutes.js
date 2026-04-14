const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auditController = require('../controllers/auditController');
const { verifyToken, checkRole, injectCentreFilter } = require('../middleware/authMiddleware');

// TODAS las rutas de este router requieren token válido y roles específicos según la ruta.
router.use(verifyToken);
router.use(injectCentreFilter);

// Centros disponibles
router.get('/centres', dashboardController.getCentres);

// Estadisticas (Solo Admin y Supervisor)
router.get('/stats', checkRole(['admin', 'supervisor']), dashboardController.getStats);

// Rutas de reservas (Todos los roles autenticados)
router.get('/reservations', dashboardController.getRecentReservations);
router.post('/reservations', dashboardController.createReservation);
router.put('/reservations/:id', dashboardController.updateReservation);
router.delete('/reservations/:id', dashboardController.deleteReservation);

// Rutas de vehículos
router.get('/vehicles', checkRole(['admin', 'supervisor', 'empleado', 'gestor']), dashboardController.getVehicles);
router.post('/vehicles', checkRole(['admin', 'supervisor']), dashboardController.createVehicle);
router.put('/vehicles/:id', checkRole(['admin', 'supervisor']), dashboardController.updateVehicle);
router.delete('/vehicles/:id', checkRole(['admin', 'supervisor']), dashboardController.deleteVehicle);

// Rutas de documentación de vehículos
router.get('/vehicles/:id/documents', checkRole(['admin', 'supervisor', 'gestor']), dashboardController.getVehicleDocuments);
router.post('/vehicles/:id/documents', checkRole(['admin', 'supervisor']), dashboardController.uploadVehicleDocument);
router.put('/documents/:id', checkRole(['admin', 'supervisor']), dashboardController.updateVehicleDocument);
router.delete('/documents/:id', checkRole(['admin', 'supervisor']), dashboardController.deleteVehicleDocument);

// Rutas de usuarios
router.get('/users', checkRole(['admin', 'supervisor']), dashboardController.getUsers);
router.post('/users', checkRole(['admin']), dashboardController.createUser);
router.put('/users/:id', checkRole(['admin']), dashboardController.updateUser);
router.delete('/users/:id', checkRole(['admin']), dashboardController.deleteUser);
router.post('/delete-user/:id', checkRole(['admin']), dashboardController.deleteUser);

// Ruta de validaciones
router.get('/validations', dashboardController.getValidations);
router.put('/validations/:id', checkRole(['admin', 'supervisor']), dashboardController.updateValidation);
router.delete('/validations/:id', checkRole(['admin', 'supervisor']), dashboardController.deleteValidation);

// Rutas de auditoría
router.get('/logs', auditController.getAllAuditLogs);
router.get('/statistics', auditController.getAuditStatistics);
router.get('/user-summary', auditController.getUserActionSummary);
router.get('/table-summary', auditController.getTableActionSummary);
router.get('/record-history', auditController.getRecordHistory);
router.get('/recent', auditController.getRecentActions);
router.get('/export', auditController.exportAuditLogs);
router.post('/clean', auditController.cleanOldAuditLogs);

module.exports = router;