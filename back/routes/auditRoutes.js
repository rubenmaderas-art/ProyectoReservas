const express = require('express');
const auditController = require('../controllers/auditController');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.injectCentreFilter);
router.use(authMiddleware.checkRole(['admin']));
router.get('/logs', auditController.getAllAuditLogs);
router.get('/statistics', auditController.getAuditStatistics);
router.get('/user-summary', auditController.getUserActionSummary);
router.get('/table-summary', auditController.getTableActionSummary);
router.get('/record-history', auditController.getRecordHistory);
router.get('/recent', auditController.getRecentActions);
router.get('/export', auditController.exportAuditLogs);
router.post('/clean', auditController.cleanOldAuditLogs);
module.exports = router;
