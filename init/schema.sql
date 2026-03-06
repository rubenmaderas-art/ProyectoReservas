DROP DATABASE IF EXISTS proyecto_reservas;
CREATE DATABASE IF NOT EXISTS proyecto_reservas;
USE `proyecto_reservas`;
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'empleado', 'supervisor') DEFAULT 'empleado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    license_plate VARCHAR(15) NOT NULL UNIQUE,
    model VARCHAR(100) NOT NULL,
    status ENUM('disponible', 'no-disponible', 'reservado') DEFAULT 'disponible',
    kilometers INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    vehicle_id INT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    km_entrega INT DEFAULT 0,
    estado_entrega ENUM('correcto', 'incorrecto') DEFAULT 'correcto',
    informe_entrega VARCHAR(255),
    validacion_entrega ENUM('pendiente', 'aprobada', 'rechazada') DEFAULT 'pendiente',
    status ENUM('pendiente', 'aprobada', 'en_progreso','entregado', 'rechazada', 'validado') DEFAULT 'pendiente',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT,
    original_name VARCHAR(255),
    type ENUM('seguro', 'itv', 'permiso-circulacion', 'ficha-tecnica', 'otros') NOT NULL,
    expiration_date DATE NOT NULL,
    file_path VARCHAR(255),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

/* Novedades de auditoria */
CREATE TABLE IF NOT EXISTS documents (
    id_auditoria INT AUTO_INCREMENT PRIMARY KEY,
    users_id INT,
    rol_momento VARCHAR(50), -- el rol que tenía en ese instante
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accion VARCHAR(20), -- INSERT, UPDATE, DELETE
    tabla_afectada VARCHAR(50), -- Para saber a qué tabla ir a buscar
    registro_id INT, -- El ID del elemento en la otra tabla
    detalles_admin TEXT,
    FOREIGN KEY (users_id) REFERENCES users(id)
);