INSERT INTO users (id, username, password, role) VALUES
(1, 'admin', 'admin123', 'admin'),
(3, 'empleado', 'empleado123', 'empleado'),
(4, 'Ruben', 'ruben123', 'supervisor'),
(5, 'supervisor', 'supervisor123', 'supervisor'),
(6, 'alba', 'alba123', 'supervisor'),
(7, 'carlos', 'carlos123', 'empleado'),
(8, 'manolo', 'manolo123', 'empleado'),
(9, 'lucas', 'lucas123', 'supervisor'),
(10, 'marcos', 'marcos123', 'empleado'),
(11, 'gestor1', 'gestor123', 'gestor'),
(12, 'gestor2', 'gestor123', 'gestor');

INSERT INTO vehicles (id, license_plate, model, status, kilometers) VALUES
(1, '1234 BBC', 'Toyota Corolla', 'disponible', 15000),
(2, '5678 DFB', 'Renault Kangoo', 'disponible', 45200),
(3, '9012 GHJ', 'Ford Transit', 'disponible', 89000),
(4, '3456 JKL', 'Seat Leon', 'disponible', 12000),
(5, '7890 MNP', 'Volkswagen Golf', 'disponible', 65400),
(7, '6789 TVW', 'Peugeot 3008', 'disponible', 5000),
(8, '0123 WXY', 'Hyundai i30', 'disponible', 21000),
(9, '4567 BBB', 'Mercedes Sprinter', 'disponible', 110000),
(10, '8901 CCC', 'Fiat Fiorino', 'disponible', 72000);

INSERT INTO documents (vehicle_id, original_name, type, expiration_date, file_path) VALUES 
(1, 'itv_toyota.pdf', 'itv', '2020-12-01', 'uploads/docs/toyota-itv.pdf'),
(1, 'parte_taller_toyota.pdf', 'parte-taller', '2025-01-01', 'uploads/docs/toyota-parte.pdf'),
(2, 'seguro_kangoo.pdf', 'seguro', '2027-05-20', 'uploads/docs/kangoo-seg.pdf'),
(2, 'parte_taller_kangoo.pdf', 'parte-taller', '2024-11-30', 'uploads/docs/kangoo-parte.pdf'),
(3, 'itv_transit.pdf', 'itv', '2022-01-15', 'uploads/docs/transit-itv.pdf'),
(3, 'parte_taller_transit.pdf', 'parte-taller', '2028-01-01', 'uploads/docs/transit-parte.pdf'),
(4, 'ficha_leon.pdf', 'ficha-tecnica', '2028-01-10', 'uploads/docs/leon-fic.pdf'),
(4, 'parte_taller_leon.pdf', 'parte-taller', '2029-01-01', 'uploads/docs/leon-parte.pdf'),
(5, 'seguro_golf.pdf', 'seguro', '2026-11-30', 'uploads/docs/golf-seg.pdf'),
(5, 'parte_taller_golf.pdf', 'parte-taller', '2029-01-01', 'uploads/docs/golf-parte.pdf'),
(6, 'itv_berlingo.pdf', 'itv', '2026-08-22', 'uploads/docs/berlingo-itv.pdf'),
(6, 'parte_taller_berlingo.pdf', 'parte-taller', '2028-01-01', 'uploads/docs/berlingo-parte.pdf'),
(7, 'seguro_3008.pdf', 'seguro', '2020-10-10', 'uploads/docs/3008-seg.pdf'),
(7, 'parte_taller_3008.pdf', 'parte-taller', '2025-01-01', 'uploads/docs/3008-parte.pdf'),
(8, 'itv_i30.pdf', 'itv', '2024-12-14', 'uploads/docs/i30-itv.pdf'),
(8, 'parte_taller_i30.pdf', 'parte-taller', '2027-01-01', 'uploads/docs/i30-parte.pdf'),
(9, 'permiso_sprinter.pdf', 'permiso-circulacion', '2030-01-01', 'uploads/docs/sprinter-per.pdf'),
(9, 'parte_taller_sprinter.pdf', 'parte-taller', '2028-01-01', 'uploads/docs/sprinter-parte.pdf'),
(10, 'parte_taller_fiorino.pdf', 'parte-taller', '2026-12-31', 'uploads/docs/fiorino-parte.pdf');
