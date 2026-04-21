ALTER TABLE vehicles
  MODIFY status ENUM(
    'disponible',
    'no-disponible',
    'reservado',
    'en-uso',
    'pendiente-validacion',
    'formulario-entrega-pendiente',
    'en-taller'
  ) NULL DEFAULT 'disponible';
