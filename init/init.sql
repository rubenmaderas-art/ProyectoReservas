-- inicializar datos de todas las tablas:
INSERT INTO users (username, password, role) VALUES 
('admin', 'admin123', 'admin'),
('empleado1', 'empleado123', 'empleado'),
('supervisor1', 'supervisor123', 'supervisor');

INSERT INTO vehicles (license_plate, model, status, kilometers) VALUES 
('ABC123', 'Toyota Corolla', 'disponible', 50000),
('DEF456', 'Honda Civic', 'disponible', 30000),
('GHI789', 'Ford Focus', 'no-disponible', 40000),
('4888HBH', 'Peugeot 207', 'disponible','20000');

INSERT INTO reservations (user_id, vehicle_id, start_time, end_time, status) VALUES 
(2, 1, '2024-07-01 08:00:00', '2024-07-01 18:00:00', 'aprobada'),
(3, 2, '2024-07-02 09:00:00', '2024-07-02 17:00:00', 'pendiente');

INSERT INTO documents (vehicle_id, type, expiration_date, file_path) VALUES 
(1, 'ITV', '2025-01-01', '/path/to/itv_abc123.pdf'),
(1, 'Seguro', '2024-12-31', '/path/to/seguro_abc123.pdf'),
(2, 'ITV', '2025-02-01', '/path/to/itv_def456.pdf'),
(2, 'Seguro', '2024-11-30', '/path/to/seguro_def456.pdf');
