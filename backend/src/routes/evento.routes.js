// ============================================================
// RUTAS DE EVENTOS
// ============================================================

const express = require('express');
const router = express.Router();
const eventoController = require('../controllers/evento.controller');
const { verificarToken, verificarRol, autenticacionOpcional } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Eventos
 *   description: Gestión de eventos y llamados a la ayuda (ODS)
 */

/**
 * @swagger
 * /api/eventos:
 *   get:
 *     summary: Obtener todos los eventos
 *     tags: [Eventos]
 *     parameters:
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [ods, general]
 *         description: Filtrar por tipo
 *       - in: query
 *         name: activo
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado activo
 *     responses:
 *       200:
 *         description: Lista de eventos
 */
router.get('/', eventoController.obtenerTodos);

/**
 * @swagger
 * /api/eventos/ods:
 *   get:
 *     summary: Obtener solo eventos ODS (Llamado a la ayuda)
 *     tags: [Eventos]
 *     responses:
 *       200:
 *         description: Lista de eventos ODS
 */
router.get('/ods', eventoController.obtenerEventosODS);

/**
 * @swagger
 * /api/eventos/pendientes:
 *   get:
 *     summary: Obtener eventos pendientes de aprobación (solo admin)
 *     tags: [Eventos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de eventos pendientes
 */
router.get('/pendientes', verificarToken, verificarRol('admin'), eventoController.obtenerPendientes);

/**
 * @swagger
 * /api/eventos/mis-eventos:
 *   get:
 *     summary: Obtener mis eventos (vendedor/admin)
 *     tags: [Eventos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de eventos del usuario
 */
router.get('/mis-eventos', verificarToken, verificarRol('vendedor', 'admin'), eventoController.obtenerMisEventos);

/**
 * @swagger
 * /api/eventos/asistencia/resumen:
 *   get:
 *     summary: Obtener resumen de asistencia de todos los eventos (solo admin)
 *     tags: [Eventos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resumen de asistencia
 */
router.get('/asistencia/resumen', verificarToken, verificarRol('admin'), eventoController.obtenerResumenAsistencia);

/**
 * @swagger
 * /api/eventos/{id}:
 *   get:
 *     summary: Obtener un evento por ID
 *     tags: [Eventos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Evento encontrado
 *       404:
 *         description: No encontrado
 */
router.get('/:id', eventoController.obtenerPorId);

/**
 * @swagger
 * /api/eventos/{id}/asistencia:
 *   get:
 *     summary: Obtener conteo de asistencia y si el usuario asiste
 *     tags: [Eventos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Datos de asistencia
 */
router.get('/:id/asistencia', autenticacionOpcional, eventoController.obtenerAsistencia);

/**
 * @swagger
 * /api/eventos/{id}/asistencia:
 *   post:
 *     summary: Toggle asistencia a un evento (asistir/cancelar)
 *     tags: [Eventos]
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
 *         description: Asistencia registrada o cancelada
 */
router.post('/:id/asistencia', verificarToken, eventoController.toggleAsistencia);

/**
 * @swagger
 * /api/eventos/{id}/asistentes:
 *   get:
 *     summary: Obtener lista de asistentes (admin o creador)
 *     tags: [Eventos]
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
 *         description: Lista de asistentes
 */
router.get('/:id/asistentes', verificarToken, eventoController.obtenerAsistentes);

/**
 * @swagger
 * /api/eventos:
 *   post:
 *     summary: Crear nuevo evento
 *     description: Si el tipo es 'ods', genera notificaciones a todos los usuarios
 *     tags: [Eventos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - titulo
 *               - fecha
 *               - hora
 *               - tipo
 *             properties:
 *               titulo:
 *                 type: string
 *                 example: "🐢 Protección de Tortugas Marinas"
 *               descripcion:
 *                 type: string
 *               fecha:
 *                 type: string
 *                 format: date
 *                 example: "2025-07-15"
 *               hora:
 *                 type: string
 *                 format: time
 *                 example: "20:00"
 *               tipo:
 *                 type: string
 *                 enum: [ods, general]
 *               ubicacion_id:
 *                 type: integer
 *               imagen_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Evento creado
 *       400:
 *         description: Datos inválidos
 */
router.post('/', verificarToken, verificarRol('vendedor', 'admin'), eventoController.crear);

/**
 * @swagger
 * /api/eventos/{id}:
 *   put:
 *     summary: Actualizar evento
 *     tags: [Eventos]
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
 *         description: Evento actualizado
 */
router.put('/:id', verificarToken, eventoController.actualizar);

/**
 * @swagger
 * /api/eventos/{id}/estado:
 *   patch:
 *     summary: Aprobar o rechazar evento (solo admin)
 *     tags: [Eventos]
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
router.patch('/:id/estado', verificarToken, verificarRol('admin'), eventoController.cambiarEstadoEvento);

/**
 * @swagger
 * /api/eventos/{id}:
 *   delete:
 *     summary: Eliminar evento
 *     tags: [Eventos]
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
 *         description: Evento eliminado
 */
router.delete('/:id', verificarToken, eventoController.eliminar);

module.exports = router;
