const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { verifyToken, checkRole, injectCentreFilter } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(injectCentreFilter);
router.use(checkRole(['admin']));

router.get('/logs', auditController.getAllAuditLogs);
router.get('/statistics', auditController.getAuditStatistics);
router.get('/user-summary', auditController.getUserActionSummary);
router.get('/table-summary', auditController.getTableActionSummary);
router.get('/record-history', auditController.getRecordHistory);
router.get('/recent', auditController.getRecentActions);
router.get('/export', auditController.exportAuditLogs);
router.post('/clean', auditController.cleanOldAuditLogs);

module.exports = router;
