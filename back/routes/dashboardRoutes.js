const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const mailingController = require('../controllers/mailingController');
const auditController = require('../controllers/auditController');
const { verifyToken, checkRole, injectCentreFilter } = require('../middleware/authMiddleware');

// TODAS las rutas de este router requieren token válido y roles específicos según la ruta.
router.use(verifyToken);
router.use(injectCentreFilter);

// Centros disponibles
router.get('/centres', dashboardController.getCentres);
router.get('/centres/:id/details', checkRole(['admin']), dashboardController.getCentreDetails);
router.post('/centres', checkRole(['admin']), dashboardController.createCentre);
router.put('/centres/:id', checkRole(['admin']), dashboardController.updateCentre);
router.delete('/centres/:id', checkRole(['admin']), dashboardController.deleteCentre);

// Estadisticas (Solo Admin y Supervisor)
router.get('/stats', checkRole(['admin', 'supervisor']), dashboardController.getStats);

// Rutas de reservas (Todos los roles autenticados)
router.get('/reservations', dashboardController.getRecentReservations);
router.post('/reservations', dashboardController.createReservation);
router.put('/reservations/:id', dashboardController.updateReservation);
router.delete('/reservations/:id', dashboardController.deleteReservation);
router.post('/mailing/test', checkRole(['admin']), mailingController.sendTestMail);

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
router.get('/logs', checkRole(['admin']), auditController.getAllAuditLogs);
router.get('/statistics', checkRole(['admin']), auditController.getAuditStatistics);
router.get('/user-summary', checkRole(['admin']), auditController.getUserActionSummary);
router.get('/table-summary', checkRole(['admin']), auditController.getTableActionSummary);
router.get('/record-history', checkRole(['admin']), auditController.getRecordHistory);
router.get('/recent', checkRole(['admin']), auditController.getRecentActions);
router.get('/export', checkRole(['admin']), auditController.exportAuditLogs);
router.post('/clean', checkRole(['admin']), auditController.cleanOldAuditLogs);

module.exports = router;
