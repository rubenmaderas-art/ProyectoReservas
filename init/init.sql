-- Usuarios
INSERT INTO users (username, password, role) VALUES
('admin', 'admin123', 'admin'),
('x', 'x123', 'empleado'),
('empleado', 'empleado123', 'empleado'),
('Ruben', 'ruben123', 'supervisor'),
('supervisor', 'supervisor123', 'supervisor'),
('admin1', 'admin123', 'admin'),
('alba', 'alba123', 'supervisor'),
('carlos', 'carlos123', 'empleado'),
('manolo', 'manolo123', 'empleado'),
('lucas', 'lucas123', 'supervisor');

-- Vehículos
INSERT INTO vehicles (license_plate, model, status, kilometers) VALUES 
('ABC123X', 'Toyota Corolla', 'disponible', 50000),
('DEF456Y', 'Honda Civic', 'disponible', 30000),
('GHI789Z', 'Ford Focus', 'no-disponible', 40000),
('3874JUR', 'Porsche 911', 'disponible', 4000),
('4880HBH', 'Peugeot 207', 'disponible', 200000),
('1234BBB', 'Seat Ibiza', 'disponible', 120000),
('5678CCC', 'Renault Clio', 'disponible', 85000),
('9012DDD', 'Volkswagen Golf', 'no-disponible', 60000),
('3456EEE', 'Audi A3', 'disponible', 45000),
('7890FFF', 'Hyundai i30', 'disponible', 32000);

-- Reservas
INSERT INTO reservations (user_id, vehicle_id, start_time, end_time, status, km_entrega, estado_entrega) VALUES 
(5, 1, '2026-03-01 08:00:00', '2026-03-01 18:00:00', 'rechazada', 0, 'correcto'),
(2, 3, '2026-03-01 08:00:00', '2026-06-01 18:00:00', 'aprobada', 0, 'correcto'),
(4, 5, '2026-02-01 08:00:00', '2026-10-01 18:00:00', 'aprobada', 0, 'correcto'),
(3, 2, '2026-03-05 09:00:00', '2026-03-15 17:00:00', 'pendiente', 0, 'correcto'),
(8, 6, '2026-03-06 09:00:00', '2026-03-06 20:00:00', 'activa', 0, 'correcto'),
(9, 7, '2026-03-02 10:00:00', '2026-03-04 20:00:00', 'entregado', 85150, 'correcto'),
(3, 2, '2026-03-01 08:30:00', '2026-03-01 15:00:00', 'validado', 30100, 'correcto'),
(2, 4, '2026-03-04 12:00:00', '2026-03-05 18:00:00', 'validado', 4120, 'incorrecto'),
(10, 8, '2026-03-06 07:00:00', '2026-03-12 17:00:00', 'aprobada', 0, 'correcto'),
(9, 10, '2026-03-06 10:00:00', '2026-03-07 13:00:00', 'pendiente', 0, 'correcto');

-- Documentación
INSERT INTO documents (vehicle_id, original_name, type, expiration_date, file_path) VALUES 
(1, 'itv_toyota.pdf', 'itv', '2023-12-01', 'uploads/docs/172000123-itv.pdf'),
(2, 'seguro_honda.pdf', 'seguro', '2025-05-20', 'uploads/docs/172000456-seg.pdf'),
(3, 'itv_focus.pdf', 'itv', '2024-01-15', 'uploads/docs/172000789-itv.pdf'),
(4, 'ficha_porsche.pdf', 'ficha-tecnica', '2029-01-10', 'uploads/docs/172000999-fic.pdf'),
(5, 'seguro_207.pdf', 'seguro', '2024-11-30', 'uploads/docs/172000111-seg.pdf'),
(6, 'itv_ibiza.pdf', 'itv', '2025-08-22', 'uploads/docs/172000222-itv.pdf'),
(7, 'seguro_clio.pdf', 'seguro', '2023-10-10', 'uploads/docs/172000333-seg.pdf'),
(8, 'itv_golf.pdf', 'itv', '2026-02-14', 'uploads/docs/172000444-itv.pdf'),
(9, 'permiso_audi.pdf', 'permiso-circulacion', '2030-01-01', 'uploads/docs/172000555-per.pdf'),
(10, 'seguro_i30.pdf', 'seguro', '2025-12-31', 'uploads/docs/172000666-seg.pdf');

-- Auditoría
INSERT INTO audit_logs (users_id, rol_momento, accion, tabla_afectada, registro_id, detalles_admin) VALUES 
(1, 'admin', 'INSERT', 'users', 6, 'Creación de nuevo administrador secundario'),
(4, 'supervisor', 'UPDATE', 'reservas', 7, 'Validación de entrega realizada con éxito'),
(1, 'admin', 'DELETE', 'users', 15, 'Eliminación de usuario de prueba antiguo'),
(7, 'supervisor', 'UPDATE', 'reservas', 1, 'Rechazo de reserva por mantenimiento imprevisto'),
(1, 'admin', 'INSERT', 'documents', 1, 'Carga inicial de ITV Toyota'),
(5, 'supervisor', 'UPDATE', 'vehicles', 3, 'Cambio de estado a no-disponible por avería'),
(1, 'admin', 'UPDATE', 'users', 2, 'Reseteo de contraseña solicitado por empleado'),
(4, 'supervisor', 'INSERT', 'reservas', 5, 'Reserva manual creada para soporte'),
(1, 'admin', 'UPDATE', 'documents', 3, 'Actualización de fecha de expiración ITV Focus'),
(10, 'supervisor', 'UPDATE', 'reservas', 8, 'Reporte de daños leves en parachoques trasero');