// ============================================================
// RUTAS DE AUTENTICACIÓN
// ============================================================
// Define los endpoints relacionados con usuarios y sesiones
// Incluye documentación Swagger para cada ruta
// ============================================================

const express = require('express');
const router = express.Router();

// Importamos el controlador
const authController = require('../controllers/auth.controller');

// Importamos los middlewares de autenticación
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// ============================================================
// ¿QUÉ ES UN ROUTER?
// ============================================================
// Un router en Express es como un "mini-aplicación" que agrupa
// rutas relacionadas. Esto nos permite organizar mejor el código.
//
// En lugar de tener todo en app.js:
//   app.post('/api/auth/login', ...)
//   app.post('/api/auth/registro', ...)
//   app.get('/api/ubicaciones', ...)
//
// Separamos en archivos:
//   auth.routes.js → rutas de /api/auth/*
//   ubicacion.routes.js → rutas de /api/ubicaciones/*
// ============================================================

// ============================================================
// DOCUMENTACIÓN SWAGGER
// ============================================================
// Las anotaciones /** @swagger ... */ son leídas por swagger-jsdoc
// y generan la documentación automáticamente en /api-docs
// ============================================================

/**
 * @swagger
 * tags:
 *   name: Autenticación
 *   description: Endpoints para registro, login y gestión de perfil
 */

/**
 * @swagger
 * /api/auth/registro:
 *   post:
 *     summary: Registrar nuevo usuario
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - email
 *               - password
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Juan Pérez
 *               email:
 *                 type: string
 *                 format: email
 *                 example: juan@email.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: miPassword123
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Usuario registrado exitosamente.
 *                 data:
 *                   type: object
 *                   properties:
 *                     usuario:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         nombre:
 *                           type: string
 *                         email:
 *                           type: string
 *                         rol:
 *                           type: string
 *                     token:
 *                       type: string
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: Email ya registrado
 */
router.post('/registro', authController.registro);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@queplan.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Inicio de sesión exitoso.
 *                 data:
 *                   type: object
 *                   properties:
 *                     usuario:
 *                       type: object
 *                     token:
 *                       type: string
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login', authController.login);

// ============================================================
// RECUPERACION DE CONTRASEÑA
// ============================================================

/**
 * @swagger
 * /api/auth/recuperar:
 *   post:
 *     summary: Solicitar codigo de recuperacion de contraseña
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Codigo enviado (siempre responde exito por seguridad)
 */
router.post('/recuperar', authController.solicitarRecuperacion);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Restablecer contraseña con codigo de recuperacion
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, codigo, nueva_password]
 *             properties:
 *               email:
 *                 type: string
 *               codigo:
 *                 type: string
 *               nueva_password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 *       400:
 *         description: Codigo invalido o expirado
 */
router.post('/reset-password', authController.resetearPassword);

/**
 * @swagger
 * /api/auth/perfil:
 *   get:
 *     summary: Obtener perfil del usuario actual
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido exitosamente
 *       401:
 *         description: No autenticado
 */
router.get('/perfil', verificarToken, authController.obtenerPerfil);

/**
 * @swagger
 * /api/auth/perfil:
 *   put:
 *     summary: Actualizar perfil del usuario
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *       401:
 *         description: No autenticado
 */
router.put('/perfil', verificarToken, authController.actualizarPerfil);

/**
 * @swagger
 * /api/auth/cambiar-password:
 *   put:
 *     summary: Cambiar contraseña
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - passwordActual
 *               - passwordNuevo
 *             properties:
 *               passwordActual:
 *                 type: string
 *               passwordNuevo:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 *       401:
 *         description: Contraseña actual incorrecta
 */
router.put('/cambiar-password', verificarToken, authController.cambiarPassword);

/**
 * @swagger
 * /api/auth/usuarios:
 *   get:
 *     summary: Obtener todos los usuarios (solo admin)
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios
 */
router.get('/usuarios', verificarToken, verificarRol('admin'), authController.obtenerUsuarios);

/**
 * @swagger
 * /api/auth/usuarios/{id}/rol:
 *   patch:
 *     summary: Cambiar rol de usuario (solo admin)
 *     tags: [Autenticación]
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
 *               rol:
 *                 type: string
 *                 enum: [usuario, vendedor, admin]
 *     responses:
 *       200:
 *         description: Rol actualizado
 */
router.patch('/usuarios/:id/rol', verificarToken, verificarRol('admin'), authController.cambiarRol);

/**
 * @swagger
 * /api/auth/usuarios/{id}/estado:
 *   patch:
 *     summary: Activar/desactivar usuario (solo admin)
 *     tags: [Autenticación]
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
 *               activo:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Estado actualizado
 */
router.patch('/usuarios/:id/estado', verificarToken, verificarRol('admin'), authController.cambiarEstadoUsuario);

// ============================================================
// EXPORTAMOS EL ROUTER
// ============================================================

module.exports = router;
