// ============================================================
// CONTROLADOR DE REPORTES
// ============================================================
// Permite a usuarios reportar ubicaciones, eventos y actividades
// Los admins revisan, resuelven y toman acciones
// ============================================================

const { pool } = require('../config/database');

// Motivos disponibles para reportar
const MOTIVOS_VALIDOS = ['informacion_falsa', 'contenido_inapropiado', 'estafa', 'peligroso', 'spam', 'otro'];
const TIPOS_VALIDOS = ['ubicacion', 'evento', 'actividad'];

/**
 * CREAR REPORTE
 * POST /api/reportes
 * Requiere autenticacion
 */
const crear = async (req, res) => {
    try {
        const { tipo, referencia_id, motivo, descripcion } = req.body;
        const usuarioId = req.usuario.id;

        // Validaciones
        if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo debe ser "ubicacion", "evento" o "actividad".'
            });
        }

        if (!referencia_id) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere el ID del elemento a reportar.'
            });
        }

        if (!motivo || !MOTIVOS_VALIDOS.includes(motivo)) {
            return res.status(400).json({
                success: false,
                message: 'Motivo de reporte invalido.'
            });
        }

        // Verificar que el elemento referenciado existe
        let tabla;
        if (tipo === 'ubicacion') tabla = 'ubicacion';
        else if (tipo === 'evento') tabla = 'evento';
        else tabla = 'actividad';

        const [existe] = await pool.execute(
            `SELECT id FROM ${tabla} WHERE id = ?`, [referencia_id]
        );

        if (existe.length === 0) {
            return res.status(404).json({
                success: false,
                message: `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} no encontrada.`
            });
        }

        // Verificar que no haya reportado lo mismo ya (pendiente)
        const [reporteExistente] = await pool.execute(
            'SELECT id FROM reporte WHERE usuario_id = ? AND tipo = ? AND referencia_id = ? AND estado = ?',
            [usuarioId, tipo, referencia_id, 'pendiente']
        );

        if (reporteExistente.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Ya tienes un reporte pendiente para este elemento.'
            });
        }

        // Crear el reporte
        await pool.execute(
            'INSERT INTO reporte (usuario_id, tipo, referencia_id, motivo, descripcion) VALUES (?, ?, ?, ?, ?)',
            [usuarioId, tipo, referencia_id, motivo, descripcion || null]
        );

        // Notificar a admins
        const [admins] = await pool.execute(
            "SELECT id FROM usuario WHERE activo = TRUE AND rol = 'admin'"
        );

        const motivoTexto = {
            informacion_falsa: 'Informacion falsa',
            contenido_inapropiado: 'Contenido inapropiado',
            estafa: 'Posible estafa',
            peligroso: 'Lugar/evento peligroso',
            spam: 'Spam',
            otro: 'Otro motivo'
        };

        // Obtener nombre del elemento para el mensaje
        let nombreElemento = '';
        if (tipo === 'ubicacion') {
            const [elem] = await pool.execute('SELECT nombre FROM ubicacion WHERE id = ?', [referencia_id]);
            nombreElemento = elem[0]?.nombre || '';
        } else if (tipo === 'evento') {
            const [elem] = await pool.execute('SELECT titulo FROM evento WHERE id = ?', [referencia_id]);
            nombreElemento = elem[0]?.titulo || '';
        } else {
            const [elem] = await pool.execute('SELECT nombre FROM actividad WHERE id = ?', [referencia_id]);
            nombreElemento = elem[0]?.nombre || '';
        }

        const mensaje = `⚠️ Nuevo reporte: ${motivoTexto[motivo]} en ${tipo}${nombreElemento ? ` "${nombreElemento}"` : ''}`;
        const url = '/pages/admin.html#reportes';

        for (const admin of admins) {
            await pool.execute(
                'INSERT INTO notificacion (usuario_id, mensaje, url) VALUES (?, ?, ?)',
                [admin.id, mensaje, url]
            );
        }

        res.status(201).json({
            success: true,
            message: 'Reporte enviado. Un administrador lo revisara pronto.'
        });

    } catch (error) {
        console.error('Error en crear reporte:', error);
        res.status(500).json({
            success: false,
            message: 'Error al enviar el reporte.'
        });
    }
};

/**
 * OBTENER TODOS LOS REPORTES (admin)
 * GET /api/reportes
 * Solo admin
 * Query: estado (pendiente, revisado, resuelto)
 */
const obtenerTodos = async (req, res) => {
    try {
        const { estado } = req.query;

        let sql = `
            SELECT
                r.*,
                u.nombre AS reportado_por,
                u.email AS email_reportador,
                CASE
                    WHEN r.tipo = 'ubicacion' THEN (SELECT nombre FROM ubicacion WHERE id = r.referencia_id)
                    WHEN r.tipo = 'evento' THEN (SELECT titulo FROM evento WHERE id = r.referencia_id)
                    WHEN r.tipo = 'actividad' THEN (SELECT nombre FROM actividad WHERE id = r.referencia_id)
                END AS nombre_elemento,
                adm.nombre AS resuelto_por_nombre
            FROM reporte r
            INNER JOIN usuario u ON r.usuario_id = u.id
            LEFT JOIN usuario adm ON r.resuelto_por = adm.id
        `;

        const valores = [];

        if (estado && ['pendiente', 'revisado', 'resuelto'].includes(estado)) {
            sql += ' WHERE r.estado = ?';
            valores.push(estado);
        }

        sql += ' ORDER BY r.fecha_creacion DESC';

        const [reportes] = await pool.execute(sql, valores);

        // Conteo por estado
        const [conteos] = await pool.execute(`
            SELECT estado, COUNT(*) as total FROM reporte GROUP BY estado
        `);
        const conteo = { pendiente: 0, revisado: 0, resuelto: 0 };
        conteos.forEach(c => { conteo[c.estado] = c.total; });

        res.json({
            success: true,
            data: reportes,
            total: reportes.length,
            conteo
        });

    } catch (error) {
        console.error('Error en obtenerTodos reportes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener reportes.'
        });
    }
};

/**
 * CAMBIAR ESTADO DE REPORTE (admin)
 * PATCH /api/reportes/:id/estado
 * Solo admin
 */
const cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, nota_admin } = req.body;
        const adminId = req.usuario.id;

        if (!estado || !['revisado', 'resuelto'].includes(estado)) {
            return res.status(400).json({
                success: false,
                message: 'Estado debe ser "revisado" o "resuelto".'
            });
        }

        const [reportes] = await pool.execute('SELECT * FROM reporte WHERE id = ?', [id]);

        if (reportes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Reporte no encontrado.'
            });
        }

        await pool.execute(
            'UPDATE reporte SET estado = ?, nota_admin = COALESCE(?, nota_admin), resuelto_por = ?, fecha_resolucion = NOW() WHERE id = ?',
            [estado, nota_admin ?? null, adminId, id]
        );

        res.json({
            success: true,
            message: `Reporte marcado como ${estado}.`
        });

    } catch (error) {
        console.error('Error en cambiarEstado reporte:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el reporte.'
        });
    }
};

/**
 * ELIMINAR ELEMENTO REPORTADO (admin)
 * DELETE /api/reportes/:id/eliminar-elemento
 * Solo admin - Elimina el elemento y resuelve el reporte
 */
const eliminarElemento = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.usuario.id;

        const [reportes] = await pool.execute('SELECT * FROM reporte WHERE id = ?', [id]);

        if (reportes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Reporte no encontrado.'
            });
        }

        const reporte = reportes[0];
        let tabla;
        if (reporte.tipo === 'ubicacion') tabla = 'ubicacion';
        else if (reporte.tipo === 'evento') tabla = 'evento';
        else tabla = 'actividad';

        // Eliminar el elemento
        const [result] = await pool.execute(`DELETE FROM ${tabla} WHERE id = ?`, [reporte.referencia_id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'El elemento ya fue eliminado.'
            });
        }

        // Resolver este y todos los reportes pendientes del mismo elemento
        await pool.execute(
            'UPDATE reporte SET estado = ?, nota_admin = ?, resuelto_por = ?, fecha_resolucion = NOW() WHERE tipo = ? AND referencia_id = ? AND estado IN (?, ?)',
            ['resuelto', 'Elemento eliminado por administrador', adminId, reporte.tipo, reporte.referencia_id, 'pendiente', 'revisado']
        );

        res.json({
            success: true,
            message: `${reporte.tipo.charAt(0).toUpperCase() + reporte.tipo.slice(1)} eliminada y reporte resuelto.`
        });

    } catch (error) {
        console.error('Error en eliminarElemento:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el elemento reportado.'
        });
    }
};

/**
 * OBTENER CONTEO DE REPORTES PENDIENTES (admin)
 * GET /api/reportes/count
 * Solo admin
 */
const obtenerConteo = async (req, res) => {
    try {
        const [result] = await pool.execute(
            "SELECT COUNT(*) as total FROM reporte WHERE estado = 'pendiente'"
        );
        res.json({ success: true, total: result[0].total });
    } catch (error) {
        console.error('Error en obtenerConteo reportes:', error);
        res.status(500).json({ success: false, message: 'Error al obtener conteo.' });
    }
};

module.exports = {
    crear,
    obtenerTodos,
    cambiarEstado,
    eliminarElemento,
    obtenerConteo
};
