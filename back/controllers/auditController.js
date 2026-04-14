const db = require('../config/db');
const auditLogger = require('../utils/auditLogger');

/**
 * Obtiene todos los registros de auditoría con paginación y filtros avanzados
 */
exports.getAllAuditLogs = async (req, res) => {
    try {
        const { page = 1, limit = 50, userId, action, table, startDate, endDate } = req.query;
        const offset = (page - 1) * limit;

        // Construir query dinámica con filtros
        let whereConditions = [];
        let params = [];

        if (userId) {
            whereConditions.push('al.users_id = ?');
            params.push(userId);
        }

        if (action) {
            whereConditions.push('al.accion = ?');
            params.push(action);
        }

        if (table) {
            whereConditions.push('al.tabla_afectada = ?');
            params.push(table);
        }

        if (startDate) {
            whereConditions.push('al.fecha >= ?');
            params.push(startDate);
        }

        if (endDate) {
            whereConditions.push('al.fecha <= ?');
            params.push(endDate);
        }

        if (req.centreIds !== null) {
            if (req.centreIds.length === 0) {
                return res.json({ success: true, data: [], pagination: { currentPage: 1, totalPages: 0, totalRecords: 0, recordsPerPage: parseInt(limit) } });
            }
            const inClause = req.centreIds.map(() => '?').join(',');
            // Supervised users can only see logs from users inside their centers
            whereConditions.push(`al.users_id IN (SELECT user_id FROM user_centres WHERE centre_id IN (${inClause}))`);
            params.push(...req.centreIds);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        // Obtener total de registros
        const countQuery = `SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`;
        const [countResult] = await db.query(countQuery, params);
        const total = countResult?.[0]?.total || 0;
        const totalPages = Math.ceil(total / parseInt(limit));

        // Obtener registros paginados
        const logsQuery = `SELECT 
            al.id_auditoria,
            al.users_id,
            u.username,
            al.rol_momento,
            al.fecha,
            al.accion,
            al.tabla_afectada,
            al.registro_id,
            al.detalles_admin
        FROM audit_logs al
        LEFT JOIN users u ON al.users_id = u.id
        ${whereClause}
        ORDER BY al.fecha DESC
        LIMIT ${parseInt(limit)} OFFSET ${offset}`;
        
        console.log('Logs query:', logsQuery);
        console.log('Logs params:', params);
        const [logs] = await db.query(logsQuery, params);

        const parseDetails = (raw) => {
            if (raw === null || raw === undefined) return null;
            if (typeof raw === 'object') return raw;

            try {
                return JSON.parse(raw);
            } catch {
                return raw;
            }
        };

        const normalizedLogs = (logs || []).map((entry) => ({
            ...entry,
            detalles_admin: parseDetails(entry.detalles_admin)
        }));

        res.json({
            success: true,
            data: normalizedLogs,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalRecords: total,
                recordsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error completo:', error);
        res.status(500).json({ error: 'Error al obtener registros de auditoría', details: error.message });
    }
};

/**
 * Obtiene un resumen de acciones por usuario
 */
exports.getUserActionSummary = async (req, res) => {
    try {
        const { userId } = req.query;

        let query = `
            SELECT 
                u.id,
                u.username,
                u.role,
                COUNT(*) as total_acciones,
                SUM(CASE WHEN al.accion = 'CREATE' THEN 1 ELSE 0 END) as creaciones,
                SUM(CASE WHEN al.accion = 'UPDATE' THEN 1 ELSE 0 END) as actualizaciones,
                SUM(CASE WHEN al.accion = 'DELETE' THEN 1 ELSE 0 END) as eliminaciones,
                SUM(CASE WHEN al.accion = 'READ' THEN 1 ELSE 0 END) as lecturas,
                MAX(al.fecha) as ultima_accion
            FROM users u
            LEFT JOIN audit_logs al ON u.id = al.users_id
            WHERE u.deleted_at IS NULL
        `;

        const params = [];
        let centreClauses = '';

        if (req.centreIds !== null) {
            if (req.centreIds.length === 0) return res.json({ success: true, data: [] });
            const inClause = req.centreIds.map(() => '?').join(',');
            centreClauses = ` AND u.id IN (SELECT user_id FROM user_centres WHERE centre_id IN (${inClause}))`;
            params.push(...req.centreIds);
        }

        query += centreClauses;

        if (userId) {
            query += ' AND u.id = ?';
            params.push(userId);
        }

        query += ' GROUP BY u.id, u.username, u.role ORDER BY total_acciones DESC';

        const [results] = await db.query(query, params);

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error al obtener resumen de acciones:', error);
        res.status(500).json({ error: 'Error al obtener resumen de acciones' });
    }
};

/**
 * Obtiene un resumen de acciones por tabla
 */
exports.getTableActionSummary = async (req, res) => {
    try {
        const { table } = req.query;

        let query = `
            SELECT 
                tabla_afectada,
                accion,
                COUNT(*) as cantidad,
                COUNT(DISTINCT users_id) as usuarios_unicos,
                MIN(fecha) as primera_accion,
                MAX(fecha) as ultima_accion
            FROM audit_logs
        `;

        const params = [];

        if (table) {
            query += ' WHERE tabla_afectada = ?';
            params.push(table);
        }

        query += ' GROUP BY tabla_afectada, accion ORDER BY tabla_afectada, accion';

        const [results] = await db.query(query, params);

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error al obtener resumen por tabla:', error);
        res.status(500).json({ error: 'Error al obtener resumen por tabla' });
    }
};

/**
 * Obtiene el historial de acciones de un registro específico
 */
exports.getRecordHistory = async (req, res) => {
    try {
        const { table, recordId } = req.query;

        if (!table || !recordId) {
            return res.status(400).json({ error: 'Tabla y ID de registro son requeridos' });
        }

        const [history] = await db.query(
            `SELECT 
                al.id_auditoria,
                al.users_id,
                u.username,
                al.rol_momento,
                al.fecha,
                al.accion,
                al.tabla_afectada,
                al.detalles_admin
            FROM audit_logs al
            LEFT JOIN users u ON al.users_id = u.id
            WHERE al.tabla_afectada = ? AND al.registro_id = ?
            ORDER BY al.fecha DESC`,
            [table, recordId]
        );

        res.json({
            success: true,
            table,
            recordId,
            history: history
        });
    } catch (error) {
        console.error('Error al obtener historial de registro:', error);
        res.status(500).json({ error: 'Error al obtener historial de registro' });
    }
};

/**
 * Obtiene acciones recientes (últimas N horas)
 */
exports.getRecentActions = async (req, res) => {
    try {
        const { hours = 24, limit = 50 } = req.query;

        let whereClause = `WHERE al.fecha >= DATE_SUB(NOW(), INTERVAL ? HOUR)`;
        let params = [hours];

        if (req.centreIds !== null) {
            if (req.centreIds.length === 0) return res.json({ success: true, period: `Últimas ${hours} horas`, actions: [] });
            const inClause = req.centreIds.map(() => '?').join(',');
            whereClause += ` AND al.users_id IN (SELECT user_id FROM user_centres WHERE centre_id IN (${inClause}))`;
            params.push(...req.centreIds);
        }

        params.push(limit);

        const [actions] = await db.query(
            `SELECT 
                al.id_auditoria,
                al.users_id,
                u.username,
                al.rol_momento,
                al.fecha,
                al.accion,
                al.tabla_afectada,
                al.registro_id,
                al.detalles_admin
            FROM audit_logs al
            LEFT JOIN users u ON al.users_id = u.id
            ${whereClause}
            ORDER BY al.fecha DESC
            LIMIT ?`,
            params
        );

        res.json({
            success: true,
            period: `Últimas ${hours} horas`,
            actions
        });
    } catch (error) {
        console.error('Error al obtener acciones recientes:', error);
        res.status(500).json({ error: 'Error al obtener acciones recientes' });
    }
};

/**
 * Obtiene estadísticas globales de auditoría
 */
exports.getAuditStatistics = async (req, res) => {
    try {
        // Total de registros
        const [totalCount] = await db.query('SELECT COUNT(*) as total FROM audit_logs');
        
        // Acciones por tipo
        const [actionCount] = await db.query(`
            SELECT accion, COUNT(*) as cantidad
            FROM audit_logs
            GROUP BY accion
        `);

        // Tablas más auditadas
        const [tableCount] = await db.query(`
            SELECT tabla_afectada, COUNT(*) as cantidad
            FROM audit_logs
            GROUP BY tabla_afectada
            ORDER BY cantidad DESC
            LIMIT 10
        `);

        // Usuarios más activos
        const [userActivity] = await db.query(`
            SELECT 
                u.id,
                u.username,
                COUNT(*) as total_acciones
            FROM audit_logs al
            LEFT JOIN users u ON al.users_id = u.id
            GROUP BY u.id, u.username
            ORDER BY total_acciones DESC
            LIMIT 10
        `);

        // Rango de fechas de auditoría
        const [dateRange] = await db.query(`
            SELECT 
                MIN(fecha) as fecha_inicio,
                MAX(fecha) as fecha_fin
            FROM audit_logs
        `);

        res.json({
            success: true,
            estadisticas: {
                total_registros: totalCount[0].total,
                acciones_por_tipo: actionCount,
                tablas_mas_auditadas: tableCount,
                usuarios_mas_activos: userActivity,
                rango_fechas: dateRange[0]
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};

/**
 * Exporta registros de auditoría en formato JSON
 */
exports.exportAuditLogs = async (req, res) => {
    try {
        const { startDate, endDate, action, table } = req.query;
        
        let query = 'SELECT * FROM audit_logs WHERE 1=1';
        const params = [];

        if (startDate) {
            query += ' AND fecha >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND fecha <= ?';
            params.push(endDate);
        }

        if (action) {
            query += ' AND accion = ?';
            params.push(action);
        }

        if (table) {
            query += ' AND tabla_afectada = ?';
            params.push(table);
        }

        query += ' ORDER BY fecha DESC';

        const [logs] = await db.query(query, params);

        // Enviar como JSON descargable
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.json');
        res.json({
            exportDate: new Date(),
            filters: { startDate, endDate, action, table },
            totalRecords: logs.length,
            logs
        });
    } catch (error) {
        console.error('Error al exportar registros de auditoría:', error);
        res.status(500).json({ error: 'Error al exportar registros de auditoría' });
    }
};

/**
 * Limpia registros de auditoría antiguos (más de X días)
 * Solo disponible para administradores
 */
exports.cleanOldAuditLogs = async (req, res) => {
    try {
        // Verificar que sea admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'No tienes permiso para limpiar registros de auditoría' });
        }

        const { daysOld = 90 } = req.body;

        const [result] = await db.query(
            'DELETE FROM audit_logs WHERE fecha < DATE_SUB(NOW(), INTERVAL ? DAY)',
            [daysOld]
        );

        // Registrar esta acción también!
        await auditLogger.logAction(req.user.id, 'DELETE', 'audit_logs', null, req.user.role, {
            action: 'Limpieza de registros antiguos',
            days_old: daysOld,
            records_deleted: result.affectedRows
        });

        res.json({
            success: true,
            message: 'Registros de auditoría antiguos eliminados',
            recordsDeleted: result.affectedRows,
            daysOld
        });
    } catch (error) {
        console.error('Error al limpiar registros de auditoría:', error);
        res.status(500).json({ error: 'Error al limpiar registros de auditoría' });
    }
};
