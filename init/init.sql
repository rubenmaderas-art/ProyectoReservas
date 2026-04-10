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
(10, 'parte_taller_fiorino.pdf', 'parte-taller', '2026-12-31', 'uploads/docs/fiorino-parte.pdf');
