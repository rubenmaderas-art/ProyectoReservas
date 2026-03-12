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
('1234ABC', 'Toyota Corolla', 'pendiente-validacion', 15000),
('5678DEF', 'Renault Kangoo', 'en-uso', 45200),
('9012GHI', 'Ford Transit', 'reservado', 89000),
('3456JKL', 'Seat Leon', 'pendiente-validacion', 12000),
('7890MNP', 'Volkswagen Golf', 'pendiente-validacion', 65400),
('2345QRS', 'Citroen Berlingo', 'reservado', 33100),
('6789TUV', 'Peugeot 3008', 'pendiente-validacion', 5000),
('0123WXY', 'Hyundai i30', 'en-uso', 21000),
('4567BBB', 'Mercedes Sprinter', 'reservado', 110000),
('8901CCC', 'Fiat Fiorino', 'disponible', 72000);

INSERT INTO reservations (user_id, vehicle_id, start_time, end_time, status) VALUES
(2, 1, '2026-03-01 08:00:00', '2026-03-01 18:00:00', 'finalizada'),
(4, 2, '2026-03-10 09:00:00', '2026-03-12 17:00:00', 'activa'),
(5, 3, '2026-03-15 07:30:00', '2026-03-15 15:30:00', 'aprobada'),
(8, 4, '2026-02-20 10:00:00', '2026-02-21 10:00:00', 'finalizada'),
(9, 10, '2026-03-05 08:00:00', '2026-03-05 20:00:00', 'rechazada'),
(2, 6, '2026-03-20 09:00:00', '2026-03-21 09:00:00', 'pendiente'),
(3, 8, '2026-03-09 06:00:00', '2026-03-11 18:00:00', 'activa'),
(4, 7, '2026-03-02 11:00:00', '2026-03-02 14:00:00', 'finalizada'),
(5, 9, '2026-03-18 10:00:00', '2026-03-19 10:00:00', 'aprobada'),
(8, 5, '2026-02-15 08:00:00', '2026-02-15 12:00:00', 'finalizada');

INSERT INTO documents (vehicle_id, original_name, type, expiration_date, file_path) VALUES 
(1, 'itv_toyota.pdf', 'itv', '2026-12-01', 'uploads/docs/toyota-itv.pdf'),
(2, 'seguro_kangoo.pdf', 'seguro', '2027-05-20', 'uploads/docs/kangoo-seg.pdf'),
(3, 'itv_transit.pdf', 'itv', '2027-01-15', 'uploads/docs/transit-itv.pdf'),
(4, 'ficha_leon.pdf', 'ficha-tecnica', '2028-01-10', 'uploads/docs/leon-fic.pdf'),
(5, 'seguro_golf.pdf', 'seguro', '2026-11-30', 'uploads/docs/golf-seg.pdf'),
(6, 'itv_berlingo.pdf', 'itv', '2026-08-22', 'uploads/docs/berlingo-itv.pdf'),
(7, 'seguro_3008.pdf', 'seguro', '2027-10-10', 'uploads/docs/3008-seg.pdf'),
(8, 'itv_i30.pdf', 'itv', '2026-12-14', 'uploads/docs/i30-itv.pdf'),
(9, 'permiso_sprinter.pdf', 'permiso-circulacion', '2030-01-01', 'uploads/docs/sprinter-per.pdf'),
(10, 'seguro_fiorino.pdf', 'seguro', '2026-12-31', 'uploads/docs/fiorino-seg.pdf');

INSERT INTO audit_logs (users_id, rol_momento, accion, tabla_afectada, registro_id, detalles_admin) VALUES 
(1, 'admin', 'INSERT', 'users', 6, 'Creación de nuevo administrador'),
(4, 'supervisor', 'UPDATE', 'reservas', 7, 'Validación de entrega realizada'),
(6, 'supervisor', 'UPDATE', 'reservas', 1, 'Rechazo por mantenimiento'),
(1, 'admin', 'INSERT', 'documents', 1, 'Carga inicial ITV'),
(5, 'supervisor', 'UPDATE', 'vehicles', 3, 'Cambio a no-disponible'),
(1, 'admin', 'UPDATE', 'users', 2, 'Reseteo de password'),
(4, 'supervisor', 'INSERT', 'reservas', 5, 'Reserva manual soporte'),
(1, 'admin', 'UPDATE', 'documents', 3, 'Actualización fecha ITV'),
(9, 'supervisor', 'UPDATE', 'reservas', 8, 'Reporte de daños leves'),
(1, 'admin', 'DELETE', 'users', 10, 'Borrado lógico de usuario');

INSERT INTO validations (reservation_id, km_entrega, informe_entrega, informe_superior, incidencias) VALUES
(1, 15150, 'Sin novedad.', 'Ok.', FALSE),
(2, 45500, 'Limpio.', 'Validado.', FALSE),
(3, 89100, 'Correcto.', 'Cerrado.', FALSE),
(4, 12200, 'Rasguño puerta.', 'Dar parte.', TRUE),
(7, 21200, 'Falta chaleco.', 'Reponer.', TRUE),
(8, 5100, 'Perfecto.', 'Ok.', FALSE),
(10, 65550, 'Frenos ruidosos.', 'Revisar.', TRUE),
(5, 72000, 'No aplica.', 'Control.', FALSE),
(9, 110500, 'Estado óptimo.', 'Validado.', FALSE),
(6, 33200, 'Revisión visual.', 'Espera.', FALSE);