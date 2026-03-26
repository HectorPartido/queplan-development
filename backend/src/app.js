// ============================================================
// CONFIGURACIÓN DE EXPRESS (app.js)
// ============================================================
// Este archivo configura Express y todos sus middlewares
// Es el "corazón" de nuestra aplicación backend
// ============================================================

// ------------------------------------------------------------
// IMPORTACIONES
// ------------------------------------------------------------

// Express: framework para crear servidores web en Node.js
const express = require('express');

// CORS: permite que el frontend se comunique con el backend
// Sin esto, el navegador bloquearía las peticiones por seguridad
const cors = require('cors');

// Path: utilidad de Node.js para manejar rutas de archivos
const path = require('path');

// Swagger: para documentación de la API
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Ruta al frontend
const FRONTEND_PATH = path.join(__dirname, '..', '..', 'frontend');

// Cargamos las variables de entorno
require('dotenv').config();

// ------------------------------------------------------------
// CREAR LA APLICACIÓN EXPRESS
// ------------------------------------------------------------

const app = express();

// ------------------------------------------------------------
// CONFIGURACIÓN DE SWAGGER (Documentación API)
// ------------------------------------------------------------

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'QuePlan API',
            version: '1.0.0',
            description: 'API REST para QuePlan - Mapa interactivo de Cancún',
            contact: {
                name: 'Equipo QuePlan'
            }
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT || 3000}`,
                description: 'Servidor de desarrollo'
            }
        ],
        // Definimos los esquemas de seguridad (JWT)
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    },
    // Dónde buscar las anotaciones de Swagger en el código
    apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ------------------------------------------------------------
// MIDDLEWARES GLOBALES
// ------------------------------------------------------------
// Los middlewares son funciones que se ejecutan ANTES de que
// la petición llegue a las rutas. Procesan la petición.

// 1. CORS - Permite peticiones desde otros orígenes (dominios)
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
}));

// 2. JSON Parser - Permite recibir datos en formato JSON
// Cuando el frontend envía { "nombre": "Juan" }, esto lo convierte
// en un objeto JavaScript accesible como req.body.nombre
app.use(express.json());

// 3. URL Encoded Parser - Permite recibir datos de formularios HTML
// Cuando un formulario envía nombre=Juan&email=juan@email.com
// esto lo convierte en req.body.nombre y req.body.email
app.use(express.urlencoded({ extended: true }));

// 4. Swagger UI - Documentación interactiva de la API
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 5. Servir archivos estáticos del frontend
app.use(express.static(FRONTEND_PATH));

// 6. Servir carpeta de uploads (imagenes subidas)
const UPLOADS_PATH = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(UPLOADS_PATH));

// ------------------------------------------------------------
// IMPORTAR Y USAR RUTAS
// ------------------------------------------------------------
// Las rutas definen qué hacer cuando llega una petición a una URL específica

const authRoutes = require('./routes/auth.routes');
const moodRoutes = require('./routes/mood.routes');
const ubicacionRoutes = require('./routes/ubicacion.routes');
const eventoRoutes = require('./routes/evento.routes');
const actividadRoutes = require('./routes/actividad.routes');
const notificacionRoutes = require('./routes/notificacion.routes');
const uploadRoutes = require('./routes/upload.routes');
const reporteRoutes = require('./routes/reporte.routes');

// Usamos las rutas con un prefijo /api
// Ejemplo: POST /api/auth/login
app.use('/api/auth', authRoutes);
app.use('/api/moods', moodRoutes);
app.use('/api/ubicaciones', ubicacionRoutes);
app.use('/api/ubicaciones/:ubicacionId/actividades', actividadRoutes);
app.use('/api/eventos', eventoRoutes);
app.use('/api/notificaciones', notificacionRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reportes', reporteRoutes);

// ------------------------------------------------------------
// MIDDLEWARE DE MANEJO DE ERRORES
// ------------------------------------------------------------
// Este middleware captura cualquier error que ocurra en las rutas
// Debe ir AL FINAL, después de todas las rutas

app.use((err, req, res, next) => {
    // Mostramos el error en consola para debugging
    console.error('❌ Error:', err.message);
    
    // Si estamos en desarrollo, mostramos más detalles
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }
    
    // Enviamos respuesta de error al cliente
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Error interno del servidor',
        // Solo mostramos el stack en desarrollo
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ------------------------------------------------------------
// FALLBACK - Rutas no-API sirven el frontend
// ------------------------------------------------------------

app.use((req, res) => {
    // Si es una petición a /api, devolver 404 JSON
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({
            success: false,
            message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
        });
    }
    // Para cualquier otra ruta, servir index.html
    res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
});

// ------------------------------------------------------------
// EXPORTAMOS LA APP
// ------------------------------------------------------------

module.exports = app;
