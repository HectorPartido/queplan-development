// ============================================================
// CONTROLADOR DE UBICACIONES
// ============================================================
// Maneja las operaciones CRUD para las ubicaciones del mapa
// Incluye filtros por precio, personas y mood
// ============================================================

const { pool } = require('../config/database');

/**
 * OBTENER TODAS LAS UBICACIONES (con filtros)
 * GET /api/ubicaciones
 * Público - Solo muestra ubicaciones aprobadas
 * 
 * Query params opcionales:
 * - precioMin: precio mínimo
 * - precioMax: precio máximo
 * - mood: ID del mood (puede ser múltiple: mood=1&mood=2)
 * - personas: cantidad de personas
 * - buscar: texto para buscar en nombre o descripción
 */
const obtenerTodas = async (req, res) => {
    try {
        // Extraemos los filtros de req.query
        // req.query contiene los parámetros después del ?
        // Ej: /api/ubicaciones?precioMax=500&mood=1
        const { precioMin, precioMax, mood, buscar } = req.query;
        
        // Construcción dinámica de la consulta SQL
        // Empezamos con una consulta base
        let sql = `
            SELECT 
                u.*,
                us.nombre AS vendedor_nombre,
                (SELECT AVG(estrellas) FROM calificacion WHERE ubicacion_id = u.id) AS promedio_calificacion,
                (SELECT COUNT(*) FROM calificacion WHERE ubicacion_id = u.id) AS total_calificaciones,
                GROUP_CONCAT(DISTINCT m.nombre) AS moods,
                GROUP_CONCAT(DISTINCT m.id) AS mood_ids
            FROM ubicacion u
            INNER JOIN usuario us ON u.vendedor_id = us.id
            LEFT JOIN ubicacion_mood um ON u.id = um.ubicacion_id
            LEFT JOIN mood m ON um.mood_id = m.id
            WHERE u.estado = 'aprobada'
        `;
        
        // Array para los valores de los placeholders
        const valores = [];
        
        // Agregamos filtros dinámicamente
        if (precioMin) {
            sql += ' AND u.precio_promedio >= ?';
            valores.push(parseFloat(precioMin));
        }
        
        if (precioMax) {
            sql += ' AND u.precio_promedio <= ?';
            valores.push(parseFloat(precioMax));
        }
        
        if (buscar) {
            sql += ' AND (u.nombre LIKE ? OR u.descripcion LIKE ?)';
            const terminoBusqueda = `%${buscar}%`;
            valores.push(terminoBusqueda, terminoBusqueda);
        }
        
        // Agrupamos por ubicación (necesario por el GROUP_CONCAT)
        sql += ' GROUP BY u.id';
        
        // Si hay filtro de mood, lo aplicamos después del GROUP BY
        if (mood) {
            // mood puede ser un valor único o un array
            const moods = Array.isArray(mood) ? mood : [mood];
            sql += ` HAVING SUM(CASE WHEN m.id IN (${moods.map(() => '?').join(',')}) THEN 1 ELSE 0 END) > 0`;
            valores.push(...moods.map(m => parseInt(m)));
        }
        
        sql += ' ORDER BY u.nombre';
        
        // Ejecutamos la consulta
        const [ubicaciones] = await pool.execute(sql, valores);
        
        res.json({
            success: true,
            data: ubicaciones,
            total: ubicaciones.length,
            filtros: { precioMin, precioMax, mood, buscar }
        });
        
    } catch (error) {
        console.error('Error en obtenerTodas (ubicaciones):', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener ubicaciones.'
        });
    }
};

/**
 * OBTENER UNA UBICACIÓN POR ID
 * GET /api/ubicaciones/:id
 * Público
 */
const obtenerPorId = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Obtenemos la ubicación con toda su información
        const [ubicaciones] = await pool.execute(`
            SELECT 
                u.*,
                us.nombre AS vendedor_nombre,
                us.email AS vendedor_email,
                (SELECT AVG(estrellas) FROM calificacion WHERE ubicacion_id = u.id) AS promedio_calificacion,
                (SELECT COUNT(*) FROM calificacion WHERE ubicacion_id = u.id) AS total_calificaciones
            FROM ubicacion u
            INNER JOIN usuario us ON u.vendedor_id = us.id
            WHERE u.id = ?
        `, [id]);
        
        if (ubicaciones.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ubicación no encontrada.'
            });
        }
        
        const ubicacion = ubicaciones[0];
        
        // Obtenemos los moods de esta ubicación
        const [moods] = await pool.execute(`
            SELECT m.* FROM mood m
            INNER JOIN ubicacion_mood um ON m.id = um.mood_id
            WHERE um.ubicacion_id = ?
        `, [id]);
        
        // Obtenemos las actividades de esta ubicación
        const [actividades] = await pool.execute(`
            SELECT * FROM actividad WHERE ubicacion_id = ?
        `, [id]);
        
        // Combinamos toda la información
        ubicacion.moods = moods;
        ubicacion.actividades = actividades;
        
        res.json({
            success: true,
            data: ubicacion
        });
        
    } catch (error) {
        console.error('Error en obtenerPorId (ubicacion):', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener ubicación.'
        });
    }
};

/**
 * CREAR NUEVA UBICACIÓN (Solicitud)
 * POST /api/ubicaciones
 * Requiere autenticación - Solo vendedores y admins
 * Las ubicaciones de vendedores quedan en estado 'pendiente'
 */
const crear = async (req, res) => {
    try {
        const {
            nombre,
            descripcion,
            latitud,
            longitud,
            direccion,
            precio_promedio,
            telefono,
            horario,
            imagen_url,
            moods // Array de IDs de moods
        } = req.body;
        
        const vendedorId = req.usuario.id;
        
        // Validaciones
        if (!nombre || !latitud || !longitud || !precio_promedio) {
            return res.status(400).json({
                success: false,
                message: 'Nombre, latitud, longitud y precio promedio son requeridos.'
            });
        }
        
        // Determinamos el estado según el rol
        // Admin: aprobada directamente
        // Vendedor: pendiente de aprobación
        const estado = req.usuario.rol === 'admin' ? 'aprobada' : 'pendiente';
        
        // Insertamos la ubicación
        const [result] = await pool.execute(`
            INSERT INTO ubicacion 
            (vendedor_id, nombre, descripcion, latitud, longitud, direccion, 
             precio_promedio, telefono, horario, imagen_url, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            vendedorId, nombre, descripcion ?? null, latitud, longitud, direccion ?? null,
            precio_promedio, telefono ?? null, horario ?? null, imagen_url ?? null, estado
        ]);
        
        const ubicacionId = result.insertId;
        
        // Si se proporcionaron moods, los asociamos
        if (moods && moods.length > 0) {
            const moodValues = moods.map(moodId => [ubicacionId, moodId]);
            
            // Insertamos múltiples registros en ubicacion_mood
            for (const [ubId, moodId] of moodValues) {
                await pool.execute(
                    'INSERT INTO ubicacion_mood (ubicacion_id, mood_id) VALUES (?, ?)',
                    [ubId, moodId]
                );
            }
        }
        
        // Si es vendedor (pendiente), notificar a los admins
        if (estado === 'pendiente') {
            try {
                const [admins] = await pool.execute(
                    "SELECT id FROM usuario WHERE rol = 'admin'"
                );
                const mensaje = `📋 Nueva solicitud de ubicación: "${nombre}" requiere aprobación.`;
                for (const admin of admins) {
                    await pool.execute(
                        'INSERT INTO notificacion (usuario_id, mensaje, url) VALUES (?, ?, ?)',
                        [admin.id, mensaje, '/pages/admin.html?tab=solicitudes']
                    );
                }
            } catch (notifError) {
                console.error('Error al notificar admins:', notifError);
            }
        }

        res.status(201).json({
            success: true,
            message: estado === 'aprobada'
                ? 'Ubicación creada exitosamente.'
                : 'Solicitud enviada. Pendiente de aprobación.',
            data: {
                id: ubicacionId,
                estado
            }
        });
        
    } catch (error) {
        console.error('Error en crear (ubicacion):', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear ubicación.'
        });
    }
};

/**
 * ACTUALIZAR UBICACIÓN
 * PUT /api/ubicaciones/:id
 * Requiere autenticación - Solo el vendedor dueño o admin
 */
const actualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nombre,
            descripcion,
            latitud,
            longitud,
            direccion,
            precio_promedio,
            telefono,
            horario,
            imagen_url,
            moods
        } = req.body;
        
        // Verificamos que la ubicación exista y pertenezca al usuario
        const [ubicaciones] = await pool.execute(
            'SELECT * FROM ubicacion WHERE id = ?',
            [id]
        );
        
        if (ubicaciones.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ubicación no encontrada.'
            });
        }
        
        const ubicacion = ubicaciones[0];
        
        // Solo el dueño o admin puede editar
        if (ubicacion.vendedor_id !== req.usuario.id && req.usuario.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para editar esta ubicación.'
            });
        }
        
        // Actualizamos la ubicación
        await pool.execute(`
            UPDATE ubicacion SET
                nombre = COALESCE(?, nombre),
                descripcion = COALESCE(?, descripcion),
                latitud = COALESCE(?, latitud),
                longitud = COALESCE(?, longitud),
                direccion = COALESCE(?, direccion),
                precio_promedio = COALESCE(?, precio_promedio),
                telefono = COALESCE(?, telefono),
                horario = COALESCE(?, horario),
                imagen_url = COALESCE(?, imagen_url)
            WHERE id = ?
        `, [
            nombre ?? null, descripcion ?? null, latitud ?? null, longitud ?? null, direccion ?? null,
            precio_promedio ?? null, telefono ?? null, horario ?? null, imagen_url ?? null, id
        ]);
        
        // Si se proporcionaron moods, actualizamos las asociaciones
        if (moods) {
            // Eliminamos las asociaciones actuales
            await pool.execute('DELETE FROM ubicacion_mood WHERE ubicacion_id = ?', [id]);
            
            // Insertamos las nuevas
            for (const moodId of moods) {
                await pool.execute(
                    'INSERT INTO ubicacion_mood (ubicacion_id, mood_id) VALUES (?, ?)',
                    [id, moodId]
                );
            }
        }
        
        res.json({
            success: true,
            message: 'Ubicación actualizada correctamente.'
        });
        
    } catch (error) {
        console.error('Error en actualizar (ubicacion):', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar ubicación.'
        });
    }
};

/**
 * ELIMINAR UBICACIÓN
 * DELETE /api/ubicaciones/:id
 * Requiere autenticación - Solo el vendedor dueño o admin
 */
const eliminar = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificamos que la ubicación exista
        const [ubicaciones] = await pool.execute(
            'SELECT * FROM ubicacion WHERE id = ?',
            [id]
        );
        
        if (ubicaciones.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ubicación no encontrada.'
            });
        }
        
        const ubicacion = ubicaciones[0];
        
        // Solo el dueño o admin puede eliminar
        if (ubicacion.vendedor_id !== req.usuario.id && req.usuario.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para eliminar esta ubicación.'
            });
        }
        
        // Eliminamos la ubicación (CASCADE eliminará ubicacion_mood, actividades, etc.)
        await pool.execute('DELETE FROM ubicacion WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Ubicación eliminada correctamente.'
        });
        
    } catch (error) {
        console.error('Error en eliminar (ubicacion):', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar ubicación.'
        });
    }
};

/**
 * APROBAR O RECHAZAR UBICACIÓN
 * PATCH /api/ubicaciones/:id/estado
 * Requiere autenticación - Solo admin
 */
const cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body; // 'aprobada' o 'rechazada'
        
        // Validamos el estado
        if (!['aprobada', 'rechazada'].includes(estado)) {
            return res.status(400).json({
                success: false,
                message: 'Estado debe ser "aprobada" o "rechazada".'
            });
        }
        
        // Verificamos que la ubicación exista
        const [ubicaciones] = await pool.execute(
            'SELECT * FROM ubicacion WHERE id = ?',
            [id]
        );
        
        if (ubicaciones.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ubicación no encontrada.'
            });
        }
        
        // Actualizamos el estado
        await pool.execute(
            'UPDATE ubicacion SET estado = ? WHERE id = ?',
            [estado, id]
        );

        // Notificar al vendedor sobre la decisión
        try {
            const ubicacion = ubicaciones[0];
            const emoji = estado === 'aprobada' ? '✅' : '❌';
            const mensaje = estado === 'aprobada'
                ? `${emoji} ¡Tu ubicación "${ubicacion.nombre}" ha sido aprobada! Ya es visible en el mapa.`
                : `${emoji} Tu ubicación "${ubicacion.nombre}" ha sido rechazada.`;
            await pool.execute(
                'INSERT INTO notificacion (usuario_id, mensaje, url) VALUES (?, ?, ?)',
                [ubicacion.vendedor_id, mensaje, '/pages/mis-ubicaciones.html']
            );
        } catch (notifError) {
            console.error('Error al notificar vendedor:', notifError);
        }

        res.json({
            success: true,
            message: `Ubicación ${estado} correctamente.`
        });
        
    } catch (error) {
        console.error('Error en cambiarEstado (ubicacion):', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar estado de ubicación.'
        });
    }
};

/**
 * OBTENER SOLICITUDES PENDIENTES
 * GET /api/ubicaciones/pendientes
 * Requiere autenticación - Solo admin
 */
const obtenerPendientes = async (req, res) => {
    try {
        const [ubicaciones] = await pool.execute(`
            SELECT u.*, us.nombre AS vendedor_nombre, us.email AS vendedor_email,
                GROUP_CONCAT(DISTINCT m.nombre) AS moods,
                GROUP_CONCAT(DISTINCT m.id) AS mood_ids
            FROM ubicacion u
            INNER JOIN usuario us ON u.vendedor_id = us.id
            LEFT JOIN ubicacion_mood um ON u.id = um.ubicacion_id
            LEFT JOIN mood m ON um.mood_id = m.id
            WHERE u.estado = 'pendiente'
            GROUP BY u.id
            ORDER BY u.fecha_creacion DESC
        `);
        
        res.json({
            success: true,
            data: ubicaciones,
            total: ubicaciones.length
        });
        
    } catch (error) {
        console.error('Error en obtenerPendientes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener solicitudes pendientes.'
        });
    }
};

/**
 * CALIFICAR UBICACIÓN
 * POST /api/ubicaciones/:id/calificar
 * Requiere autenticación
 */
const calificar = async (req, res) => {
    try {
        const { id } = req.params;
        const { estrellas } = req.body;
        const usuarioId = req.usuario.id;
        
        // Validamos las estrellas
        if (!estrellas || estrellas < 1 || estrellas > 5) {
            return res.status(400).json({
                success: false,
                message: 'Estrellas debe ser un número entre 1 y 5.'
            });
        }
        
        // Verificamos que la ubicación exista y esté aprobada
        const [ubicaciones] = await pool.execute(
            'SELECT * FROM ubicacion WHERE id = ? AND estado = "aprobada"',
            [id]
        );
        
        if (ubicaciones.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ubicación no encontrada.'
            });
        }
        
        // Verificamos si ya existe una calificación
        const [existente] = await pool.execute(
            'SELECT * FROM calificacion WHERE usuario_id = ? AND ubicacion_id = ?',
            [usuarioId, id]
        );
        
        if (existente.length > 0) {
            // Actualizamos la calificación existente
            await pool.execute(
                'UPDATE calificacion SET estrellas = ?, fecha = NOW() WHERE usuario_id = ? AND ubicacion_id = ?',
                [estrellas, usuarioId, id]
            );
            
            return res.json({
                success: true,
                message: 'Calificación actualizada.'
            });
        }
        
        // Insertamos nueva calificación
        await pool.execute(
            'INSERT INTO calificacion (usuario_id, ubicacion_id, estrellas) VALUES (?, ?, ?)',
            [usuarioId, id, estrellas]
        );
        
        res.status(201).json({
            success: true,
            message: 'Calificación registrada.'
        });
        
    } catch (error) {
        console.error('Error en calificar:', error);
        res.status(500).json({
            success: false,
            message: 'Error al calificar ubicación.'
        });
    }
};

/**
 * AGREGAR A FAVORITOS
 * POST /api/ubicaciones/:id/favorito
 * Requiere autenticación
 */
const agregarFavorito = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.usuario.id;
        
        // Verificamos que la ubicación exista
        const [ubicaciones] = await pool.execute(
            'SELECT * FROM ubicacion WHERE id = ? AND estado = "aprobada"',
            [id]
        );
        
        if (ubicaciones.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ubicación no encontrada.'
            });
        }
        
        // Verificamos si ya está en favoritos
        const [existente] = await pool.execute(
            'SELECT * FROM favorito WHERE usuario_id = ? AND ubicacion_id = ?',
            [usuarioId, id]
        );
        
        if (existente.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Esta ubicación ya está en tus favoritos.'
            });
        }
        
        // Agregamos a favoritos
        await pool.execute(
            'INSERT INTO favorito (usuario_id, ubicacion_id) VALUES (?, ?)',
            [usuarioId, id]
        );
        
        res.status(201).json({
            success: true,
            message: 'Agregado a favoritos.'
        });
        
    } catch (error) {
        console.error('Error en agregarFavorito:', error);
        res.status(500).json({
            success: false,
            message: 'Error al agregar a favoritos.'
        });
    }
};

/**
 * QUITAR DE FAVORITOS
 * DELETE /api/ubicaciones/:id/favorito
 * Requiere autenticación
 */
const quitarFavorito = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.usuario.id;
        
        const [result] = await pool.execute(
            'DELETE FROM favorito WHERE usuario_id = ? AND ubicacion_id = ?',
            [usuarioId, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Esta ubicación no está en tus favoritos.'
            });
        }
        
        res.json({
            success: true,
            message: 'Eliminado de favoritos.'
        });
        
    } catch (error) {
        console.error('Error en quitarFavorito:', error);
        res.status(500).json({
            success: false,
            message: 'Error al quitar de favoritos.'
        });
    }
};

/**
 * OBTENER MIS FAVORITOS
 * GET /api/ubicaciones/favoritos
 * Requiere autenticación
 */
const obtenerFavoritos = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        
        const [favoritos] = await pool.execute(`
            SELECT u.*, f.fecha AS fecha_favorito
            FROM ubicacion u
            INNER JOIN favorito f ON u.id = f.ubicacion_id
            WHERE f.usuario_id = ? AND u.estado = 'aprobada'
            ORDER BY f.fecha DESC
        `, [usuarioId]);
        
        res.json({
            success: true,
            data: favoritos,
            total: favoritos.length
        });
        
    } catch (error) {
        console.error('Error en obtenerFavoritos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener favoritos.'
        });
    }
};

/**
 * OBTENER MIS UBICACIONES (vendedor)
 * GET /api/ubicaciones/mis-ubicaciones
 * Requiere autenticación - Solo vendedores y admins
 * Retorna TODAS las ubicaciones del vendedor sin importar estado
 */
const obtenerMisUbicaciones = async (req, res) => {
    try {
        const vendedorId = req.usuario.id;

        const [ubicaciones] = await pool.execute(`
            SELECT
                u.*,
                us.nombre AS vendedor_nombre,
                (SELECT AVG(estrellas) FROM calificacion WHERE ubicacion_id = u.id) AS promedio_calificacion,
                (SELECT COUNT(*) FROM calificacion WHERE ubicacion_id = u.id) AS total_calificaciones,
                GROUP_CONCAT(DISTINCT m.nombre) AS moods,
                GROUP_CONCAT(DISTINCT m.id) AS mood_ids
            FROM ubicacion u
            INNER JOIN usuario us ON u.vendedor_id = us.id
            LEFT JOIN ubicacion_mood um ON u.id = um.ubicacion_id
            LEFT JOIN mood m ON um.mood_id = m.id
            WHERE u.vendedor_id = ?
            GROUP BY u.id
            ORDER BY u.fecha_creacion DESC
        `, [vendedorId]);

        res.json({
            success: true,
            data: ubicaciones,
            total: ubicaciones.length
        });

    } catch (error) {
        console.error('Error en obtenerMisUbicaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener tus ubicaciones.'
        });
    }
};

/**
 * OBTENER TODAS LAS UBICACIONES PARA ADMIN (cualquier estado)
 * GET /api/ubicaciones/admin/todas
 * Solo admin
 */
const obtenerTodasAdmin = async (req, res) => {
    try {
        const [ubicaciones] = await pool.execute(`
            SELECT
                u.*,
                us.nombre AS vendedor_nombre,
                us.email AS vendedor_email,
                (SELECT AVG(estrellas) FROM calificacion WHERE ubicacion_id = u.id) AS promedio_calificacion,
                (SELECT COUNT(*) FROM calificacion WHERE ubicacion_id = u.id) AS total_calificaciones,
                GROUP_CONCAT(DISTINCT m.nombre) AS moods,
                GROUP_CONCAT(DISTINCT m.id) AS mood_ids
            FROM ubicacion u
            INNER JOIN usuario us ON u.vendedor_id = us.id
            LEFT JOIN ubicacion_mood um ON u.id = um.ubicacion_id
            LEFT JOIN mood m ON um.mood_id = m.id
            GROUP BY u.id
            ORDER BY u.fecha_creacion DESC
        `);

        res.json({
            success: true,
            data: ubicaciones,
            total: ubicaciones.length
        });
    } catch (error) {
        console.error('Error en obtenerTodasAdmin:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener ubicaciones.'
        });
    }
};

// ============================================================
// EXPORTAMOS LAS FUNCIONES
// ============================================================

module.exports = {
    obtenerTodas,
    obtenerTodasAdmin,
    obtenerPorId,
    crear,
    actualizar,
    eliminar,
    cambiarEstado,
    obtenerPendientes,
    obtenerMisUbicaciones,
    calificar,
    agregarFavorito,
    quitarFavorito,
    obtenerFavoritos
};
