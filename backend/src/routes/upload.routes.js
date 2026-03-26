// ============================================================
// RUTAS DE SUBIDA DE ARCHIVOS
// ============================================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verificarToken } = require('../middlewares/auth.middleware');

// Configuracion de almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', '..', 'uploads'));
    },
    filename: (req, file, cb) => {
        // nombre unico: timestamp-random.extension
        const ext = path.extname(file.originalname).toLowerCase();
        const nombre = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
        cb(null, nombre);
    }
});

// Filtro: solo imagenes
const fileFilter = (req, file, cb) => {
    const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (tiposPermitidos.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imagenes (jpg, png, webp, gif)'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    }
});

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Subir una imagen
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               imagen:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Imagen subida exitosamente
 *       400:
 *         description: Error en la subida
 */
router.post('/', verificarToken, (req, res) => {
    upload.single('imagen')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'La imagen no puede pesar mas de 5MB.'
                });
            }
            return res.status(400).json({
                success: false,
                message: 'Error al subir la imagen.'
            });
        }

        if (err) {
            return res.status(400).json({
                success: false,
                message: err.message || 'Error al subir la imagen.'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No se envio ninguna imagen.'
            });
        }

        // Retornar la URL relativa
        const imageUrl = `/uploads/${req.file.filename}`;

        res.json({
            success: true,
            message: 'Imagen subida exitosamente.',
            data: {
                url: imageUrl,
                filename: req.file.filename,
                size: req.file.size
            }
        });
    });
});

module.exports = router;
