// ============================================================
// CONTROLADOR DE ACTIVIDADES
// ============================================================
// CRUD de actividades para ubicaciones de vendedores
// ============================================================

const { pool } = require('../config/database');

/**
 * OBTENER ACTIVIDADES DE UNA UBICACIÓN
 * GET /api/ubicaciones/:ubicacionId/actividades
 */
const obtenerPorUbicacion = async (req, res) => {
    try {
        const { ubicacionId } = req.params;
        const [actividades] = await pool.execute(
            'SELECT * FROM actividad WHERE ubicacion_id = ? ORDER BY id ASC',
            [ubicacionId]
        );
        res.json({ success: true, data: actividades });
    } catch (error) {
        console.error('Error al obtener actividades:', error);
        res.status(500).json({ success: false, message: 'Error al obtener actividades' });
    }
};

/**
 * CREAR ACTIVIDAD
 * POST /api/ubicaciones/:ubicacionId/actividades
 */
const crear = async (req, res) => {
    try {
        const { ubicacionId } = req.params;
        const { nombre, descripcion, precio, duracion, horario } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({ success: false, message: 'El nombre es requerido' });
        }

        // Verificar que la ubicación existe y pertenece al vendedor
        const [ubicaciones] = await pool.execute(
            'SELECT id, vendedor_id FROM ubicacion WHERE id = ?',
            [ubicacionId]
        );

        if (ubicaciones.length === 0) {
            return res.status(404).json({ success: false, message: 'Ubicación no encontrada' });
        }

        if (ubicaciones[0].vendedor_id !== req.usuario.id && req.usuario.rol !== 'admin') {
            return res.status(403).json({ success: false, message: 'No tienes permiso para agregar actividades a esta ubicación' });
        }

        const [result] = await pool.execute(
            'INSERT INTO actividad (ubicacion_id, nombre, descripcion, precio, duracion, horario) VALUES (?, ?, ?, ?, ?, ?)',
            [ubicacionId, nombre.trim(), descripcion || null, precio || null, duracion || null, horario || null]
        );

        const [nueva] = await pool.execute('SELECT * FROM actividad WHERE id = ?', [result.insertId]);

        res.status(201).json({
            success: true,
            message: 'Actividad creada exitosamente',
            data: nueva[0]
        });
    } catch (error) {
        console.error('Error al crear actividad:', error);
        res.status(500).json({ success: false, message: 'Error al crear la actividad' });
    }
};

/**
 * ACTUALIZAR ACTIVIDAD
 * PUT /api/ubicaciones/:ubicacionId/actividades/:id
 */
const actualizar = async (req, res) => {
    try {
        const { ubicacionId, id } = req.params;
        const { nombre, descripcion, precio, duracion, horario } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({ success: false, message: 'El nombre es requerido' });
        }

        // Verificar que la actividad existe y pertenece a una ubicación del vendedor
        const [actividades] = await pool.execute(
            `SELECT a.id, u.vendedor_id
             FROM actividad a
             INNER JOIN ubicacion u ON a.ubicacion_id = u.id
             WHERE a.id = ? AND a.ubicacion_id = ?`,
            [id, ubicacionId]
        );

        if (actividades.length === 0) {
            return res.status(404).json({ success: false, message: 'Actividad no encontrada' });
        }

        if (actividades[0].vendedor_id !== req.usuario.id && req.usuario.rol !== 'admin') {
            return res.status(403).json({ success: false, message: 'No tienes permiso para editar esta actividad' });
        }

        await pool.execute(
            'UPDATE actividad SET nombre = ?, descripcion = ?, precio = ?, duracion = ?, horario = ? WHERE id = ?',
            [nombre.trim(), descripcion || null, precio || null, duracion || null, horario || null, id]
        );

        const [actualizada] = await pool.execute('SELECT * FROM actividad WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Actividad actualizada exitosamente',
            data: actualizada[0]
        });
    } catch (error) {
        console.error('Error al actualizar actividad:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar la actividad' });
    }
};

/**
 * ELIMINAR ACTIVIDAD
 * DELETE /api/ubicaciones/:ubicacionId/actividades/:id
 */
const eliminar = async (req, res) => {
    try {
        const { ubicacionId, id } = req.params;

        // Verificar ownership
        const [actividades] = await pool.execute(
            `SELECT a.id, u.vendedor_id
             FROM actividad a
             INNER JOIN ubicacion u ON a.ubicacion_id = u.id
             WHERE a.id = ? AND a.ubicacion_id = ?`,
            [id, ubicacionId]
        );

        if (actividades.length === 0) {
            return res.status(404).json({ success: false, message: 'Actividad no encontrada' });
        }

        if (actividades[0].vendedor_id !== req.usuario.id && req.usuario.rol !== 'admin') {
            return res.status(403).json({ success: false, message: 'No tienes permiso para eliminar esta actividad' });
        }

        await pool.execute('DELETE FROM actividad WHERE id = ?', [id]);

        res.json({ success: true, message: 'Actividad eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar actividad:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar la actividad' });
    }
};

module.exports = {
    obtenerPorUbicacion,
    crear,
    actualizar,
    eliminar
};
