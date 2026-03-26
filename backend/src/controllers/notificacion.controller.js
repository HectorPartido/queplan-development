// ============================================================
// CONTROLADOR DE NOTIFICACIONES
// ============================================================
// Maneja las notificaciones de los usuarios
// Principalmente las generadas por eventos ODS
// ============================================================

const { pool } = require('../config/database');

/**
 * OBTENER MIS NOTIFICACIONES
 * GET /api/notificaciones
 * Requiere autenticación
 * Query params: leidas (true/false)
 */
const obtenerMisNotificaciones = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { leidas } = req.query;
        
        let sql = `
            SELECT
                n.*,
                e.titulo AS evento_titulo,
                e.fecha AS evento_fecha,
                e.hora AS evento_hora,
                e.tipo AS evento_tipo
            FROM notificacion n
            LEFT JOIN evento e ON n.evento_id = e.id
            WHERE n.usuario_id = ?
        `;
        
        const valores = [usuarioId];
        
        // Filtrar por leídas/no leídas
        if (leidas === 'true') {
            sql += ' AND n.leida = TRUE';
        } else if (leidas === 'false') {
            sql += ' AND n.leida = FALSE';
        }
        
        sql += ' ORDER BY n.fecha DESC';
        
        const [notificaciones] = await pool.execute(sql, valores);
        
        // Contamos las no leídas
        const [countResult] = await pool.execute(
            'SELECT COUNT(*) AS no_leidas FROM notificacion WHERE usuario_id = ? AND leida = FALSE',
            [usuarioId]
        );
        
        res.json({
            success: true,
            data: notificaciones,
            total: notificaciones.length,
            no_leidas: countResult[0].no_leidas
        });
        
    } catch (error) {
        console.error('Error en obtenerMisNotificaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener notificaciones.'
        });
    }
};

/**
 * OBTENER CONTEO DE NO LEÍDAS
 * GET /api/notificaciones/count
 * Requiere autenticación
 * Útil para mostrar el badge en el icono de notificaciones
 */
const obtenerConteoNoLeidas = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        
        const [result] = await pool.execute(
            'SELECT COUNT(*) AS count FROM notificacion WHERE usuario_id = ? AND leida = FALSE',
            [usuarioId]
        );
        
        res.json({
            success: true,
            data: {
                no_leidas: result[0].count
            }
        });
        
    } catch (error) {
        console.error('Error en obtenerConteoNoLeidas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener conteo.'
        });
    }
};

/**
 * MARCAR NOTIFICACIÓN COMO LEÍDA
 * PATCH /api/notificaciones/:id/leer
 * Requiere autenticación
 */
const marcarComoLeida = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.usuario.id;
        
        // Verificamos que la notificación pertenezca al usuario
        const [notificaciones] = await pool.execute(
            'SELECT * FROM notificacion WHERE id = ? AND usuario_id = ?',
            [id, usuarioId]
        );
        
        if (notificaciones.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notificación no encontrada.'
            });
        }
        
        // Marcamos como leída
        await pool.execute(
            'UPDATE notificacion SET leida = TRUE WHERE id = ?',
            [id]
        );
        
        res.json({
            success: true,
            message: 'Notificación marcada como leída.'
        });
        
    } catch (error) {
        console.error('Error en marcarComoLeida:', error);
        res.status(500).json({
            success: false,
            message: 'Error al marcar notificación.'
        });
    }
};

/**
 * MARCAR TODAS COMO LEÍDAS
 * PATCH /api/notificaciones/leer-todas
 * Requiere autenticación
 */
const marcarTodasComoLeidas = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        
        const [result] = await pool.execute(
            'UPDATE notificacion SET leida = TRUE WHERE usuario_id = ? AND leida = FALSE',
            [usuarioId]
        );
        
        res.json({
            success: true,
            message: `${result.affectedRows} notificaciones marcadas como leídas.`
        });
        
    } catch (error) {
        console.error('Error en marcarTodasComoLeidas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al marcar notificaciones.'
        });
    }
};

/**
 * ELIMINAR NOTIFICACIÓN
 * DELETE /api/notificaciones/:id
 * Requiere autenticación
 */
const eliminar = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.usuario.id;
        
        const [result] = await pool.execute(
            'DELETE FROM notificacion WHERE id = ? AND usuario_id = ?',
            [id, usuarioId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notificación no encontrada.'
            });
        }
        
        res.json({
            success: true,
            message: 'Notificación eliminada.'
        });
        
    } catch (error) {
        console.error('Error en eliminar (notificacion):', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar notificación.'
        });
    }
};

// ============================================================
// EXPORTAMOS LAS FUNCIONES
// ============================================================

module.exports = {
    obtenerMisNotificaciones,
    obtenerConteoNoLeidas,
    marcarComoLeida,
    marcarTodasComoLeidas,
    eliminar
};
