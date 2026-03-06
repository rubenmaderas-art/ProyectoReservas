-- inicializar datos de todas las tablas:
INSERT INTO users (username, password, role) VALUES
('admin', 'admin123', 'admin'),
('empleado_x', 'empleado123', 'empleado'),
('empleado1', 'empleado123', 'empleado'),
('Ruben', 'ruben123', 'supervisor'),
('supervisor1', 'supervisor123', 'supervisor');

INSERT INTO vehicles (license_plate, model, status, kilometers) VALUES 
('ABC123', 'Toyota Corolla', 'disponible', 50000),
('DEF456', 'Honda Civic', 'disponible', 30000),
('GHI789', 'Ford Focus', 'no-disponible', 40000),
('3874JUR', 'Porsche 911', 'disponible', 4000),
('4880HBH', 'Peugeot 207', 'disponible', 200000);

INSERT INTO reservations (user_id, vehicle_id, start_time, end_time, status) VALUES 
(5, 1, '2024-07-01 08:00:00', '2024-07-01 18:00:00', 'rechazada'),
(2, 3, '2024-06-01 08:00:00', '2024-09-01 18:00:00', 'aprobada'),
(4, 5, '2024-05-01 08:00:00', '2024-10-01 18:00:00', 'aprobada'),
(3, 2, '2024-07-02 09:00:00', '2024-07-02 17:00:00', 'pendiente');

