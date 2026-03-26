// ============================================================
// RUTAS DE UBICACIONES
// ============================================================

const express = require('express');
const router = express.Router();
const ubicacionController = require('../controllers/ubicacion.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Ubicaciones
 *   description: Gestión de ubicaciones del mapa
 */

/**
 * @swagger
 * /api/ubicaciones:
 *   get:
 *     summary: Obtener todas las ubicaciones (con filtros opcionales)
 *     tags: [Ubicaciones]
 *     parameters:
 *       - in: query
 *         name: precioMin
 *         schema:
 *           type: number
 *         description: Precio mínimo
 *       - in: query
 *         name: precioMax
 *         schema:
 *           type: number
 *         description: Precio máximo
 *       - in: query
 *         name: mood
 *         schema:
 *           type: integer
 *         description: ID del mood
 *       - in: query
 *         name: buscar
 *         schema:
 *           type: string
 *         description: Texto a buscar
 *     responses:
 *       200:
 *         description: Lista de ubicaciones
 */
router.get('/', ubicacionController.obtenerTodas);

/**
 * @swagger
 * /api/ubicaciones/favoritos:
 *   get:
 *     summary: Obtener mis ubicaciones favoritas
 *     tags: [Ubicaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de favoritos
 */
router.get('/favoritos', verificarToken, ubicacionController.obtenerFavoritos);

/**
 * @swagger
 * /api/ubicaciones/pendientes:
 *   get:
 *     summary: Obtener solicitudes pendientes (solo admin)
 *     tags: [Ubicaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de solicitudes
 */
router.get('/pendientes', verificarToken, verificarRol('admin'), ubicacionController.obtenerPendientes);
router.get('/admin/todas', verificarToken, verificarRol('admin'), ubicacionController.obtenerTodasAdmin);

/**
 * @swagger
 * /api/ubicaciones/mis-ubicaciones:
 *   get:
 *     summary: Obtener mis ubicaciones (vendedor)
 *     tags: [Ubicaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de ubicaciones del vendedor
 */
router.get('/mis-ubicaciones', verificarToken, verificarRol('vendedor', 'admin'), ubicacionController.obtenerMisUbicaciones);

/**
 * @swagger
 * /api/ubicaciones/{id}:
 *   get:
 *     summary: Obtener una ubicación por ID
 *     tags: [Ubicaciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ubicación encontrada
 *       404:
 *         description: No encontrada
 */
router.get('/:id', ubicacionController.obtenerPorId);

/**
 * @swagger
 * /api/ubicaciones:
 *   post:
 *     summary: Crear nueva ubicación
 *     tags: [Ubicaciones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - latitud
 *               - longitud
 *               - precio_promedio
 *             properties:
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               latitud:
 *                 type: number
 *               longitud:
 *                 type: number
 *               precio_promedio:
 *                 type: number
 *               moods:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Ubicación creada
 */
router.post('/', verificarToken, verificarRol('vendedor', 'admin'), ubicacionController.crear);

/**
 * @swagger
 * /api/ubicaciones/{id}:
 *   put:
 *     summary: Actualizar ubicación
 *     tags: [Ubicaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ubicación actualizada
 */
router.put('/:id', verificarToken, verificarRol('vendedor', 'admin'), ubicacionController.actualizar);

/**
 * @swagger
 * /api/ubicaciones/{id}:
 *   delete:
 *     summary: Eliminar ubicación
 *     tags: [Ubicaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ubicación eliminada
 */
router.delete('/:id', verificarToken, verificarRol('vendedor', 'admin'), ubicacionController.eliminar);

/**
 * @swagger
 * /api/ubicaciones/{id}/estado:
 *   patch:
 *     summary: Aprobar o rechazar ubicación (solo admin)
 *     tags: [Ubicaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [aprobada, rechazada]
 *     responses:
 *       200:
 *         description: Estado actualizado
 */
router.patch('/:id/estado', verificarToken, verificarRol('admin'), ubicacionController.cambiarEstado);

/**
 * @swagger
 * /api/ubicaciones/{id}/calificar:
 *   post:
 *     summary: Calificar ubicación (1-5 estrellas)
 *     tags: [Ubicaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estrellas:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       201:
 *         description: Calificación registrada
 */
router.post('/:id/calificar', verificarToken, ubicacionController.calificar);

/**
 * @swagger
 * /api/ubicaciones/{id}/favorito:
 *   post:
 *     summary: Agregar a favoritos
 *     tags: [Ubicaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Agregado a favoritos
 */
router.post('/:id/favorito', verificarToken, ubicacionController.agregarFavorito);

/**
 * @swagger
 * /api/ubicaciones/{id}/favorito:
 *   delete:
 *     summary: Quitar de favoritos
 *     tags: [Ubicaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Eliminado de favoritos
 */
router.delete('/:id/favorito', verificarToken, ubicacionController.quitarFavorito);

module.exports = router;
