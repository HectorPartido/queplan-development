// ============================================================
// CONTROLADOR DE EVENTOS
// ============================================================
// Maneja eventos normales y eventos ODS (Llamado a la ayuda)
// Los eventos ODS generan notificaciones automáticamente
// ============================================================

const { pool } = require('../config/database');

/**
 * OBTENER TODOS LOS EVENTOS
 * GET /api/eventos
 * Público
 * Query params: tipo (ods/general), activo (true/false)
 */
const obtenerTodos = async (req, res) => {
    try {
        const { tipo, activo } = req.query;
        
        let sql = `
            SELECT
                e.*,
                u.nombre AS ubicacion_nombre,
                us.nombre AS creador_nombre,
                (SELECT COUNT(*) FROM evento_asistencia ea WHERE ea.evento_id = e.id) AS total_asistentes
            FROM evento e
            LEFT JOIN ubicacion u ON e.ubicacion_id = u.id
            INNER JOIN usuario us ON e.creador_id = us.id
            WHERE e.estado = 'aprobada'
        `;

        const valores = [];
        
        // Filtro por tipo
        if (tipo && ['ods', 'general'].includes(tipo)) {
            sql += ' AND e.tipo = ?';
            valores.push(tipo);
        }
        
        // Filtro por activo (por defecto solo activos)
        if (activo === 'false') {
            sql += ' AND e.activo = FALSE';
        } else {
            sql += ' AND e.activo = TRUE';
        }
        
        // Solo eventos futuros o de hoy
        sql += ' AND e.fecha >= CURDATE()';
        
        sql += ' ORDER BY e.fecha ASC, e.hora ASC';
        
        const [eventos] = await pool.execute(sql, valores);
        
        res.json({
            success: true,
            data: eventos,
            total: eventos.length
        });
        
    } catch (error) {
        console.error('Error en obtenerTodos (eventos):', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener eventos.'
        });
    }
};

/**
 * OBTENER EVENTOS ODS (Llamado a la ayuda)
 * GET /api/eventos/ods
 * Público - Solo eventos de tipo ODS
 */
const obtenerEventosODS = async (req, res) => {
    try {
        const [eventos] = await pool.execute(`
            SELECT 
                e.*,
                u.nombre AS ubicacion_nombre,
                u.latitud,
                u.longitud,
                us.nombre AS creador_nombre
            FROM evento e
            LEFT JOIN ubicacion u ON e.ubicacion_id = u.id
            INNER JOIN usuario us ON e.creador_id = us.id
            WHERE e.tipo = 'ods'
              AND e.estado = 'aprobada'
              AND e.activo = TRUE
              AND e.fecha >= CURDATE()
            ORDER BY e.fecha ASC, e.hora ASC
        `);
        
        res.json({
            success: true,
            data: eventos,
            total: eventos.length,
            mensaje: '🌿 ¡Únete a proteger Cancún!'
        });
        
    } catch (error) {
        console.error('Error en obtenerEventosODS:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener eventos ODS.'
        });
    }
};

/**
 * OBTENER UN EVENTO POR ID
 * GET /api/eventos/:id
 * Público
 */
const obtenerPorId = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [eventos] = await pool.execute(`
            SELECT
                e.*,
                u.nombre AS ubicacion_nombre,
                u.latitud,
                u.longitud,
                u.direccion AS ubicacion_direccion,
                us.nombre AS creador_nombre,
                us.email AS creador_email,
                (SELECT COUNT(*) FROM evento_asistencia ea WHERE ea.evento_id = e.id) AS total_asistentes
            FROM evento e
            LEFT JOIN ubicacion u ON e.ubicacion_id = u.id
            INNER JOIN usuario us ON e.creador_id = us.id
            WHERE e.id = ?
        `, [id]);
        
        if (eventos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Evento no encontrado.'
            });
        }
        
        res.json({
            success: true,
            data: eventos[0]
        });
        
    } catch (error) {
        console.error('Error en obtenerPorId (evento):', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener evento.'
        });
    }
};

/**
 * CREAR NUEVO EVENTO
 * POST /api/eventos
 * Requiere autenticación - Vendedores y admins
 * Si es tipo 'ods', genera notificaciones a todos los usuarios
 */
const crear = async (req, res) => {
    try {
        const {
            titulo,
            descripcion,
            fecha,
            hora,
            tipo,
            ubicacion_id,
            imagen_url
        } = req.body;
        
        const creadorId = req.usuario.id;
        
        // Validaciones
        if (!titulo || !fecha || !hora || !tipo) {
            return res.status(400).json({
                success: false,
                message: 'Título, fecha, hora y tipo son requeridos.'
            });
        }
        
        if (!['ods', 'general'].includes(tipo)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo debe ser "ods" o "general".'
            });
        }
        
        // Validar que la fecha no sea pasada
        const fechaEvento = new Date(fecha);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        if (fechaEvento < hoy) {
            return res.status(400).json({
                success: false,
                message: 'La fecha del evento no puede ser en el pasado.'
            });
        }
        
        // Insertamos el evento
        const [result] = await pool.execute(`
            INSERT INTO evento 
            (creador_id, ubicacion_id, titulo, descripcion, fecha, hora, tipo, imagen_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [creadorId, ubicacion_id || null, titulo, descripcion || null, fecha, hora, tipo, imagen_url || null]);
        
        const eventoId = result.insertId;

        // Notificar a todos los admins sobre la nueva solicitud
        await notificarAdmins(eventoId, titulo);

        res.status(201).json({
            success: true,
            message: 'Solicitud de evento enviada. Está pendiente de aprobación por un administrador.',
            data: {
                id: eventoId
            }
        });
        
    } catch (error) {
        console.error('Error en crear (evento):', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear evento.'
        });
    }
};

/**
 * OBTENER EVENTOS PENDIENTES
 * GET /api/eventos/pendientes
 * Solo admin
 */
const obtenerPendientes = async (req, res) => {
    try {
        const [eventos] = await pool.execute(`
            SELECT
                e.*,
                u.nombre AS ubicacion_nombre,
                us.nombre AS creador_nombre,
                us.email AS creador_email
            FROM evento e
            LEFT JOIN ubicacion u ON e.ubicacion_id = u.id
            INNER JOIN usuario us ON e.creador_id = us.id
            WHERE e.estado = 'pendiente' AND e.activo = TRUE
            ORDER BY e.fecha_creacion ASC
        `);

        res.json({
            success: true,
            data: eventos,
            total: eventos.length
        });
    } catch (error) {
        console.error('Error en obtenerPendientes (eventos):', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener eventos pendientes.'
        });
    }
};

/**
 * OBTENER MIS EVENTOS
 * GET /api/eventos/mis-eventos
 * Vendedor/admin - Retorna todos los eventos del usuario (cualquier estado)
 */
const obtenerMisEventos = async (req, res) => {
    try {
        const creadorId = req.usuario.id;
        const [eventos] = await pool.execute(`
            SELECT
                e.*,
                u.nombre AS ubicacion_nombre
            FROM evento e
            LEFT JOIN ubicacion u ON e.ubicacion_id = u.id
            WHERE e.creador_id = ? AND e.activo = TRUE
            ORDER BY e.fecha_creacion DESC
        `, [creadorId]);

        res.json({
            success: true,
            data: eventos,
            total: eventos.length
        });
    } catch (error) {
        console.error('Error en obtenerMisEventos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener tus eventos.'
        });
    }
};

/**
 * CAMBIAR ESTADO DE EVENTO (aprobar/rechazar)
 * PATCH /api/eventos/:id/estado
 * Solo admin
 */
const cambiarEstadoEvento = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!['aprobada', 'rechazada'].includes(estado)) {
            return res.status(400).json({
                success: false,
                message: 'Estado debe ser "aprobada" o "rechazada".'
            });
        }

        const [eventos] = await pool.execute(
            'SELECT * FROM evento WHERE id = ?', [id]
        );

        if (eventos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Evento no encontrado.'
            });
        }

        const evento = eventos[0];

        if (evento.estado !== 'pendiente') {
            return res.status(400).json({
                success: false,
                message: 'Solo se pueden aprobar/rechazar eventos pendientes.'
            });
        }

        await pool.execute(
            'UPDATE evento SET estado = ? WHERE id = ?',
            [estado, id]
        );

        // Generar notificaciones según el nuevo estado
        if (estado === 'aprobada') {
            await notificarUsuariosEvento(id, evento.titulo, evento.tipo);
            await notificarCreador(id, evento.creador_id, `✅ Tu evento '${evento.titulo}' fue aprobado`);
        } else {
            await notificarCreador(id, evento.creador_id, `❌ Tu evento '${evento.titulo}' fue rechazado`);
        }

        res.json({
            success: true,
            message: estado === 'aprobada'
                ? 'Evento aprobado exitosamente.'
                : 'Evento rechazado.'
        });
    } catch (error) {
        console.error('Error en cambiarEstadoEvento:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar estado del evento.'
        });
    }
};

// ============================================================
// FUNCIONES AUXILIARES DE NOTIFICACIONES
// ============================================================

/**
 * Notifica a todos los admins sobre una nueva solicitud de evento
 */
async function notificarAdmins(eventoId, tituloEvento) {
    try {
        const [admins] = await pool.execute(
            'SELECT id FROM usuario WHERE activo = TRUE AND rol = ?',
            ['admin']
        );

        const mensaje = `📋 Nueva solicitud de evento: ${tituloEvento}`;
        const url = '/pages/admin.html#eventos';

        for (const admin of admins) {
            await pool.execute(
                'INSERT INTO notificacion (usuario_id, evento_id, mensaje, url) VALUES (?, ?, ?, ?)',
                [admin.id, eventoId, mensaje, url]
            );
        }

        console.log(`📢 Notificación de solicitud enviada a ${admins.length} admins`);
    } catch (error) {
        console.error('Error notificando admins:', error);
    }
}

/**
 * Notifica a todos los usuarios activos sobre un evento aprobado
 */
async function notificarUsuariosEvento(eventoId, tituloEvento, tipo) {
    try {
        const [usuarios] = await pool.execute(
            'SELECT id FROM usuario WHERE activo = TRUE'
        );

        const mensaje = tipo === 'ods'
            ? `🆘 ¡Llamado a la ayuda! ${tituloEvento}`
            : `📅 Nuevo evento: ${tituloEvento}`;
        const url = `/pages/eventos.html`;

        for (const usuario of usuarios) {
            await pool.execute(
                'INSERT INTO notificacion (usuario_id, evento_id, mensaje, url) VALUES (?, ?, ?, ?)',
                [usuario.id, eventoId, mensaje, url]
            );
        }

        console.log(`📢 Notificaciones de evento enviadas a ${usuarios.length} usuarios`);
    } catch (error) {
        console.error('Error notificando usuarios sobre evento:', error);
    }
}

/**
 * Notifica solo al creador de un evento (usado para rechazos)
 */
async function notificarCreador(eventoId, creadorId, mensaje) {
    try {
        const url = `/pages/eventos.html`;
        await pool.execute(
            'INSERT INTO notificacion (usuario_id, evento_id, mensaje, url) VALUES (?, ?, ?, ?)',
            [creadorId, eventoId, mensaje, url]
        );
    } catch (error) {
        console.error('Error notificando creador:', error);
    }
}

/**
 * ACTUALIZAR EVENTO
 * PUT /api/eventos/:id
 * Requiere autenticación - Solo el creador o admin
 */
const actualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            titulo,
            descripcion,
            fecha,
            hora,
            ubicacion_id,
            imagen_url,
            activo
        } = req.body;
        
        // Verificamos que el evento exista
        const [eventos] = await pool.execute(
            'SELECT * FROM evento WHERE id = ?',
            [id]
        );
        
        if (eventos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Evento no encontrado.'
            });
        }
        
        const evento = eventos[0];
        
        // Solo el creador o admin puede editar
        if (evento.creador_id !== req.usuario.id && req.usuario.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para editar este evento.'
            });
        }
        
        // Actualizamos el evento (convertir undefined a null para mysql2)
        const params = [
            titulo ?? null,
            descripcion ?? null,
            fecha ?? null,
            hora ?? null,
            ubicacion_id ?? null,
            imagen_url ?? null,
            activo ?? null,
            id
        ];

        await pool.execute(`
            UPDATE evento SET
                titulo = COALESCE(?, titulo),
                descripcion = COALESCE(?, descripcion),
                fecha = COALESCE(?, fecha),
                hora = COALESCE(?, hora),
                ubicacion_id = COALESCE(?, ubicacion_id),
                imagen_url = COALESCE(?, imagen_url),
                activo = COALESCE(?, activo)
            WHERE id = ?
        `, params);
        
        res.json({
            success: true,
            message: 'Evento actualizado correctamente.'
        });
        
    } catch (error) {
        console.error('Error en actualizar (evento):', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar evento.'
        });
    }
};

/**
 * ELIMINAR EVENTO
 * DELETE /api/eventos/:id
 * Requiere autenticación - Solo el creador o admin
 */
const eliminar = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificamos que el evento exista
        const [eventos] = await pool.execute(
            'SELECT * FROM evento WHERE id = ?',
            [id]
        );
        
        if (eventos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Evento no encontrado.'
            });
        }
        
        const evento = eventos[0];
        
        // Solo el creador o admin puede eliminar
        if (evento.creador_id !== req.usuario.id && req.usuario.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para eliminar este evento.'
            });
        }
        
        // Eliminamos el evento (CASCADE eliminará las notificaciones)
        await pool.execute('DELETE FROM evento WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Evento eliminado correctamente.'
        });
        
    } catch (error) {
        console.error('Error en eliminar (evento):', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar evento.'
        });
    }
};

// ============================================================
// ASISTENCIA A EVENTOS
// ============================================================

/**
 * TOGGLE ASISTENCIA (asistir / cancelar asistencia)
 * POST /api/eventos/:id/asistencia
 * Requiere autenticacion - Cualquier usuario logueado
 */
const toggleAsistencia = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.usuario.id;

        // Verificar que el evento existe y esta aprobado
        const [eventos] = await pool.execute(
            'SELECT id, titulo FROM evento WHERE id = ? AND estado = ? AND activo = TRUE',
            [id, 'aprobada']
        );

        if (eventos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Evento no encontrado o no disponible.'
            });
        }

        // Verificar si ya tiene asistencia
        const [existente] = await pool.execute(
            'SELECT id FROM evento_asistencia WHERE evento_id = ? AND usuario_id = ?',
            [id, usuarioId]
        );

        if (existente.length > 0) {
            // Cancelar asistencia
            await pool.execute(
                'DELETE FROM evento_asistencia WHERE evento_id = ? AND usuario_id = ?',
                [id, usuarioId]
            );

            const [conteo] = await pool.execute(
                'SELECT COUNT(*) as total FROM evento_asistencia WHERE evento_id = ?',
                [id]
            );

            return res.json({
                success: true,
                asistiendo: false,
                total_asistentes: conteo[0].total,
                message: 'Asistencia cancelada.'
            });
        } else {
            // Registrar asistencia
            await pool.execute(
                'INSERT INTO evento_asistencia (evento_id, usuario_id) VALUES (?, ?)',
                [id, usuarioId]
            );

            const [conteo] = await pool.execute(
                'SELECT COUNT(*) as total FROM evento_asistencia WHERE evento_id = ?',
                [id]
            );

            return res.json({
                success: true,
                asistiendo: true,
                total_asistentes: conteo[0].total,
                message: 'Asistencia registrada.'
            });
        }
    } catch (error) {
        console.error('Error en toggleAsistencia:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar asistencia.'
        });
    }
};

/**
 * OBTENER ASISTENCIA DE UN EVENTO
 * GET /api/eventos/:id/asistencia
 * Publico (conteo), si esta logueado indica si el usuario asiste
 */
const obtenerAsistencia = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.usuario ? req.usuario.id : null;

        const [conteo] = await pool.execute(
            'SELECT COUNT(*) as total FROM evento_asistencia WHERE evento_id = ?',
            [id]
        );

        let asistiendo = false;
        if (usuarioId) {
            const [existe] = await pool.execute(
                'SELECT id FROM evento_asistencia WHERE evento_id = ? AND usuario_id = ?',
                [id, usuarioId]
            );
            asistiendo = existe.length > 0;
        }

        res.json({
            success: true,
            total_asistentes: conteo[0].total,
            asistiendo
        });
    } catch (error) {
        console.error('Error en obtenerAsistencia:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener asistencia.'
        });
    }
};

/**
 * OBTENER ASISTENTES DE UN EVENTO (admin o creador)
 * GET /api/eventos/:id/asistentes
 * Requiere autenticacion - Admin o creador del evento
 */
const obtenerAsistentes = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el evento existe
        const [eventos] = await pool.execute(
            'SELECT id, creador_id, titulo FROM evento WHERE id = ?',
            [id]
        );

        if (eventos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Evento no encontrado.'
            });
        }

        // Solo el creador o admin puede ver la lista de asistentes
        if (eventos[0].creador_id !== req.usuario.id && req.usuario.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para ver los asistentes de este evento.'
            });
        }

        const [asistentes] = await pool.execute(`
            SELECT
                u.id, u.nombre, u.email,
                ea.fecha_registro
            FROM evento_asistencia ea
            INNER JOIN usuario u ON ea.usuario_id = u.id
            WHERE ea.evento_id = ?
            ORDER BY ea.fecha_registro ASC
        `, [id]);

        res.json({
            success: true,
            data: asistentes,
            total: asistentes.length,
            evento: eventos[0].titulo
        });
    } catch (error) {
        console.error('Error en obtenerAsistentes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener asistentes.'
        });
    }
};

/**
 * OBTENER RESUMEN DE ASISTENCIA DE TODOS LOS EVENTOS (admin)
 * GET /api/eventos/asistencia/resumen
 * Solo admin
 */
const obtenerResumenAsistencia = async (req, res) => {
    try {
        const [resumen] = await pool.execute(`
            SELECT
                e.id,
                e.titulo,
                e.tipo,
                e.fecha,
                e.hora,
                e.estado,
                u.nombre AS creador_nombre,
                COUNT(ea.id) AS total_asistentes
            FROM evento e
            LEFT JOIN evento_asistencia ea ON e.id = ea.evento_id
            INNER JOIN usuario u ON e.creador_id = u.id
            WHERE e.activo = TRUE AND e.estado = 'aprobada'
            GROUP BY e.id
            ORDER BY e.fecha ASC
        `);

        res.json({
            success: true,
            data: resumen,
            total: resumen.length
        });
    } catch (error) {
        console.error('Error en obtenerResumenAsistencia:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener resumen de asistencia.'
        });
    }
};

// ============================================================
// EXPORTAMOS LAS FUNCIONES
// ============================================================

module.exports = {
    obtenerTodos,
    obtenerEventosODS,
    obtenerPorId,
    obtenerPendientes,
    obtenerMisEventos,
    crear,
    actualizar,
    eliminar,
    cambiarEstadoEvento,
    toggleAsistencia,
    obtenerAsistencia,
    obtenerAsistentes,
    obtenerResumenAsistencia
};
