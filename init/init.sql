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
('1234-ABC', 'Toyota Corolla', 'disponible', 15000),
('5678-DEF', 'Renault Kangoo', 'en-uso', 45200),
('9012-GHI', 'Ford Transit', 'reservado', 89000),
('3456-JKL', 'Seat Leon', 'disponible', 12000),
('7890-MNP', 'Volkswagen Golf', 'no-disponible', 65400),
('2345-QRS', 'Citroen Berlingo', 'pendiente-validacion', 33100),
('6789-TUV', 'Peugeot 3008', 'disponible', 5000),
('0123-WXY', 'Hyundai i30', 'en-uso', 21000),
('4567-BBB', 'Mercedes Sprinter', 'disponible', 110000),
('8901-CCC', 'Fiat Fiorino', 'disponible', 72000);

-- Reservas
INSERT INTO reservations (user_id, vehicle_id, start_time, end_time, status) VALUES
(2, 1, '2024-03-01 08:00:00', '2024-03-01 18:00:00', 'finalizada'),
(4, 2, '2024-03-10 09:00:00', '2024-03-12 17:00:00', 'activa'),
(5, 3, '2024-03-15 07:30:00', '2024-03-15 15:30:00', 'aprobada'),
(8, 4, '2024-02-20 10:00:00', '2024-02-21 10:00:00', 'finalizada'),
(9, 10, '2024-03-05 08:00:00', '2024-03-05 20:00:00', 'rechazada'),
(2, 6, '2024-03-20 09:00:00', '2024-03-21 09:00:00', 'pendiente'),
(10, 8, '2024-03-09 06:00:00', '2024-03-11 18:00:00', 'activa'),
(4, 7, '2024-03-02 11:00:00', '2024-03-02 14:00:00', 'finalizada'),
(5, 9, '2024-03-18 10:00:00', '2024-03-19 10:00:00', 'aprobada'),
(8, 5, '2024-02-15 08:00:00', '2024-02-15 12:00:00', 'finalizada');

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

INSERT INTO validations (reservation_id, km_entrega, informe_entrega, informe_superior, incidencias) VALUES
(1, 15150, 'Vehículo entregado limpio y con tanque lleno.', 'Todo correcto.', FALSE),
(4, 12200, 'Pequeño rasguño en la puerta trasera derecha.', 'Se procede a dar parte al seguro.', TRUE),
(8, 5100, 'Sin novedad.', 'Ok.', FALSE),
(10, 65550, 'Frenos chirrían un poco al frenar fuerte.', 'Revisar en taller la próxima semana.', TRUE),
(2, 45500, 'Entrega puntual.', 'Recibido.', FALSE),
(3, 89100, 'Limpio.', 'Cerrado.', FALSE),
(7, 21200, 'Falta el chaleco reflectante.', 'Reponer del stock central.', TRUE),
(9, 110500, 'Perfecto estado.', 'Validado por supervisor.', FALSE),
(5, 72100, 'Rechazada - No aplica validación real', 'Registro de control interno', FALSE),
(6, 33200, 'Pendiente de revisión visual profunda.', 'En espera.', FALSE);