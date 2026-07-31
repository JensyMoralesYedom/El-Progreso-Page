-- ========================================
-- FINCA GANADERA EL PROGRESO - BASE DE DATOS
-- ========================================

-- Crear base de datos (ejecutar solo si no existe)
-- CREATE DATABASE elprogreso;

-- Este script es idempotente: puede ejecutarse en bases nuevas
-- y en bases existentes (aplica la migración automáticamente).

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
-- TABLA: potreros
-- ========================================
CREATE TABLE IF NOT EXISTS potreros (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    hectareas DECIMAL(6,2) CHECK (hectareas > 0),
    capacidad_cabezas INTEGER CHECK (capacidad_cabezas > 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'Disponible'
        CHECK (estado IN ('Disponible', 'En uso', 'Descanso'))
);

-- DATOS DE PRUEBA: potreros (deben existir antes de la migración)
INSERT INTO potreros (nombre, descripcion, hectareas, capacidad_cabezas, estado) VALUES
('Potrero Norte', 'Pastoreo principal zona norte', 25.00, 40, 'En uso'),
('Potrero Sur', 'Pastoreo zona sur', 30.00, 50, 'En uso'),
('Potrero Este', 'Pastoreo zona este', 20.00, 35, 'En uso'),
('Potrero Oeste', 'Pastoreo zona oeste', 22.00, 35, 'Disponible'),
('Establo A', 'Establo de ordeño y alojamiento A', 2.00, 20, 'En uso'),
('Establo B', 'Establo de alojamiento B', 1.50, 15, 'En uso'),
('Cuarentena', 'Área de aislamiento y cuarentena', 1.00, 10, 'Disponible')
ON CONFLICT (nombre) DO NOTHING;

-- ========================================
-- TABLA: ganado (inventario completo)
-- ========================================
CREATE TABLE IF NOT EXISTS ganado (
    id SERIAL PRIMARY KEY,
    arete VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    raza_id INTEGER NOT NULL REFERENCES razas(id) ON DELETE RESTRICT,
    sexo VARCHAR(10) NOT NULL CHECK (sexo IN ('Macho', 'Hembra')),
    fecha_nacimiento DATE,
    peso_kg DECIMAL(6,2) CHECK (peso_kg > 0),
    estado_sanitario VARCHAR(50) NOT NULL
        CHECK (estado_sanitario IN ('Bueno', 'Regular', 'Crítico')),
    estado VARCHAR(20) NOT NULL DEFAULT 'Activo'
        CHECK (estado IN ('Activo', 'Vendido', 'Muerto')),
    origen VARCHAR(20) NOT NULL DEFAULT 'Nacido'
        CHECK (origen IN ('Nacido', 'Comprado')),
    fecha_compra DATE,
    precio_compra DECIMAL(10,2) CHECK (precio_compra >= 0),
    potrero_id INTEGER REFERENCES potreros(id) ON DELETE SET NULL,
    madre_id INTEGER REFERENCES ganado(id) ON DELETE SET NULL,
    padre_id INTEGER REFERENCES ganado(id) ON DELETE SET NULL,
    fecha_registro TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- MIGRACIÓN PARA BASES EXISTENTES
-- Convierte el esquema anterior (ubicacion texto) al nuevo esquema
-- (potrero_id FK). En bases nuevas estas sentencias son no-op.
-- ========================================
ALTER TABLE ganado ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'Activo';
ALTER TABLE ganado ADD COLUMN IF NOT EXISTS origen VARCHAR(20) NOT NULL DEFAULT 'Nacido';
ALTER TABLE ganado ADD COLUMN IF NOT EXISTS fecha_compra DATE;
ALTER TABLE ganado ADD COLUMN IF NOT EXISTS precio_compra DECIMAL(10,2) CHECK (precio_compra >= 0);
ALTER TABLE ganado ADD COLUMN IF NOT EXISTS potrero_id INTEGER REFERENCES potreros(id) ON DELETE SET NULL;
ALTER TABLE ganado ADD COLUMN IF NOT EXISTS madre_id INTEGER REFERENCES ganado(id) ON DELETE SET NULL;
ALTER TABLE ganado ADD COLUMN IF NOT EXISTS padre_id INTEGER REFERENCES ganado(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ganado' AND column_name = 'ubicacion'
    ) THEN
        EXECUTE '
            UPDATE ganado g
            SET potrero_id = p.id
            FROM potreros p
            WHERE g.potrero_id IS NULL AND p.nombre = g.ubicacion
        ';
        EXECUTE 'ALTER TABLE ganado DROP COLUMN IF EXISTS ubicacion';
    END IF;
END $$;

-- ========================================
-- TABLA: movimientos_ganado (entradas/salidas)
-- ========================================
CREATE TABLE IF NOT EXISTS movimientos_ganado (
    id SERIAL PRIMARY KEY,
    animal_id INTEGER NOT NULL REFERENCES ganado(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL
        CHECK (tipo IN ('Nacimiento', 'Compra', 'Venta', 'Muerte', 'Descarte')),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    descripcion TEXT,
    monto DECIMAL(10,2) CHECK (monto >= 0),
    responsable_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_registro TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- TABLA: traslados (movimientos entre potreros)
-- ========================================
CREATE TABLE IF NOT EXISTS traslados (
    id SERIAL PRIMARY KEY,
    animal_id INTEGER NOT NULL REFERENCES ganado(id) ON DELETE CASCADE,
    potrero_origen_id INTEGER REFERENCES potreros(id) ON DELETE SET NULL,
    potrero_destino_id INTEGER NOT NULL REFERENCES potreros(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    motivo TEXT,
    responsable_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ========================================
-- TABLA: vacunaciones
-- ========================================
CREATE TABLE IF NOT EXISTS vacunaciones (
    id SERIAL PRIMARY KEY,
    animal_id INTEGER NOT NULL REFERENCES ganado(id) ON DELETE CASCADE,
    vacuna VARCHAR(100) NOT NULL,
    dosis VARCHAR(50),
    fecha_aplicacion DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_proxima DATE,
    veterinario VARCHAR(100),
    observaciones TEXT
);

-- ========================================
-- TABLA: tratamientos
-- ========================================
CREATE TABLE IF NOT EXISTS tratamientos (
    id SERIAL PRIMARY KEY,
    animal_id INTEGER NOT NULL REFERENCES ganado(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL DEFAULT 'Enfermedad'
        CHECK (tipo IN ('Enfermedad', 'Lesión', 'Desparasitación', 'Otro')),
    diagnostico VARCHAR(200),
    medicamento VARCHAR(100),
    dosis VARCHAR(50),
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin DATE,
    estado VARCHAR(20) NOT NULL DEFAULT 'Activo'
        CHECK (estado IN ('Activo', 'Finalizado', 'Cancelado')),
    costo DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (costo >= 0),
    veterinario VARCHAR(100),
    observaciones TEXT
);

-- ========================================
-- TABLA: visitas_veterinario
-- ========================================
CREATE TABLE IF NOT EXISTS visitas_veterinario (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    motivo VARCHAR(200),
    diagnostico TEXT,
    costo DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (costo >= 0),
    veterinario VARCHAR(100),
    responsable_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ========================================
-- TABLA: montas (reproducción)
-- ========================================
CREATE TABLE IF NOT EXISTS montas (
    id SERIAL PRIMARY KEY,
    macho_id INTEGER REFERENCES ganado(id) ON DELETE CASCADE,
    hembra_id INTEGER NOT NULL REFERENCES ganado(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo VARCHAR(30) NOT NULL DEFAULT 'Natural'
        CHECK (tipo IN ('Natural', 'Inseminación')),
    resultado VARCHAR(50),
    observaciones TEXT
);

-- ========================================
-- TABLA: gestaciones
-- ========================================
CREATE TABLE IF NOT EXISTS gestaciones (
    id SERIAL PRIMARY KEY,
    hembra_id INTEGER NOT NULL REFERENCES ganado(id) ON DELETE CASCADE,
    monta_id INTEGER REFERENCES montas(id) ON DELETE SET NULL,
    fecha_inicio DATE NOT NULL,
    fecha_parto_estimada DATE,
    fecha_parto_real DATE,
    resultado VARCHAR(20) CHECK (resultado IN ('Normal', 'Difícil', 'Aborto')),
    estado VARCHAR(20) NOT NULL DEFAULT 'En curso'
        CHECK (estado IN ('En curso', 'Finalizada', 'Abortada')),
    cria_id INTEGER REFERENCES ganado(id) ON DELETE SET NULL,
    observaciones TEXT
);

-- ========================================
-- TABLA: produccion_leche
-- ========================================
CREATE TABLE IF NOT EXISTS produccion_leche (
    id SERIAL PRIMARY KEY,
    animal_id INTEGER NOT NULL REFERENCES ganado(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    turno VARCHAR(10) NOT NULL DEFAULT 'Mañana'
        CHECK (turno IN ('Mañana', 'Tarde')),
    litros DECIMAL(6,2) NOT NULL CHECK (litros >= 0),
    observaciones TEXT,
    UNIQUE (animal_id, fecha, turno)
);

-- ========================================
-- TABLA: alimentacion
-- ========================================
CREATE TABLE IF NOT EXISTS alimentacion (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo VARCHAR(50) NOT NULL DEFAULT 'Forraje'
        CHECK (tipo IN ('Forraje', 'Suplemento', 'Concentrado', 'Minerales', 'Otro')),
    alimento VARCHAR(100) NOT NULL,
    cantidad_kg DECIMAL(8,2) NOT NULL CHECK (cantidad_kg >= 0),
    costo DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (costo >= 0),
    potrero_id INTEGER REFERENCES potreros(id) ON DELETE SET NULL,
    animal_id INTEGER REFERENCES ganado(id) ON DELETE SET NULL,
    responsable_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    observaciones TEXT
);

-- ========================================
-- TABLA: empleados
-- ========================================
CREATE TABLE IF NOT EXISTS empleados (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    cargo VARCHAR(100),
    telefono VARCHAR(30),
    email VARCHAR(150) UNIQUE,
    fecha_ingreso DATE,
    salario_base DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (salario_base >= 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'Activo'
        CHECK (estado IN ('Activo', 'Inactivo'))
);

-- ========================================
-- TABLA: tareas
-- ========================================
CREATE TABLE IF NOT EXISTS tareas (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    empleado_id INTEGER REFERENCES empleados(id) ON DELETE SET NULL,
    fecha_asignacion DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE,
    prioridad VARCHAR(20) NOT NULL DEFAULT 'Media'
        CHECK (prioridad IN ('Baja', 'Media', 'Alta')),
    estado VARCHAR(20) NOT NULL DEFAULT 'Pendiente'
        CHECK (estado IN ('Pendiente', 'En progreso', 'Completada', 'Cancelada')),
    fecha_completada DATE
);

-- ========================================
-- TABLA: pagos_empleados
-- ========================================
CREATE TABLE IF NOT EXISTS pagos_empleados (
    id SERIAL PRIMARY KEY,
    empleado_id INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
    periodo VARCHAR(20) NOT NULL,
    salario_bruto DECIMAL(10,2) NOT NULL CHECK (salario_bruto >= 0),
    deducciones DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (deducciones >= 0),
    salario_neto DECIMAL(10,2) NOT NULL CHECK (salario_neto >= 0),
    fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
    metodo_pago VARCHAR(30),
    observaciones TEXT
);

-- ========================================
-- TABLA: productos (catálogo de inventario)
-- ========================================
CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    categoria VARCHAR(100),
    unidad_medida VARCHAR(30) NOT NULL DEFAULT 'unidad',
    stock_actual DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    stock_minimo DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
    precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (precio_unitario >= 0)
);

-- ========================================
-- TABLA: movimientos_inventario (entradas/salidas)
-- ========================================
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('Entrada', 'Salida')),
    cantidad DECIMAL(10,2) NOT NULL CHECK (cantidad > 0),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    costo_unitario DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (costo_unitario >= 0),
    proveedor VARCHAR(100),
    motivo VARCHAR(200),
    responsable_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ========================================
-- TABLA: movimientos_financieros
-- ========================================
CREATE TABLE IF NOT EXISTS movimientos_financieros (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('Ingreso', 'Egreso')),
    categoria VARCHAR(100) NOT NULL,
    descripcion VARCHAR(200),
    monto DECIMAL(10,2) NOT NULL CHECK (monto >= 0),
    metodo_pago VARCHAR(30),
    responsable_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
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
INSERT INTO ganado (arete, nombre, raza_id, sexo, fecha_nacimiento, peso_kg,
                    estado_sanitario, estado, origen, potrero_id, madre_id, padre_id)
VALUES
('GAN-001', 'Luna', 1, 'Hembra', '2020-03-15', 520.50, 'Bueno', 'Activo', 'Comprado',
    (SELECT id FROM potreros WHERE nombre = 'Potrero Norte'), NULL, NULL),
('GAN-002', 'Toro Rey', 4, 'Macho', '2018-07-22', 850.00, 'Bueno', 'Activo', 'Comprado',
    (SELECT id FROM potreros WHERE nombre = 'Potrero Sur'), NULL, NULL),
('GAN-003', 'Estrella', 2, 'Hembra', '2021-01-10', 410.30, 'Bueno', 'Activo', 'Nacido',
    (SELECT id FROM potreros WHERE nombre = 'Establo A'), NULL, NULL),
('GAN-004', 'Rayo', 3, 'Macho', '2019-11-05', 680.75, 'Regular', 'Activo', 'Nacido',
    (SELECT id FROM potreros WHERE nombre = 'Potrero Este'), NULL, NULL),
('GAN-005', 'Blanca', 1, 'Hembra', '2022-05-20', 480.00, 'Bueno', 'Activo', 'Nacido',
    (SELECT id FROM potreros WHERE nombre = 'Potrero Norte'),
    (SELECT id FROM ganado WHERE arete = 'GAN-001'), NULL),
('GAN-006', 'Bravo', 5, 'Macho', '2017-09-12', 720.25, 'Bueno', 'Activo', 'Nacido',
    (SELECT id FROM potreros WHERE nombre = 'Potrero Oeste'), NULL, NULL),
('GAN-007', 'Miel', 2, 'Hembra', '2023-02-28', 350.60, 'Bueno', 'Activo', 'Nacido',
    (SELECT id FROM potreros WHERE nombre = 'Establo B'), NULL, NULL),
('GAN-008', 'Capitán', 4, 'Macho', '2020-08-18', 690.40, 'Crítico', 'Activo', 'Nacido',
    (SELECT id FROM potreros WHERE nombre = 'Cuarentena'), NULL, NULL)
ON CONFLICT (arete) DO NOTHING;

-- ========================================
-- DATOS DE PRUEBA: movimientos_ganado
-- ========================================
INSERT INTO movimientos_ganado (animal_id, tipo, fecha, descripcion, monto, responsable_id)
SELECT g.id, mv.tipo, mv.fecha::date, mv.descripcion, mv.monto::numeric, 1
FROM (VALUES
    ('GAN-001', 'Compra', '2021-06-10', 'Compra inicial de ganado', 2500000),
    ('GAN-002', 'Compra', '2019-02-15', 'Compra inicial de ganado', 3200000)
) AS mv(arete, tipo, fecha, descripcion, monto)
JOIN ganado g ON g.arete = mv.arete;

-- ========================================
-- DATOS DE PRUEBA: traslados
-- ========================================
INSERT INTO traslados (animal_id, potrero_origen_id, potrero_destino_id, fecha, motivo, responsable_id)
SELECT g.id, o.id, d.id, CURRENT_DATE, 'Rotación de pastoreo', 1
FROM ganado g
JOIN potreros o ON o.nombre = 'Potrero Norte'
JOIN potreros d ON d.nombre = 'Establo A'
WHERE g.arete = 'GAN-001';

-- ========================================
-- DATOS DE PRUEBA: vacunaciones
-- ========================================
INSERT INTO vacunaciones (animal_id, vacuna, dosis, fecha_aplicacion, fecha_proxima, veterinario)
SELECT g.id, 'Fiebre aftosa', '5 ml', '2026-06-10', '2026-12-10', 'Dr. Carlos Rodríguez'
FROM ganado g WHERE g.arete IN ('GAN-001', 'GAN-005');

-- ========================================
-- DATOS DE PRUEBA: tratamientos
-- ========================================
INSERT INTO tratamientos (animal_id, tipo, diagnostico, medicamento, dosis, fecha_inicio, estado, costo, veterinario)
SELECT g.id, 'Enfermedad', 'Fiebre y decaimiento', 'Antibiótico', '10 ml', '2026-07-20', 'Activo', 120000, 'Dr. Carlos Rodríguez'
FROM ganado g WHERE g.arete = 'GAN-008';

-- ========================================
-- DATOS DE PRUEBA: visitas_veterinario
-- ========================================
INSERT INTO visitas_veterinario (fecha, motivo, diagnostico, costo, veterinario, responsable_id) VALUES
(CURRENT_DATE - 5, 'Revisión general', 'Ganado en buen estado general', 200000, 'Dr. Carlos Rodríguez', 1);

-- ========================================
-- DATOS DE PRUEBA: montas
-- ========================================
INSERT INTO montas (macho_id, hembra_id, fecha, tipo)
SELECT m.id, h.id, '2026-05-15', 'Natural'
FROM ganado m, ganado h
WHERE m.arete = 'GAN-002' AND h.arete = 'GAN-003';

-- ========================================
-- DATOS DE PRUEBA: gestaciones
-- ========================================
INSERT INTO gestaciones (hembra_id, monta_id, fecha_inicio, fecha_parto_estimada, estado)
SELECT g.id, m.id, '2026-05-15', '2027-02-15', 'En curso'
FROM ganado g
JOIN montas m ON m.hembra_id = g.id
WHERE g.arete = 'GAN-003';

-- ========================================
-- DATOS DE PRUEBA: produccion_leche
-- ========================================
INSERT INTO produccion_leche (animal_id, fecha, turno, litros)
SELECT g.id, CURRENT_DATE, pl.turno, pl.litros
FROM (VALUES
    ('GAN-001', 'Mañana', 12.5),
    ('GAN-001', 'Tarde', 8.0),
    ('GAN-003', 'Mañana', 10.0),
    ('GAN-003', 'Tarde', 7.5),
    ('GAN-005', 'Mañana', 11.0)
) AS pl(arete, turno, litros)
JOIN ganado g ON g.arete = pl.arete
ON CONFLICT (animal_id, fecha, turno) DO NOTHING;

-- ========================================
-- DATOS DE PRUEBA: alimentacion
-- ========================================
INSERT INTO alimentacion (fecha, tipo, alimento, cantidad_kg, costo, potrero_id, responsable_id)
SELECT CURRENT_DATE, 'Concentrado', 'Concentrado bovino', 50, 75000, p.id, 1
FROM potreros p WHERE p.nombre = 'Potrero Norte';

INSERT INTO alimentacion (fecha, tipo, alimento, cantidad_kg, costo, potrero_id, responsable_id)
SELECT CURRENT_DATE, 'Minerales', 'Sal mineralizada', 10, 12000, p.id, 1
FROM potreros p WHERE p.nombre = 'Potrero Norte';

-- ========================================
-- DATOS DE PRUEBA: empleados
-- ========================================
INSERT INTO empleados (nombre, cargo, telefono, email, fecha_ingreso, salario_base, estado) VALUES
('Juan Pérez', 'Ordeñador', '3001112233', 'juan@elprogreso.com', '2021-03-01', 1200000, 'Activo'),
('María López', 'Administradora', '3004445566', 'maria@elprogreso.com', '2020-01-15', 2000000, 'Activo'),
('Carlos Rodríguez', 'Veterinario', '3007778899', 'carlos@elprogreso.com', '2022-07-01', 1800000, 'Activo')
ON CONFLICT (email) DO NOTHING;

-- ========================================
-- DATOS DE PRUEBA: tareas
-- ========================================
INSERT INTO tareas (titulo, descripcion, empleado_id, fecha_asignacion, fecha_vencimiento, prioridad, estado)
SELECT 'Ordeñar vacas', 'Ordeño de la mañana en el Establo A', e.id, CURRENT_DATE, CURRENT_DATE, 'Alta', 'Pendiente'
FROM empleados e WHERE e.nombre = 'Juan Pérez';

INSERT INTO tareas (titulo, descripcion, empleado_id, fecha_asignacion, fecha_vencimiento, prioridad, estado)
SELECT 'Revisar potrero Norte', 'Inspeccionar cercas y abrevaderos', e.id, CURRENT_DATE, CURRENT_DATE + 1, 'Media', 'Pendiente'
FROM empleados e WHERE e.nombre = 'Juan Pérez';

INSERT INTO tareas (titulo, descripcion, empleado_id, fecha_asignacion, fecha_vencimiento, prioridad, estado)
SELECT 'Comprar insumos veterinarios', 'Compra de vacunas y desparasitantes', e.id, CURRENT_DATE, CURRENT_DATE + 3, 'Alta', 'Pendiente'
FROM empleados e WHERE e.nombre = 'María López';

-- ========================================
-- DATOS DE PRUEBA: pagos_empleados
-- ========================================
INSERT INTO pagos_empleados (empleado_id, periodo, salario_bruto, deducciones, salario_neto, fecha_pago, metodo_pago)
SELECT e.id, '2026-07', 1200000, 100000, 1100000, '2026-07-30', 'Transferencia'
FROM empleados e WHERE e.nombre = 'Juan Pérez';

INSERT INTO pagos_empleados (empleado_id, periodo, salario_bruto, deducciones, salario_neto, fecha_pago, metodo_pago)
SELECT e.id, '2026-07', 2000000, 200000, 1800000, '2026-07-30', 'Transferencia'
FROM empleados e WHERE e.nombre = 'María López';

-- ========================================
-- DATOS DE PRUEBA: productos
-- ========================================
INSERT INTO productos (nombre, categoria, unidad_medida, stock_actual, stock_minimo, precio_unitario) VALUES
('Vacuna aftosa', 'Medicamentos', 'dosis', 150, 50, 8000),
('Desparasitante oral', 'Medicamentos', 'frascos', 20, 10, 35000),
('Concentrado bovino', 'Alimentos', 'kg', 500, 200, 1500),
('Sal mineralizada', 'Alimentos', 'kg', 300, 100, 1200),
('Leche (venta)', 'Productos lácteos', 'litro', 0, 0, 3000)
ON CONFLICT (nombre) DO NOTHING;

-- ========================================
-- DATOS DE PRUEBA: movimientos_inventario
-- ========================================
INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, fecha, costo_unitario, proveedor, motivo)
SELECT p.id, 'Entrada', 500, CURRENT_DATE, 1500, 'Agroinsumos La Cosecha', 'Compra mensual'
FROM productos p WHERE p.nombre = 'Concentrado bovino';

INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, fecha, costo_unitario, proveedor, motivo)
SELECT p.id, 'Salida', 10, CURRENT_DATE, 8000, NULL, 'Campaña de vacunación'
FROM productos p WHERE p.nombre = 'Vacuna aftosa';

-- ========================================
-- DATOS DE PRUEBA: movimientos_financieros
-- ========================================
INSERT INTO movimientos_financieros (fecha, tipo, categoria, descripcion, monto, metodo_pago, responsable_id) VALUES
(CURRENT_DATE, 'Ingreso', 'Venta de leche', 'Venta diaria de leche', 150000, 'Efectivo', 1),
(CURRENT_DATE, 'Egreso', 'Compra de insumos', 'Compra de concentrado', 75000, 'Transferencia', 1);
