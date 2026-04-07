INSERT INTO users (username, password, role) VALUES
('admin', 'admin123', 'admin'),
('x', 'x123', 'empleado'),
('empleado', 'empleado123', 'empleado'),
('Ruben', 'ruben123', 'supervisor'),
('supervisor', 'supervisor123', 'supervisor'),
('alba', 'alba123', 'supervisor'),
('carlos', 'carlos123', 'empleado'),
('manolo', 'manolo123', 'empleado'),
('lucas', 'lucas123', 'supervisor'),
('marcos', 'marcos123', 'empleado');

INSERT INTO vehicles (license_plate, model, status, kilometers) VALUES
('1234ABC', 'Toyota Corolla', 'disponible', 15000),
('5678DEF', 'Renault Kangoo', 'disponible', 45200),
('9012GHI', 'Ford Transit', 'disponible', 89000),
('3456JKL', 'Seat Leon', 'disponible', 12000),
('7890MNP', 'Volkswagen Golf', 'disponible', 65400),
('2345QRS', 'Citroen Berlingo', 'disponible', 33100),
('6789TUV', 'Peugeot 3008', 'disponible', 5000),
('0123WXY', 'Hyundai i30', 'disponible', 21000),
('4567BBB', 'Mercedes Sprinter', 'disponible', 110000),
('8901CCC', 'Fiat Fiorino', 'disponible', 72000);

INSERT INTO reservations (user_id, vehicle_id, start_time, end_time, status) VALUES
(3, 1, '2026-03-01 08:00:00', '2026-03-20 18:00:00', 'finalizada');
/*
(4, 2, '2026-03-10 09:00:00', '2026-04-12 17:00:00', 'activa'),
(8, 4, '2026-02-20 10:00:00', '2026-04-21 10:00:00', 'finalizada'),
(9, 10, '2026-03-05 08:00:00', '2026-04-05 20:00:00', 'rechazada'),
(4, 7, '2026-03-02 11:00:00', '2026-04-02 14:00:00', 'finalizada'),
(5, 9, '2026-03-18 10:00:00', '2026-04-19 10:00:00', 'activa'),
(8, 5, '2026-02-15 08:00:00', '2026-02-15 12:00:00', 'finalizada');
*/

INSERT INTO documents (vehicle_id, original_name, type, expiration_date, file_path) VALUES 
(1, 'itv_toyota.pdf', 'itv', '2020-12-01', 'uploads/docs/toyota-itv.pdf'),
(2, 'seguro_kangoo.pdf', 'seguro', '2027-05-20', 'uploads/docs/kangoo-seg.pdf'),
(3, 'itv_transit.pdf', 'itv', '2022-01-15', 'uploads/docs/transit-itv.pdf'),
(4, 'ficha_leon.pdf', 'ficha-tecnica', '2028-01-10', 'uploads/docs/leon-fic.pdf'),
(5, 'seguro_golf.pdf', 'seguro', '2026-11-30', 'uploads/docs/golf-seg.pdf'),
(6, 'itv_berlingo.pdf', 'itv', '2026-08-22', 'uploads/docs/berlingo-itv.pdf'),
(7, 'seguro_3008.pdf', 'seguro', '2020-10-10', 'uploads/docs/3008-seg.pdf'),
(8, 'itv_i30.pdf', 'itv', '2024-12-14', 'uploads/docs/i30-itv.pdf'),
(9, 'permiso_sprinter.pdf', 'permiso-circulacion', '2030-01-01', 'uploads/docs/sprinter-per.pdf'),
(10, 'seguro_fiorino.pdf', 'seguro', '2026-12-31', 'uploads/docs/fiorino-seg.pdf');