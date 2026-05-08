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
(11, 'gestor', 'gestor123', 'gestor'),
(12, 'gestor2', 'gestor123', 'gestor');

INSERT INTO vehicles (id, license_plate, model, status, kilometers) VALUES
(1, '1234BBC', 'Toyota Corolla Hybrid', 'disponible', 15200),
(2, '5678DFB', 'Renault Kangoo Z.E.', 'disponible', 45200),
(3, '9012GHJ', 'Ford Transit Custom', 'disponible', 89000),
(4, '3456JKL', 'Seat Leon FR', 'disponible', 12000),
(5, '7890MNP', 'Volkswagen Golf VIII', 'disponible', 65400),
(6, '9876XYZ', 'Dacia Sandero', 'disponible', 15200),
(7, '6789TVW', 'Peugeot 3008 GT', 'disponible', 5000),
(8, '0123WXY', 'Hyundai i30 N-Line', 'disponible', 21000),
(9, '4567BBB', 'Mercedes Sprinter XL', 'disponible', 110000),
(10, '8901CCC', 'Fiat Fiorino Cargo', 'disponible', 72000);

INSERT INTO documents (vehicle_id, original_name, type, expiration_date) VALUES 
(1, 'itv_corolla_2024.pdf', 'itv', '2026-12-01'),
(2, 'ficha_tecnica_kangoo.pdf', 'ficha-tecnica', '2030-01-01'),
(3, 'itv_transit_vencida.pdf', 'itv', '2028-01-15'),
(4, 'itv_leon_2025.pdf', 'itv', '2027-10-10'),
(5, 'seguro_ax_golf.pdf', 'seguro', '2028-11-30'),
(7, 'itv_3008_nueva.pdf', 'itv', '2028-05-20'),
(8, 'seguro_reale_i30.pdf', 'seguro', '2028-09-12'),
(9, 'itv_sprinter_2024.pdf', 'itv', '2027-08-22'),
(10, 'itv_fiorino_2025.pdf', 'itv', '2026-03-05'),
/*Partes de taller*/
(1, 'revision_15k_corolla.pdf', 'parte-taller', '2027-12-31'),
(2, 'revision_kangoo.pdf', 'parte-taller', '2027-12-31'),
(3, 'revision_transit.pdf', 'parte-taller', '2027-12-31'),
(4, 'revision_leon.pdf', 'parte-taller', '2027-12-31'),
(5, 'revision_golf.pdf', 'parte-taller', '2027-12-31'),
(7, 'revision_3008.pdf', 'parte-taller', '2027-12-31'),
(8, 'revision_i30.pdf', 'parte-taller', '2027-12-31'),
(9, 'revision_sprinter.pdf', 'parte-taller', '2027-12-31'),
(10, 'revision_fiorino.pdf', 'parte-taller', '2027-12-31');
