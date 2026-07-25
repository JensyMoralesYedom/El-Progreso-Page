-- ========================================
-- FINCA GANADERA EL PROGRESO - BASE DE DATOS
-- ========================================

-- Crear base de datos (ejecutar solo si no existe)
-- CREATE DATABASE elprogreso;

-- ========================================
-- TABLA: usuarios
-- ========================================
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'admin',
    fecha_registro TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- TABLA: razas
-- ========================================
CREATE TABLE IF NOT EXISTS razas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    origen VARCHAR(100),
    descripcion TEXT
);

-- ========================================
-- TABLA: ganado
-- ========================================
CREATE TABLE IF NOT EXISTS ganado (
    id SERIAL PRIMARY KEY,
    arete VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    raza_id INTEGER NOT NULL REFERENCES razas(id) ON DELETE RESTRICT,
    sexo VARCHAR(10) NOT NULL CHECK (sexo IN ('Macho', 'Hembra')),
    fecha_nacimiento DATE,
    peso_kg DECIMAL(6,2) CHECK (peso_kg > 0),
    estado_sanitario VARCHAR(50) NOT NULL CHECK (estado_sanitario IN ('Bueno', 'Regular', 'Crítico')),
    ubicacion VARCHAR(100),
    fecha_registro TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- DATOS DE PRUEBA: razas
-- ========================================
INSERT INTO razas (nombre, origen, descripcion) VALUES
('Holstein', 'Países Bajos', 'Raza lechera por excelencia, conocida por su alta producción de leche y su característico pelaje blanco y negro.'),
('Jersey', 'Isla de Jersey', 'Raza lechera de tamaño pequeño, produce leche con alto contenido de grasa y proteína.'),
('Brown Swiss', 'Suiza', 'Raza versátil de pelaje marrón grisáceo, excelente productora de leche con buena longevity.'),
('Brahman', 'Estados Unidos', 'Raza de carne adaptada a climas tropicales, resistente al calor y parásitos.'),
('Cebú', 'India', 'Raza adaptada a climas cálidos, utilizada para carne y trabajo, muy resistente.')
ON CONFLICT (nombre) DO NOTHING;

-- ========================================
-- DATOS DE PRUEBA: usuario admin
-- Password: admin123 (hash bcrypt)
-- ========================================
INSERT INTO usuarios (nombre, email, password, rol) VALUES
('Administrador', 'admin@elprogreso.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin')
ON CONFLICT (email) DO NOTHING;

-- ========================================
-- DATOS DE PRUEBA: ganado
-- ========================================
INSERT INTO ganado (arete, nombre, raza_id, sexo, fecha_nacimiento, peso_kg, estado_sanitario, ubicacion) VALUES
('GAN-001', 'Luna', 1, 'Hembra', '2020-03-15', 520.50, 'Bueno', 'Potrero Norte'),
('GAN-002', 'Toro Rey', 4, 'Macho', '2018-07-22', 850.00, 'Bueno', 'Potrero Sur'),
('GAN-003', 'Estrella', 2, 'Hembra', '2021-01-10', 410.30, 'Bueno', 'Establo A'),
('GAN-004', 'Rayo', 3, 'Macho', '2019-11-05', 680.75, 'Regular', 'Potrero Este'),
('GAN-005', 'Blanca', 1, 'Hembra', '2022-05-20', 480.00, 'Bueno', 'Potrero Norte'),
('GAN-006', 'Bravo', 5, 'Macho', '2017-09-12', 720.25, 'Bueno', 'Potrero Oeste'),
('GAN-007', 'Miel', 2, 'Hembra', '2023-02-28', 350.60, 'Bueno', 'Establo B'),
('GAN-008', 'Capitán', 4, 'Macho', '2020-08-18', 690.40, 'Crítico', 'Cuarentena');
