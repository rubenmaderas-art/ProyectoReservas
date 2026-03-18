const express = require('express');
const auditController = require('../controllers/auditController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

/**
 * GET /api/audit/logs - Obtiene todos los registros de auditoría con paginación
 * Query params: page, limit, userId, action, table, startDate, endDate
 */
router.get('/logs', auditController.getAllAuditLogs);

/**
 * GET /api/audit/statistics - Obtiene estadísticas globales de auditoría
 */
router.get('/statistics', auditController.getAuditStatistics);

/**
 * GET /api/audit/user-summary - Obtiene resumen de acciones por usuario
 * Query params: userId (opcional)
 */
router.get('/user-summary', auditController.getUserActionSummary);

/**
 * GET /api/audit/table-summary - Obtiene resumen de acciones por tabla
 * Query params: table (opcional)
 */
router.get('/table-summary', auditController.getTableActionSummary);

/**
 * GET /api/audit/record-history - Obtiene historial de un registro específico
 * Query params: table (requerido), recordId (requerido)
 */
router.get('/record-history', auditController.getRecordHistory);

/**
 * GET /api/audit/recent - Obtiene acciones recientes
 * Query params: hours (default 24), limit (default 50)
 */
router.get('/recent', auditController.getRecentActions);

/**
 * GET /api/audit/export - Exporta registros de auditoría como JSON
 * Query params: startDate, endDate, action, table
 */
router.get('/export', auditController.exportAuditLogs);

/**
 * POST /api/audit/clean - Limpia registros antiguos (solo admin)
 * Body: { daysOld: 90 }
 */
router.post('/clean', auditController.cleanOldAuditLogs);

module.exports = router;
