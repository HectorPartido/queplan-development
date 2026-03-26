-- ============================================================
-- QUEPLAN - Datos de Prueba (Seeds)
-- ============================================================
-- Este archivo contiene datos de ejemplo para desarrollo y pruebas
-- Ejecutar DESPUÉS de schema.sql
-- ============================================================

USE queplan;

-- ============================================================
-- USUARIOS DE PRUEBA
-- ============================================================
-- Todas las contraseñas son: password123
-- Hash generado con bcrypt (10 rounds)
-- ============================================================

INSERT INTO usuario (nombre, email, password, rol) VALUES
    -- Vendedores (negocios locales)
    ('Carlos Restaurantes', 'carlos@email.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'vendedor'),
    ('María Tours', 'maria@email.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'vendedor'),
    ('Eco Cancún Org', 'eco@email.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'vendedor'),
    
    -- Usuarios normales (turistas/locales)
    ('Juan Pérez', 'juan@email.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'usuario'),
    ('Ana García', 'ana@email.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'usuario'),
    ('Pedro López', 'pedro@email.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'usuario');

-- ============================================================
-- UBICACIONES DE PRUEBA
-- ============================================================
-- Coordenadas reales de lugares en Cancún
-- vendedor_id: 2=Carlos, 3=María, 4=Eco Cancún
-- ============================================================

INSERT INTO ubicacion (vendedor_id, nombre, descripcion, latitud, longitud, direccion, precio_promedio, telefono, horario, estado) VALUES
    -- Restaurantes (vendedor: Carlos - id=2)
    (2, 'La Habichuela Sunset', 
        'Restaurante de cocina mexicana contemporánea con vista al atardecer. Especialidad en mariscos y cortes premium.',
        21.08530000, -86.76760000,
        'Blvd. Kukulcan Km 12.5, Zona Hotelera',
        800.00, '998-123-4567', 'Lun-Dom: 13:00-23:00', 'aprobada'),
    
    (2, 'Tacos Rigo', 
        'Los mejores tacos de pastor y carnitas de Cancún. Auténtica comida callejera mexicana.',
        21.16120000, -86.82340000,
        'Av. Tulum 26, Centro',
        150.00, '998-234-5678', 'Lun-Sáb: 18:00-02:00', 'aprobada'),
    
    (2, 'Marakame Café', 
        'Café artesanal con granos locales. Ambiente bohemio perfecto para trabajar o relajarse.',
        21.16450000, -86.82560000,
        'Parque de las Palapas, Centro',
        100.00, '998-345-6789', 'Lun-Dom: 08:00-22:00', 'aprobada'),

    -- Tours y Aventura (vendedor: María - id=3)
    (3, 'Cenote Ik Kil', 
        'Impresionante cenote sagrado maya. Nada en aguas cristalinas rodeado de naturaleza.',
        20.66250000, -88.55080000,
        'Carretera Mérida-Valladolid Km 122',
        250.00, '985-456-7890', 'Lun-Dom: 09:00-17:00', 'aprobada'),
    
    (3, 'Isla Mujeres Tour', 
        'Excursión en catamarán a Isla Mujeres. Incluye snorkel, barra libre y comida buffet.',
        21.25880000, -86.74020000,
        'Marina Aquatours, Blvd. Kukulcan',
        1500.00, '998-567-8901', 'Salidas: 09:00 y 10:30', 'aprobada'),

    -- Lugares ecológicos (vendedor: Eco Cancún - id=4)
    (4, 'Parque Kabah', 
        'Área natural protegida urbana. Hogar de coatíes, iguanas y aves. Senderos para caminar.',
        21.13780000, -86.84920000,
        'Av. Palenque s/n, SM 21',
        0.00, NULL, 'Lun-Dom: 06:00-18:00', 'aprobada'),
    
    (4, 'Playa Delfines', 
        'La playa pública más famosa de Cancún. Perfecta para ver atardeceres y tomar fotos en el letrero.',
        21.04580000, -86.78120000,
        'Blvd. Kukulcan Km 18, Zona Hotelera',
        0.00, NULL, 'Abierta 24 horas', 'aprobada'),
    
    (4, 'Ombligo Verde', 
        'Reserva ecológica urbana con cenote. Importante zona de conservación de la biodiversidad local.',
        21.14520000, -86.83410000,
        'Av. La Luna, SM 46',
        50.00, '998-678-9012', 'Sáb-Dom: 09:00-15:00', 'aprobada'),

    -- Ubicación pendiente de aprobación
    (3, 'Nuevo Bar Ejemplo',
        'Este lugar está pendiente de aprobación para probar el flujo.',
        21.15000000, -86.83000000,
        'Av. Ejemplo 123',
        300.00, NULL, 'Vie-Sáb: 21:00-03:00', 'pendiente');

-- ============================================================
-- ASOCIAR MOODS A UBICACIONES
-- ============================================================
-- Recuerda: Los moods tienen IDs del 1 al 10 según los insertamos
-- 1=Playa, 2=Naturaleza, 3=Gastronomía, 4=Cultura, 5=Aventura
-- 6=Vida nocturna, 7=Relax, 8=Familiar, 9=Romántico, 10=Ecológico
-- ============================================================

INSERT INTO ubicacion_mood (ubicacion_id, mood_id) VALUES
    -- La Habichuela Sunset (id=1): Gastronomía, Romántico
    (1, 3), (1, 9),
    
    -- Tacos Rigo (id=2): Gastronomía, Familiar
    (2, 3), (2, 8),
    
    -- Marakame Café (id=3): Gastronomía, Relax
    (3, 3), (3, 7),
    
    -- Cenote Ik Kil (id=4): Naturaleza, Aventura, Ecológico
    (4, 2), (4, 5), (4, 10),
    
    -- Isla Mujeres Tour (id=5): Playa, Aventura, Familiar
    (5, 1), (5, 5), (5, 8),
    
    -- Parque Kabah (id=6): Naturaleza, Familiar, Ecológico
    (6, 2), (6, 8), (6, 10),
    
    -- Playa Delfines (id=7): Playa, Familiar, Romántico
    (7, 1), (7, 8), (7, 9),
    
    -- Ombligo Verde (id=8): Naturaleza, Ecológico
    (8, 2), (8, 10);

-- ============================================================
-- ACTIVIDADES DE PRUEBA
-- ============================================================

INSERT INTO actividad (ubicacion_id, nombre, descripcion, precio, duracion, horario) VALUES
    -- Actividades en La Habichuela Sunset
    (1, 'Cena Romántica', 'Mesa con vista al mar, champagne de bienvenida y menú de 5 tiempos', 2500.00, '2-3 horas', '19:00-22:00'),
    (1, 'Brunch Dominical', 'Buffet de brunch con música en vivo', 600.00, '2 horas', 'Dom: 11:00-14:00'),
    
    -- Actividades en Cenote Ik Kil
    (4, 'Nado Libre', 'Acceso para nadar en el cenote', 250.00, '1-2 horas', '09:00-17:00'),
    (4, 'Tour Guiado', 'Recorrido con guía explicando la historia maya', 400.00, '1.5 horas', 'Cada hora en punto'),
    
    -- Actividades en Isla Mujeres Tour
    (5, 'Tour Básico', 'Catamarán, snorkel y tiempo libre en la isla', 1200.00, '8 horas', '09:00'),
    (5, 'Tour Premium', 'Incluye comida gourmet, barra premium y masaje', 2500.00, '8 horas', '10:30'),
    
    -- Actividades en Parque Kabah
    (6, 'Senderismo Guiado', 'Recorrido para avistar fauna local', 0.00, '1 hora', 'Sáb-Dom: 08:00 y 10:00'),
    
    -- Actividades en Ombligo Verde
    (8, 'Tour Educativo', 'Aprende sobre el ecosistema local y el cenote', 100.00, '1.5 horas', 'Sáb: 10:00');

-- ============================================================
-- EVENTOS DE PRUEBA
-- ============================================================
-- Tipo 'ods': Eventos ambientales (Llamado a la ayuda)
-- Tipo 'general': Eventos normales
-- ============================================================

INSERT INTO evento (creador_id, ubicacion_id, titulo, descripcion, fecha, hora, tipo) VALUES
    -- Eventos ODS (Llamado a la ayuda) - Generan notificaciones
    (4, 7, '🐢 Protección de Tortugas Marinas',
        'Únete a la vigilancia nocturna para proteger los nidos de tortuga marina. Capacitación incluida.',
        DATE_ADD(CURDATE(), INTERVAL 7 DAY), '20:00', 'ods'),
    
    (4, 7, '🏖️ Limpieza de Playa Delfines',
        'Gran jornada de limpieza comunitaria. Traer guantes y gorra. Se proporcionan bolsas.',
        DATE_ADD(CURDATE(), INTERVAL 14 DAY), '07:00', 'ods'),
    
    (4, 8, '🌿 Reforestación Ombligo Verde',
        'Plantaremos 200 árboles nativos. Únete a restaurar este pulmón de la ciudad.',
        DATE_ADD(CURDATE(), INTERVAL 21 DAY), '08:00', 'ods'),
    
    (1, NULL, '🦀 Protección de Cangrejo Azul',
        'Ayuda a los cangrejos azules a cruzar la carretera de manera segura durante su migración.',
        DATE_ADD(CURDATE(), INTERVAL 10 DAY), '18:00', 'ods'),
    
    -- Eventos generales (no generan notificaciones)
    (2, 1, 'Festival Gastronómico',
        'Degustación de platillos especiales con maridaje de vinos mexicanos.',
        DATE_ADD(CURDATE(), INTERVAL 5 DAY), '19:00', 'general'),
    
    (3, 5, 'Tour de Luna Llena',
        'Excursión especial nocturna a Isla Mujeres durante la luna llena.',
        DATE_ADD(CURDATE(), INTERVAL 12 DAY), '18:00', 'general');

-- ============================================================
-- ASISTENCIA A EVENTOS DE PRUEBA
-- ============================================================

INSERT INTO evento_asistencia (evento_id, usuario_id) VALUES
    -- Juan (id=5) asiste a protección de tortugas y limpieza
    (1, 5), (2, 5),
    -- Ana (id=6) asiste a protección de tortugas y reforestación
    (1, 6), (3, 6),
    -- Pedro (id=7) asiste a protección de cangrejo azul
    (4, 7);

-- ============================================================
-- CALIFICACIONES DE PRUEBA
-- ============================================================

INSERT INTO calificacion (usuario_id, ubicacion_id, estrellas) VALUES
    -- Juan (id=5) califica algunos lugares
    (5, 1, 5),  -- La Habichuela: 5 estrellas
    (5, 2, 4),  -- Tacos Rigo: 4 estrellas
    (5, 7, 5),  -- Playa Delfines: 5 estrellas
    
    -- Ana (id=6) califica algunos lugares
    (6, 1, 4),  -- La Habichuela: 4 estrellas
    (6, 4, 5),  -- Cenote Ik Kil: 5 estrellas
    (6, 7, 5),  -- Playa Delfines: 5 estrellas
    
    -- Pedro (id=7) califica algunos lugares
    (7, 2, 5),  -- Tacos Rigo: 5 estrellas
    (7, 6, 4),  -- Parque Kabah: 4 estrellas
    (7, 8, 5);  -- Ombligo Verde: 5 estrellas

-- ============================================================
-- FAVORITOS DE PRUEBA
-- ============================================================

INSERT INTO favorito (usuario_id, ubicacion_id) VALUES
    -- Favoritos de Juan
    (5, 1), (5, 7), (5, 4),
    
    -- Favoritos de Ana
    (6, 4), (6, 5), (6, 8),
    
    -- Favoritos de Pedro
    (7, 2), (7, 6);

-- ============================================================
-- NOTIFICACIONES DE PRUEBA
-- ============================================================
-- Simulamos que ya se enviaron notificaciones de eventos ODS
-- ============================================================

INSERT INTO notificacion (usuario_id, evento_id, mensaje, url, leida) VALUES
    -- Notificaciones para Juan (id=5)
    (5, 1, '🐢 ¡Las tortugas te necesitan! Únete a la protección de nidos en Playa Delfines', '/pages/eventos.html', FALSE),
    (5, 2, '🏖️ ¡Llamado a la ayuda! Gran limpieza de Playa Delfines este sábado', '/pages/eventos.html', FALSE),

    -- Notificaciones para Ana (id=6)
    (6, 1, '🐢 ¡Las tortugas te necesitan! Únete a la protección de nidos en Playa Delfines', '/pages/eventos.html', TRUE),
    (6, 3, '🌿 ¡El Ombligo Verde te necesita! Jornada de reforestación', '/pages/eventos.html', FALSE),

    -- Notificaciones para Pedro (id=7)
    (7, 1, '🐢 ¡Las tortugas te necesitan! Únete a la protección de nidos en Playa Delfines', '/pages/eventos.html', FALSE),
    (7, 4, '🦀 ¡Los cangrejos azules necesitan tu ayuda durante su migración!', '/pages/eventos.html', FALSE);

-- ============================================================
-- CONSULTAS DE VERIFICACIÓN
-- ============================================================
-- Ejecuta estas consultas para verificar que los datos se insertaron correctamente

-- Ver todos los usuarios
-- SELECT * FROM usuario;

-- Ver ubicaciones con sus vendedores
-- SELECT u.nombre AS ubicacion, us.nombre AS vendedor, u.precio_promedio, u.estado
-- FROM ubicacion u
-- JOIN usuario us ON u.vendedor_id = us.id;

-- Ver ubicaciones con sus moods
-- SELECT u.nombre AS ubicacion, GROUP_CONCAT(m.nombre SEPARATOR ', ') AS moods
-- FROM ubicacion u
-- JOIN ubicacion_mood um ON u.id = um.ubicacion_id
-- JOIN mood m ON um.mood_id = m.id
-- GROUP BY u.id;

-- Ver eventos ordenados por fecha
-- SELECT titulo, tipo, fecha, hora FROM evento ORDER BY fecha;

-- Ver promedio de calificaciones por ubicación
-- SELECT u.nombre, AVG(c.estrellas) AS promedio, COUNT(c.estrellas) AS total_calificaciones
-- FROM ubicacion u
-- LEFT JOIN calificacion c ON u.id = c.ubicacion_id
-- GROUP BY u.id;

-- ============================================================
-- FIN DE DATOS DE PRUEBA
-- ============================================================
