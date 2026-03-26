// ============================================================
// RUTAS DE ACTIVIDADES
// ============================================================
// Anidadas bajo /api/ubicaciones/:ubicacionId/actividades
// ============================================================

const express = require('express');
const router = express.Router({ mergeParams: true });
const actividadController = require('../controllers/actividad.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Actividades
 *   description: Gestión de actividades por ubicación
 */

/**
 * @swagger
 * /api/ubicaciones/{ubicacionId}/actividades:
 *   get:
 *     summary: Obtener actividades de una ubicación
 *     tags: [Actividades]
 *     parameters:
 *       - in: path
 *         name: ubicacionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de actividades
 */
router.get('/', actividadController.obtenerPorUbicacion);

/**
 * @swagger
 * /api/ubicaciones/{ubicacionId}/actividades:
 *   post:
 *     summary: Crear actividad para una ubicación
 *     tags: [Actividades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ubicacionId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *             properties:
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               precio:
 *                 type: number
 *               duracion:
 *                 type: string
 *               horario:
 *                 type: string
 *     responses:
 *       201:
 *         description: Actividad creada
 */
router.post('/', verificarToken, verificarRol('vendedor', 'admin'), actividadController.crear);

/**
 * @swagger
 * /api/ubicaciones/{ubicacionId}/actividades/{id}:
 *   put:
 *     summary: Actualizar actividad
 *     tags: [Actividades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ubicacionId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Actividad actualizada
 */
router.put('/:id', verificarToken, verificarRol('vendedor', 'admin'), actividadController.actualizar);

/**
 * @swagger
 * /api/ubicaciones/{ubicacionId}/actividades/{id}:
 *   delete:
 *     summary: Eliminar actividad
 *     tags: [Actividades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ubicacionId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Actividad eliminada
 */
router.delete('/:id', verificarToken, verificarRol('vendedor', 'admin'), actividadController.eliminar);

module.exports = router;
