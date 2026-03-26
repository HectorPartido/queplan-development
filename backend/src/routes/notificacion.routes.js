// ============================================================
// RUTAS DE NOTIFICACIONES
// ============================================================

const express = require('express');
const router = express.Router();
const notificacionController = require('../controllers/notificacion.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Todas las rutas de notificaciones requieren autenticación
router.use(verificarToken);

/**
 * @swagger
 * tags:
 *   name: Notificaciones
 *   description: Gestión de notificaciones del usuario
 */

/**
 * @swagger
 * /api/notificaciones:
 *   get:
 *     summary: Obtener mis notificaciones
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: leidas
 *         schema:
 *           type: boolean
 *         description: Filtrar por leídas/no leídas
 *     responses:
 *       200:
 *         description: Lista de notificaciones
 */
router.get('/', notificacionController.obtenerMisNotificaciones);

/**
 * @swagger
 * /api/notificaciones/count:
 *   get:
 *     summary: Obtener conteo de notificaciones no leídas
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conteo de no leídas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     no_leidas:
 *                       type: integer
 */
router.get('/count', notificacionController.obtenerConteoNoLeidas);

/**
 * @swagger
 * /api/notificaciones/leer-todas:
 *   patch:
 *     summary: Marcar todas las notificaciones como leídas
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notificaciones marcadas
 */
router.patch('/leer-todas', notificacionController.marcarTodasComoLeidas);

/**
 * @swagger
 * /api/notificaciones/{id}/leer:
 *   patch:
 *     summary: Marcar una notificación como leída
 *     tags: [Notificaciones]
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
 *         description: Notificación marcada
 *       404:
 *         description: No encontrada
 */
router.patch('/:id/leer', notificacionController.marcarComoLeida);

/**
 * @swagger
 * /api/notificaciones/{id}:
 *   delete:
 *     summary: Eliminar una notificación
 *     tags: [Notificaciones]
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
 *         description: Notificación eliminada
 *       404:
 *         description: No encontrada
 */
router.delete('/:id', notificacionController.eliminar);

module.exports = router;
