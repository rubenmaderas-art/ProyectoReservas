const db = require('../config/db');

/**
 * Registra una acción de auditoría en la base de datos
 * @param {number} userId - ID del usuario que realiza la acción
 * @param {string} action - Tipo de acción (CREATE, READ, UPDATE, DELETE)
 * @param {string} affectedTable - Tabla afectada (users, vehicles, reservations, documents)
 * @param {number} recordId - ID del registro afectado
 * @param {string} userRole - Rol del usuario en el momento de la acción
 * @param {string} details - Detalles adicionales de la acción (JSON stringificado)
 */
exports.logAction = async (userId, action, affectedTable, recordId, userRole, details = null) => {
    try {
        const detailsJson = details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null;
        
        await db.query(
            `INSERT INTO audit_logs 
            (users_id, rol_momento, accion, tabla_afectada, registro_id, detalles_admin) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, userRole, action, affectedTable, recordId, detailsJson]
        );
    } catch (error) {
        console.error('Error registrando acción de auditoría:', error);
        // No lanzamos el error para no afectar la operación principal
    }
};

/**
 * Obtiene los registros de auditoría con filtros opcionales
 */
exports.getAuditLogs = async (filters = {}) => {
    try {
        let query = `
            SELECT 
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
            WHERE 1=1
        `;
        
        const params = [];

        // Filtro por usuario
        if (filters.userId) {
            query += ' AND al.users_id = ?';
            params.push(filters.userId);
        }

        // Filtro por acción
        if (filters.action) {
            query += ' AND al.accion = ?';
            params.push(filters.action);
        }

        // Filtro por tabla
        if (filters.affectedTable) {
            query += ' AND al.tabla_afectada = ?';
            params.push(filters.affectedTable);
        }

        // Filtro por rango de fechas
        if (filters.startDate) {
            query += ' AND al.fecha >= ?';
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            query += ' AND al.fecha <= ?';
            params.push(filters.endDate);
        }

        // Ordenamiento y límite
        query += ' ORDER BY al.fecha DESC';
        
        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(filters.limit);
        }

        const [rows] = await db.query(query, params);
        return rows;
    } catch (error) {
        console.error('Error al obtener registros de auditoría:', error);
        throw error;
    }
};

/**
 * Obtiene un resumen de acciones por usuario
 */
exports.getActionsSummaryByUser = async (userId) => {
    try {
        const [rows] = await db.query(`
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
            WHERE u.id = ?
            GROUP BY u.id, u.username, u.role
        `, [userId]);
        
        return rows[0] || null;
    } catch (error) {
        console.error('Error al obtener resumen de acciones:', error);
        throw error;
    }
};

/**
 * Obtiene un resumen de acciones por tabla
 */
exports.getActionsSummaryByTable = async (tableName) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                tabla_afectada,
                accion,
                COUNT(*) as cantidad,
                COUNT(DISTINCT users_id) as usuarios_unicos
            FROM audit_logs
            WHERE tabla_afectada = ?
            GROUP BY tabla_afectada, accion
            ORDER BY accion
        `, [tableName]);
        
        return rows;
    } catch (error) {
        console.error('Error al obtener resumen por tabla:', error);
        throw error;
    }
};
