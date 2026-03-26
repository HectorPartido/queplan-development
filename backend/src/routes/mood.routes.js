// ============================================================
// RUTAS DE MOODS
// ============================================================

const express = require('express');
const router = express.Router();
const moodController = require('../controllers/mood.controller');

/**
 * @swagger
 * tags:
 *   name: Moods
 *   description: Categorías de ambiente para las ubicaciones
 */

/**
 * @swagger
 * /api/moods:
 *   get:
 *     summary: Obtener todos los moods
 *     tags: [Moods]
 *     responses:
 *       200:
 *         description: Lista de moods
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       nombre:
 *                         type: string
 *                       icono:
 *                         type: string
 *                       descripcion:
 *                         type: string
 */
router.get('/', moodController.obtenerTodos);

/**
 * @swagger
 * /api/moods/{id}:
 *   get:
 *     summary: Obtener un mood por ID
 *     tags: [Moods]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del mood
 *     responses:
 *       200:
 *         description: Mood encontrado
 *       404:
 *         description: Mood no encontrado
 */
router.get('/:id', moodController.obtenerPorId);

/**
 * @swagger
 * /api/moods/{id}/ubicaciones:
 *   get:
 *     summary: Obtener ubicaciones por mood
 *     tags: [Moods]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del mood
 *     responses:
 *       200:
 *         description: Lista de ubicaciones con este mood
 *       404:
 *         description: Mood no encontrado
 */
router.get('/:id/ubicaciones', moodController.obtenerUbicacionesPorMood);

module.exports = router;
