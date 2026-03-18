-- Script para optimizar la tabla audit_logs con índices
-- Ejecutar este script una sola vez para mejorar el rendimiento de las consultas

USE `proyecto_reservas`;

-- Índice para búsquedas por usuario
ALTER TABLE audit_logs ADD INDEX idx_users_id (users_id);

-- Índice para búsquedas por fecha (crucial para reportes de período)
ALTER TABLE audit_logs ADD INDEX idx_fecha (fecha);

-- Índice para búsquedas por tipo de acción
ALTER TABLE audit_logs ADD INDEX idx_accion (accion);

-- Índice para búsquedas por tabla afectada
ALTER TABLE audit_logs ADD INDEX idx_tabla_afectada (tabla_afectada);

-- Índice compuesto para búsquedas comunes (usuario + fecha)
ALTER TABLE audit_logs ADD INDEX idx_usuario_fecha (users_id, fecha);

-- Índice compuesto para historial de registros (tabla + ID)
ALTER TABLE audit_logs ADD INDEX idx_tabla_registro (tabla_afectada, registro_id);

-- Índice compuesto para filtros comunes
ALTER TABLE audit_logs ADD INDEX idx_accion_tabla_fecha (accion, tabla_afectada, fecha);

-- Ver los índices que se han creado
SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = 'proyecto_reservas' 
AND TABLE_NAME = 'audit_logs'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- Analizar la tabla para optimizar
ANALYZE TABLE audit_logs;
