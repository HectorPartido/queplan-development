// ============================================================
// RUTAS DE REPORTES
// ============================================================

const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporte.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Conteo de pendientes (admin) - antes de /:id
router.get('/count', verificarToken, verificarRol('admin'), reporteController.obtenerConteo);

// Listar todos los reportes (admin)
router.get('/', verificarToken, verificarRol('admin'), reporteController.obtenerTodos);

// Crear reporte (cualquier usuario logueado)
router.post('/', verificarToken, reporteController.crear);

// Cambiar estado de reporte (admin)
router.patch('/:id/estado', verificarToken, verificarRol('admin'), reporteController.cambiarEstado);

// Eliminar elemento reportado (admin)
router.delete('/:id/eliminar-elemento', verificarToken, verificarRol('admin'), reporteController.eliminarElemento);

module.exports = router;
