DROP DATABASE IF EXISTS proyecto_reservas;
CREATE DATABASE IF NOT EXISTS proyecto_reservas;
USE `proyecto_reservas`;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'empleado', 'supervisor') DEFAULT 'empleado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    license_plate VARCHAR(15) NOT NULL UNIQUE,
    model VARCHAR(100) NOT NULL,
    status ENUM('disponible', 'no-disponible', 'reservado', 'en-uso', 'pendiente-validacion') DEFAULT 'disponible',
    kilometers INT DEFAULT 0,
    INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    vehicle_id INT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('pendiente', 'aprobada', 'activa', 'rechazada','finalizada') DEFAULT 'pendiente',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_vehicle_id (vehicle_id),
    INDEX idx_status_reservations (status),
    INDEX idx_start_end_time (start_time, end_time)
);

CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT,
    original_name VARCHAR(255),
    type ENUM('seguro', 'itv', 'permiso-circulacion', 'ficha-tecnica', 'otros', 'parte-taller') NOT NULL,
    expiration_date DATE NOT NULL,
    file_path VARCHAR(255),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    INDEX idx_vehicle_id_docs (vehicle_id),
    INDEX idx_type (type)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id_auditoria INT AUTO_INCREMENT PRIMARY KEY,
    users_id INT,
    rol_momento VARCHAR(50), 
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accion VARCHAR(20), 
    tabla_afectada VARCHAR(50), 
    registro_id INT, 
    detalles_admin TEXT,
    FOREIGN KEY (users_id) REFERENCES users(id),
    INDEX idx_users_id (users_id),
    INDEX idx_fecha (fecha),
    INDEX idx_accion (accion),
    INDEX idx_tabla_afectada (tabla_afectada),
    INDEX idx_usuario_fecha (users_id, fecha),
    INDEX idx_tabla_registro (tabla_afectada, registro_id),
    INDEX idx_accion_tabla_fecha (accion, tabla_afectada, fecha)
);

CREATE TABLE IF NOT EXISTS validations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT UNIQUE,
    km_inicial INT NOT NULL,
    km_entrega INT NOT NULL,
    informe_entrega VARCHAR(500),
    informe_superior TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    incidencias BOOLEAN DEFAULT FALSE,
    informe_incidencias TEXT,
    status VARCHAR(50) DEFAULT 'pendiente',
    decision_estado VARCHAR(100),
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    INDEX idx_reservation_id (reservation_id),
    INDEX idx_status_validations (status)
);

CREATE TABLE IF NOT EXISTS centres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_unifica INT NOT NULL UNIQUE,
    nombre VARCHAR(155) NOT NULL,
    provincia VARCHAR(100) NOT NULL,
    localidad VARCHAR(100),
    direccion VARCHAR(255),
    telefono VARCHAR(20),
    codigo_postal VARCHAR(10),
    fecha_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);