// ============================================================
// MIDDLEWARE DE AUTENTICACIÓN
// ============================================================
// Este middleware verifica que el usuario esté autenticado
// y opcionalmente verifica que tenga el rol requerido
// ============================================================

const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');


/**
 * Middleware para verificar autenticación
 * Verifica que el token JWT sea válido
 */
const verificarToken = async (req, res, next) => {
    try {
        // 1. Obtenemos el header de autorización
        // El frontend envía: Authorization: Bearer <token>
        const authHeader = req.headers.authorization;
        
        // 2. Verificamos que exista el header
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Acceso denegado. No se proporcionó token de autenticación.'
            });
        }
        
        // 3. Extraemos el token (quitamos "Bearer ")
        // "Bearer eyJhbGci..." → "eyJhbGci..."
        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Formato de token inválido. Use: Bearer <token>'
            });
        }
        
        // 4. Verificamos y decodificamos el token
        // jwt.verify lanza un error si el token es inválido o expiró
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 5. Buscamos el usuario en la base de datos
        // Esto asegura que el usuario todavía existe y está activo
        const [rows] = await pool.execute(
            'SELECT id, nombre, email, rol, activo FROM usuario WHERE id = ?',
            [decoded.id]
        );
        
        // 6. Verificamos que el usuario exista y esté activo
        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado.'
            });
        }
        
        const usuario = rows[0];
        
        if (!usuario.activo) {
            return res.status(401).json({
                success: false,
                message: 'Cuenta desactivada. Contacta al administrador.'
            });
        }
        
        // 7. Adjuntamos el usuario a la petición
        // Así los controllers pueden acceder a req.usuario
        req.usuario = usuario;
        
        // 8. Continuamos al siguiente middleware o ruta
        next();
        
    } catch (error) {
        // Errores específicos de JWT
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado. Por favor inicia sesión nuevamente.'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token inválido.'
            });
        }
        
        // Otros errores
        console.error('Error en verificarToken:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al verificar autenticación.'
        });
    }
};

/**
 * Middleware para verificar rol específico
 * Uso: verificarRol('admin') o verificarRol('vendedor', 'admin')
 * 
 * @param  {...string} rolesPermitidos - Roles que pueden acceder
 */
const verificarRol = (...rolesPermitidos) => {
    return (req, res, next) => {
        // Verificamos que ya se haya ejecutado verificarToken
        if (!req.usuario) {
            return res.status(401).json({
                success: false,
                message: 'Primero debe autenticarse.'
            });
        }
        
        // Verificamos que el rol del usuario esté en los permitidos
        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({
                success: false,
                message: `Acceso denegado. Se requiere rol: ${rolesPermitidos.join(' o ')}`
            });
        }
        
        // El usuario tiene el rol correcto, continuamos
        next();
    };
};

/**
 * Middleware opcional de autenticación
 * No bloquea si no hay token, pero si hay token válido, adjunta el usuario
 * Útil para rutas que funcionan distinto si el usuario está logueado
 */
const autenticacionOpcional = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        // Si no hay header, continuamos sin usuario
        if (!authHeader) {
            return next();
        }
        
        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return next();
        }
        
        // Intentamos verificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const [rows] = await pool.execute(
            'SELECT id, nombre, email, rol, activo FROM usuario WHERE id = ?',
            [decoded.id]
        );
        
        if (rows.length > 0 && rows[0].activo) {
            req.usuario = rows[0];
        }
        
        next();
        
    } catch (error) {
        // Si hay error con el token, simplemente continuamos sin usuario
        next();
    }
};

// ============================================================
// EXPORTAMOS LOS MIDDLEWARES
// ============================================================

module.exports = {
    verificarToken,
    verificarRol,
    autenticacionOpcional
};
