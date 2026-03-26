-- ============================================================
-- QUEPLAN - Script de Creación de Base de Datos
-- ============================================================
-- Proyecto: QuePlan - Mapa Interactivo de Cancún
-- Versión: 1.0
-- Fecha: 2025
-- Descripción: Script para crear la estructura completa de la
--              base de datos del proyecto QuePlan
-- ============================================================

-- ============================================================
-- SECCIÓN 1: CREAR LA BASE DE DATOS
-- ============================================================

-- DROP DATABASE IF EXISTS: Elimina la base de datos si ya existe
-- Esto es útil durante el desarrollo para "empezar de cero"
-- ⚠️ CUIDADO: En producción esto borraría todos los datos
DROP DATABASE IF EXISTS queplan;

-- CREATE DATABASE: Crea una nueva base de datos
-- CHARACTER SET utf8mb4: Permite emojis y caracteres especiales (español: ñ, acentos)
-- COLLATE utf8mb4_unicode_ci: Define cómo se ordenan y comparan los textos
--   - "ci" significa "case insensitive" (no distingue mayúsculas/minúsculas)
--   - Así "Juan" y "juan" se consideran iguales en búsquedas
CREATE DATABASE queplan
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- USE: Selecciona la base de datos para trabajar con ella
-- Todas las instrucciones siguientes se ejecutarán en esta base de datos
USE queplan;

-- ============================================================
-- SECCIÓN 2: CREAR TABLAS
-- ============================================================

-- ------------------------------------------------------------
-- TABLA: usuario
-- ------------------------------------------------------------
-- Almacena la información de todos los usuarios del sistema
-- Incluye los tres roles: usuario, vendedor y administrador
-- ------------------------------------------------------------

CREATE TABLE usuario (
    -- COLUMNA: id
    -- INT: Número entero
    -- AUTO_INCREMENT: MySQL asigna automáticamente valores 1, 2, 3, 4...
    -- PRIMARY KEY: Identificador único de cada registro
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- COLUMNA: nombre
    -- VARCHAR(100): Texto variable de máximo 100 caracteres
    -- NOT NULL: Campo obligatorio, no puede estar vacío
    nombre VARCHAR(100) NOT NULL,
    
    -- COLUMNA: email
    -- VARCHAR(150): Texto variable de máximo 150 caracteres
    -- NOT NULL: Campo obligatorio
    -- UNIQUE: No puede haber dos usuarios con el mismo email
    email VARCHAR(150) NOT NULL UNIQUE,
    
    -- COLUMNA: password
    -- VARCHAR(255): Texto de máximo 255 caracteres
    -- Será suficiente para almacenar contraseñas encriptadas con bcrypt
    -- NOT NULL: Campo obligatorio
    password VARCHAR(255) NOT NULL,
    
    -- COLUMNA: rol
    -- ENUM: Solo permite los valores especificados entre paréntesis
    -- Es como una lista de opciones válidas
    -- DEFAULT 'usuario': Si no se especifica, asigna 'usuario'
    rol ENUM('usuario', 'vendedor', 'admin') NOT NULL DEFAULT 'usuario',
    
    -- COLUMNA: avatar
    -- VARCHAR(255): Para almacenar la URL de la imagen de perfil
    -- NULL está implícito: el campo puede estar vacío
    avatar VARCHAR(255),
    
    -- COLUMNA: fecha_registro
    -- TIMESTAMP: Almacena fecha y hora
    -- DEFAULT CURRENT_TIMESTAMP: Automáticamente guarda la fecha/hora actual
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- COLUMNA: activo
    -- BOOLEAN: Solo puede ser TRUE (1) o FALSE (0)
    -- DEFAULT TRUE: Por defecto, las cuentas están activas
    -- Útil para "desactivar" usuarios sin borrarlos
    activo BOOLEAN DEFAULT TRUE,

    -- Recuperacion de contraseña
    reset_code VARCHAR(255) NULL,
    reset_code_expira DATETIME NULL
);

-- ------------------------------------------------------------
-- TABLA: mood
-- ------------------------------------------------------------
-- Catálogo de categorías/ambientes para las ubicaciones
-- Ejemplos: Playa, Naturaleza, Gastronomía, Cultura, etc.
-- Esta tabla tendrá pocos registros (10 moods fijos)
-- ------------------------------------------------------------

CREATE TABLE mood (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- COLUMNA: nombre
    -- UNIQUE: No puede haber dos moods con el mismo nombre
    nombre VARCHAR(50) NOT NULL UNIQUE,
    
    -- COLUMNA: icono
    -- VARCHAR(10): Suficiente para almacenar un emoji
    -- Los emojis en UTF-8 pueden usar hasta 4 bytes
    icono VARCHAR(10),
    
    -- COLUMNA: descripcion
    -- Texto corto explicando el mood
    descripcion VARCHAR(255)
);

-- ------------------------------------------------------------
-- TABLA: ubicacion
-- ------------------------------------------------------------
-- Almacena los lugares que aparecen en el mapa
-- Cada ubicación pertenece a un vendedor (usuario con rol 'vendedor')
-- Las ubicaciones pasan por un proceso de aprobación
-- ------------------------------------------------------------

CREATE TABLE ubicacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- COLUMNA: vendedor_id
    -- INT: Número entero que referencia al usuario vendedor
    -- NOT NULL: Toda ubicación debe tener un dueño
    vendedor_id INT NOT NULL,
    
    nombre VARCHAR(150) NOT NULL,
    
    -- COLUMNA: descripcion
    -- TEXT: Para textos largos (hasta 65,535 caracteres)
    -- Útil para descripciones detalladas
    descripcion TEXT,
    
    -- COLUMNAS: latitud y longitud
    -- DECIMAL(10, 8) y DECIMAL(11, 8): Números decimales de precisión fija
    -- Latitud: -90.00000000 a 90.00000000 (10 dígitos, 8 decimales)
    -- Longitud: -180.00000000 a 180.00000000 (11 dígitos, 8 decimales)
    -- Esta precisión es suficiente para ubicar un punto con exactitud de ~1mm
    latitud DECIMAL(10, 8) NOT NULL,
    longitud DECIMAL(11, 8) NOT NULL,
    
    direccion VARCHAR(255),
    
    -- COLUMNA: precio_promedio
    -- DECIMAL(10, 2): Hasta 99,999,999.99 (10 dígitos, 2 decimales)
    -- Representa el precio promedio por persona en pesos mexicanos
    precio_promedio DECIMAL(10, 2) NOT NULL,
    
    telefono VARCHAR(20),
    
    -- COLUMNA: horario
    -- Almacena el horario en formato texto
    -- Ejemplo: "Lun-Vie: 9:00-18:00, Sáb-Dom: 10:00-14:00"
    horario VARCHAR(255),
    
    imagen_url VARCHAR(255),
    
    -- COLUMNA: estado
    -- ENUM con tres estados posibles para el flujo de aprobación:
    -- 'pendiente': Recién creada, esperando revisión del admin
    -- 'aprobada': Admin la aprobó, visible en el mapa
    -- 'rechazada': Admin la rechazó, no visible
    estado ENUM('pendiente', 'aprobada', 'rechazada') DEFAULT 'pendiente',
    
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- FOREIGN KEY: Define la relación con la tabla usuario
    -- CONSTRAINT: Le damos un nombre a esta restricción (fk_ubicacion_vendedor)
    --             Esto ayuda a identificar errores más fácilmente
    -- REFERENCES: Indica a qué tabla y columna apunta
    -- ON DELETE RESTRICT: Evita borrar un usuario si tiene ubicaciones
    --                     Primero habría que borrar sus ubicaciones
    -- ON UPDATE CASCADE: Si cambia el id del usuario, se actualiza aquí también
    CONSTRAINT fk_ubicacion_vendedor 
        FOREIGN KEY (vendedor_id) REFERENCES usuario(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- TABLA: ubicacion_mood (tabla intermedia/pivote)
-- ------------------------------------------------------------
-- Resuelve la relación muchos a muchos entre ubicacion y mood
-- Una ubicación puede tener varios moods (playa + relax)
-- Un mood puede estar en varias ubicaciones
-- ------------------------------------------------------------

CREATE TABLE ubicacion_mood (
    -- Esta tabla tiene una PRIMARY KEY compuesta
    -- Es decir, la combinación de ambas columnas forma la llave primaria
    ubicacion_id INT NOT NULL,
    mood_id INT NOT NULL,
    
    -- PRIMARY KEY compuesta: No puede existir la misma combinación dos veces
    -- Ejemplo: Si ubicacion_id=1 y mood_id=2 ya existe, no se puede repetir
    PRIMARY KEY (ubicacion_id, mood_id),
    
    -- Llaves foráneas hacia las tablas que relaciona
    -- ON DELETE CASCADE: Si se borra la ubicación, se borran sus moods asociados
    CONSTRAINT fk_ubicacion_mood_ubicacion
        FOREIGN KEY (ubicacion_id) REFERENCES ubicacion(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_ubicacion_mood_mood
        FOREIGN KEY (mood_id) REFERENCES mood(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- TABLA: actividad
-- ------------------------------------------------------------
-- Actividades que se pueden hacer dentro de una ubicación
-- Ejemplo: En un hotel puede haber "Spa", "Restaurante", "Tour"
-- Cada actividad puede tener su propio precio y horario
-- ------------------------------------------------------------

CREATE TABLE actividad (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- La actividad pertenece a una ubicación
    ubicacion_id INT NOT NULL,
    
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    
    -- Precio específico de esta actividad (puede ser diferente al promedio)
    -- NULL significa que el precio no aplica o está incluido
    precio DECIMAL(10, 2),
    
    -- Duración estimada de la actividad
    -- Ejemplo: "2 horas", "Medio día", "45 minutos"
    duracion VARCHAR(50),
    
    -- Horario específico de la actividad
    horario VARCHAR(255),
    
    CONSTRAINT fk_actividad_ubicacion
        FOREIGN KEY (ubicacion_id) REFERENCES ubicacion(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- TABLA: evento
-- ------------------------------------------------------------
-- Eventos programados en el sistema
-- Pueden ser de dos tipos:
--   - 'ods': Eventos ambientales (Llamado a la ayuda) - Generan notificaciones
--   - 'general': Eventos normales de negocios - No generan notificaciones
-- ------------------------------------------------------------

CREATE TABLE evento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Usuario que creó el evento (admin, vendedor u organización)
    creador_id INT NOT NULL,
    
    -- Ubicación donde se realizará el evento
    -- NULL está permitido porque algunos eventos podrían no tener ubicación fija
    ubicacion_id INT,
    
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    
    -- DATE: Solo almacena la fecha (YYYY-MM-DD)
    fecha DATE NOT NULL,
    
    -- TIME: Solo almacena la hora (HH:MM:SS)
    hora TIME NOT NULL,
    
    -- Tipo de evento:
    -- 'ods': Relacionado con Objetivos de Desarrollo Sostenible
    --        Estos generan notificaciones "Llamado a la ayuda"
    -- 'general': Eventos normales (festivales, promociones, etc.)
    tipo ENUM('ods', 'general') NOT NULL,

    -- Estado de aprobación del evento (flujo similar a ubicaciones)
    estado ENUM('pendiente', 'aprobada', 'rechazada') DEFAULT 'pendiente',

    imagen_url VARCHAR(255),
    
    -- Para poder "cancelar" eventos sin borrarlos
    activo BOOLEAN DEFAULT TRUE,
    
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_evento_creador
        FOREIGN KEY (creador_id) REFERENCES usuario(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    
    -- ON DELETE SET NULL: Si se borra la ubicación, el evento permanece
    -- pero su ubicacion_id se vuelve NULL
    CONSTRAINT fk_evento_ubicacion
        FOREIGN KEY (ubicacion_id) REFERENCES ubicacion(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- TABLA: notificacion
-- ------------------------------------------------------------
-- Almacena las notificaciones enviadas a los usuarios
-- Se generan automáticamente cuando se crea un evento tipo 'ods'
-- ------------------------------------------------------------

CREATE TABLE notificacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Usuario que recibe la notificación
    usuario_id INT NOT NULL,
    
    -- Evento relacionado (opcional, puede ser NULL para notificaciones no relacionadas a eventos)
    evento_id INT NULL,

    -- Mensaje de la notificación
    -- Ejemplo: "🐢 ¡Las tortugas te necesitan! Únete a la protección de nidos"
    mensaje VARCHAR(255) NOT NULL,

    -- URL de destino al hacer click en la notificacion
    url VARCHAR(255) NULL,

    -- Para saber si el usuario ya la vio
    leida BOOLEAN DEFAULT FALSE,
    
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_notificacion_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_notificacion_evento
        FOREIGN KEY (evento_id) REFERENCES evento(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- TABLA: evento_asistencia
-- ------------------------------------------------------------
-- Registra qué usuarios confirmaron asistencia a un evento
-- Un usuario solo puede confirmar una vez por evento
-- ------------------------------------------------------------

CREATE TABLE evento_asistencia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evento_id INT NOT NULL,
    usuario_id INT NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Un usuario no puede registrarse dos veces al mismo evento
    UNIQUE KEY uk_evento_usuario (evento_id, usuario_id),

    FOREIGN KEY (evento_id) REFERENCES evento(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- TABLA: reporte
-- ------------------------------------------------------------
-- Almacena reportes de usuarios sobre ubicaciones, eventos o
-- actividades. Permite a los admins moderar contenido.
-- ------------------------------------------------------------

CREATE TABLE reporte (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- Usuario que hace el reporte
    usuario_id INT NOT NULL,

    -- Tipo de elemento reportado y su ID
    tipo ENUM('ubicacion', 'evento', 'actividad') NOT NULL,
    referencia_id INT NOT NULL COMMENT 'ID de la ubicación, evento o actividad reportada',

    -- Motivo del reporte
    motivo ENUM('informacion_falsa', 'contenido_inapropiado', 'estafa', 'peligroso', 'spam', 'otro') NOT NULL,
    descripcion TEXT,

    -- Estado del reporte
    estado ENUM('pendiente', 'revisado', 'resuelto') DEFAULT 'pendiente',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion TIMESTAMP NULL,

    -- Admin que resolvió el reporte
    resuelto_por INT NULL,
    nota_admin TEXT NULL,

    FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
    FOREIGN KEY (resuelto_por) REFERENCES usuario(id) ON DELETE SET NULL,

    INDEX idx_tipo_ref (tipo, referencia_id),
    INDEX idx_estado (estado)
);

-- ------------------------------------------------------------
-- TABLA: calificacion (tabla intermedia)
-- ------------------------------------------------------------
-- Registra las calificaciones (estrellas) que dan los usuarios
-- Un usuario solo puede calificar una vez cada ubicación
-- ------------------------------------------------------------

CREATE TABLE calificacion (
    -- PRIMARY KEY compuesta: usuario + ubicación
    usuario_id INT NOT NULL,
    ubicacion_id INT NOT NULL,
    
    -- TINYINT: Número entero pequeño (0-255)
    -- Perfecto para almacenar valores del 1 al 5
    -- CHECK: Valida que el valor esté en el rango permitido
    estrellas TINYINT NOT NULL CHECK (estrellas >= 1 AND estrellas <= 5),
    
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (usuario_id, ubicacion_id),
    
    CONSTRAINT fk_calificacion_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_calificacion_ubicacion
        FOREIGN KEY (ubicacion_id) REFERENCES ubicacion(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- TABLA: favorito (tabla intermedia)
-- ------------------------------------------------------------
-- Almacena las ubicaciones que cada usuario marca como favoritas
-- Similar a "guardar" o "dar like" en otras aplicaciones
-- ------------------------------------------------------------

CREATE TABLE favorito (
    usuario_id INT NOT NULL,
    ubicacion_id INT NOT NULL,
    
    -- Fecha en que se guardó como favorito
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (usuario_id, ubicacion_id),
    
    CONSTRAINT fk_favorito_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_favorito_ubicacion
        FOREIGN KEY (ubicacion_id) REFERENCES ubicacion(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- ============================================================
-- SECCIÓN 3: CREAR ÍNDICES
-- ============================================================
-- Los índices mejoran la velocidad de las búsquedas
-- Es como el índice de un libro: te ayuda a encontrar cosas rápido
-- Se crean en columnas que se usan frecuentemente en WHERE, JOIN, ORDER BY
-- ============================================================

-- Índice para buscar usuarios por email (login)
CREATE INDEX idx_usuario_email ON usuario(email);

-- Índice para filtrar ubicaciones por estado
CREATE INDEX idx_ubicacion_estado ON ubicacion(estado);

-- Índice para filtrar ubicaciones por precio
CREATE INDEX idx_ubicacion_precio ON ubicacion(precio_promedio);

-- Índice para buscar eventos por fecha
CREATE INDEX idx_evento_fecha ON evento(fecha);

-- Índice para buscar eventos por tipo (ods vs general)
CREATE INDEX idx_evento_tipo ON evento(tipo);

-- Índice para filtrar eventos por estado de aprobación
CREATE INDEX idx_evento_estado ON evento(estado);

-- Índice para buscar notificaciones no leídas de un usuario
CREATE INDEX idx_notificacion_usuario_leida ON notificacion(usuario_id, leida);

-- ============================================================
-- SECCIÓN 4: INSERTAR DATOS INICIALES
-- ============================================================
-- Insertamos los datos que son fijos/catálogos
-- En este caso, los 10 moods que definimos
-- ============================================================

INSERT INTO mood (nombre, icono, descripcion) VALUES
    ('Playa', '🏖️', 'Sol, arena y mar. Disfruta de las hermosas playas de Cancún'),
    ('Naturaleza', '🌿', 'Áreas verdes, parques ecológicos y ecoturismo'),
    ('Gastronomía', '🍽️', 'Restaurantes, comida local y experiencias culinarias'),
    ('Cultura', '🏛️', 'Museos, historia, arte y zonas arqueológicas'),
    ('Aventura', '🤿', 'Deportes acuáticos, actividades extremas y tours'),
    ('Vida nocturna', '🌙', 'Bares, clubs y entretenimiento nocturno'),
    ('Relax', '🧘', 'Spas, bienestar y lugares tranquilos'),
    ('Familiar', '👨‍👩‍👧‍👦', 'Actividades para todas las edades'),
    ('Romántico', '💑', 'Experiencias para parejas'),
    ('Ecológico', '♻️', 'Turismo responsable y proyectos de conservación');

-- ============================================================
-- SECCIÓN 5: INSERTAR USUARIO ADMINISTRADOR POR DEFECTO
-- ============================================================
-- Creamos un usuario administrador inicial para poder acceder al sistema
-- La contraseña está hasheada con bcrypt (el valor real es: admin123)
-- ⚠️ IMPORTANTE: Cambiar esta contraseña en producción
-- ============================================================

INSERT INTO usuario (nombre, email, password, rol) VALUES
    ('Administrador', 'admin@queplan.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
-- Para ejecutar este script:
-- 1. Abre MySQL Workbench o terminal de MySQL
-- 2. Conéctate a tu servidor MySQL
-- 3. Ejecuta: source /ruta/al/archivo/schema.sql
--    O copia y pega el contenido completo
-- ============================================================
