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
(1, '1234 BBC', 'Toyota Corolla Hybrid', 'disponible', 15200),
(2, '5678 DFB', 'Renault Kangoo Z.E.', 'disponible', 45200),
(3, '9012 GHJ', 'Ford Transit Custom', 'disponible', 89000),
(4, '3456 JKL', 'Seat León FR', 'disponible', 12000),
(5, '7890 MNP', 'Volkswagen Golf VIII', 'disponible', 65400),
(7, '6789 TVW', 'Peugeot 3008 GT', 'disponible', 5000),
(8, '0123 WXY', 'Hyundai i30 N-Line', 'disponible', 21000),
(9, '4567 BBB', 'Mercedes Sprinter XL', 'disponible', 110000),
(10, '8901 CCC', 'Fiat Fiorino Cargo', 'disponible', 72000);

INSERT INTO documents (vehicle_id, original_name, type, expiration_date, file_path) VALUES 
(1, 'itv_corolla_2024.pdf', 'itv', '2024-12-01', 'uploads/docs/toyota-itv.pdf'),
(1, 'seguro_mapfre_toyota.pdf', 'seguro', '2025-06-15', 'uploads/docs/toyota-seg.pdf'),
(2, 'ficha_tecnica_kangoo.pdf', 'ficha-tecnica', '2030-01-01', 'uploads/docs/kangoo-fic.pdf'),
(2, 'itv_kangoo_valida.pdf', 'itv', '2025-11-30', 'uploads/docs/kangoo-itv.pdf'),
(3, 'seguro_allianz_transit.pdf', 'seguro', '2025-02-28', 'uploads/docs/transit-seg.pdf'),
(3, 'itv_transit_vencida.pdf', 'itv', '2023-01-15', 'uploads/docs/transit-itv.pdf'),
(4, 'itv_leon_2025.pdf', 'itv', '2025-10-10', 'uploads/docs/leon-itv.pdf'),
(4, 'permiso_circulacion_leon.pdf', 'permiso-circulacion', '2030-01-01', 'uploads/docs/leon-perm.pdf'),
(5, 'seguro_ax_golf.pdf', 'seguro', '2026-11-30', 'uploads/docs/golf-seg.pdf'),
(7, 'itv_3008_nueva.pdf', 'itv', '2026-05-20', 'uploads/docs/3008-itv.pdf'),
(8, 'seguro_reale_i30.pdf', 'seguro', '2025-09-12', 'uploads/docs/i30-seg.pdf'),
(9, 'itv_sprinter_2024.pdf', 'itv', '2024-08-22', 'uploads/docs/sprinter-itv.pdf'),
(10, 'itv_fiorino_2025.pdf', 'itv', '2025-03-05', 'uploads/docs/fiorino-itv.pdf');
