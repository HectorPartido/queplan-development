// ============================================================
// CONTROLADOR DE MOODS
// ============================================================
// Maneja las operaciones CRUD para los moods (categorías)
// Los moods son: Playa, Naturaleza, Gastronomía, etc.
// ============================================================

const { pool } = require('../config/database');

/**
 * OBTENER TODOS LOS MOODS
 * GET /api/moods
 * Público - No requiere autenticación
 */
const obtenerTodos = async (req, res) => {
    try {
        // Ejecutamos la consulta SQL
        // SELECT * FROM mood → Obtiene todas las columnas de todos los registros
        const [rows] = await pool.execute('SELECT * FROM mood ORDER BY nombre');
        
        // Respondemos con los datos
        res.json({
            success: true,
            data: rows,
            total: rows.length
        });
        
    } catch (error) {
        console.error('Error en obtenerTodos (moods):', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener moods.'
        });
    }
};

/**
 * OBTENER UN MOOD POR ID
 * GET /api/moods/:id
 * Público
 */
const obtenerPorId = async (req, res) => {
    try {
        // req.params contiene los parámetros de la URL
        // En /api/moods/5, req.params.id sería "5"
        const { id } = req.params;
        
        // Usamos ? como placeholder para prevenir SQL Injection
        // El valor real se pasa en el array [id]
        const [rows] = await pool.execute(
            'SELECT * FROM mood WHERE id = ?',
            [id]
        );
        
        // Si no se encuentra, devolvemos 404
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Mood no encontrado.'
            });
        }
        
        res.json({
            success: true,
            data: rows[0]
        });
        
    } catch (error) {
        console.error('Error en obtenerPorId (mood):', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener mood.'
        });
    }
};

/**
 * OBTENER UBICACIONES POR MOOD
 * GET /api/moods/:id/ubicaciones
 * Público - Devuelve todas las ubicaciones que tienen este mood
 */
const obtenerUbicacionesPorMood = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Primero verificamos que el mood exista
        const [mood] = await pool.execute('SELECT * FROM mood WHERE id = ?', [id]);
        
        if (mood.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Mood no encontrado.'
            });
        }
        
        // Obtenemos las ubicaciones con este mood
        // JOIN conecta las tablas a través de la tabla intermedia
        const [ubicaciones] = await pool.execute(`
            SELECT u.*, 
                   us.nombre AS vendedor_nombre,
                   (SELECT AVG(estrellas) FROM calificacion WHERE ubicacion_id = u.id) AS promedio_calificacion,
                   (SELECT COUNT(*) FROM calificacion WHERE ubicacion_id = u.id) AS total_calificaciones
            FROM ubicacion u
            INNER JOIN ubicacion_mood um ON u.id = um.ubicacion_id
            INNER JOIN usuario us ON u.vendedor_id = us.id
            WHERE um.mood_id = ? AND u.estado = 'aprobada'
            ORDER BY u.nombre
        `, [id]);
        
        res.json({
            success: true,
            data: {
                mood: mood[0],
                ubicaciones: ubicaciones,
                total: ubicaciones.length
            }
        });
        
    } catch (error) {
        console.error('Error en obtenerUbicacionesPorMood:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener ubicaciones por mood.'
        });
    }
};

// ============================================================
// EXPORTAMOS LAS FUNCIONES
// ============================================================

module.exports = {
    obtenerTodos,
    obtenerPorId,
    obtenerUbicacionesPorMood
};
