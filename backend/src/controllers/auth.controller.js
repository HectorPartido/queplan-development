// ============================================================
// CONTROLADOR DE AUTENTICACIÓN
// ============================================================
// Maneja el registro de usuarios, login y perfil
// ============================================================

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { enviarEmail, templateRecuperacion } = require('../config/email');

/**
 * REGISTRAR NUEVO USUARIO
 * POST /api/auth/registro
 */
const registro = async (req, res) => {
    try {
        // 1. Extraemos los datos del cuerpo de la petición
        const { nombre, email, password, rol } = req.body;
        
        // 2. Validamos que los campos requeridos existan
        if (!nombre || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Nombre, email y contraseña son requeridos.'
            });
        }
        
        // 3. Validamos formato de email (expresión regular básica)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de email inválido.'
            });
        }
        
        // 4. Validamos longitud de contraseña
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 6 caracteres.'
            });
        }
        
        // 5. Verificamos que el email no esté registrado
        const [existingUser] = await pool.execute(
            'SELECT id FROM usuario WHERE email = ?',
            [email]
        );
        
        if (existingUser.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Este email ya está registrado.'
            });
        }
        
        // 6. Encriptamos la contraseña
        // El 10 es el número de "salt rounds"
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 7. Determinamos el rol (por defecto 'usuario')
        // Solo permitimos 'usuario' y 'vendedor' en registro público
        // 'admin' requiere asignación manual
        const rolesPermitidos = ['usuario', 'vendedor'];
        const rolFinal = (rol && rolesPermitidos.includes(rol)) ? rol : 'usuario';
        
        // 8. Insertamos el nuevo usuario
        const [result] = await pool.execute(
            `INSERT INTO usuario (nombre, email, password, rol) 
            VALUES (?, ?, ?, ?)`,
            [nombre, email, hashedPassword, rolFinal]
        );
        
        // 9. Generamos el token JWT
        const token = jwt.sign(
            { 
                id: result.insertId,
                email: email,
                rol: rolFinal
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
        
        // 10. Respondemos con éxito
        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente.',
            data: {
                usuario: {
                    id: result.insertId,
                    nombre,
                    email,
                    rol: rolFinal
                },
                token
            }
        });
        
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar usuario.'
        });
    }
};

/**
 * INICIAR SESIÓN
 * POST /api/auth/login
 */
const login = async (req, res) => {
    try {
        // 1. Extraemos email y contraseña
        const { email, password } = req.body;
        
        // 2. Validamos que existan
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son requeridos.'
            });
        }
        
        // 3. Buscamos el usuario por email
        const [rows] = await pool.execute(
            'SELECT * FROM usuario WHERE email = ?',
            [email]
        );
        
        // 4. Verificamos que el usuario exista
        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas.'
            });
        }
        
        const usuario = rows[0];
        
        // 5. Verificamos que la cuenta esté activa
        if (!usuario.activo) {
            return res.status(401).json({
                success: false,
                message: 'Cuenta desactivada. Contacta al administrador.'
            });
        }
        
        // 6. Comparamos la contraseña
        // bcrypt.compare compara la contraseña en texto plano con el hash
        const passwordValido = await bcrypt.compare(password, usuario.password);
        
        if (!passwordValido) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas.'
            });
        }
        
        // 7. Generamos el token JWT
        const token = jwt.sign(
            { 
                id: usuario.id,
                email: usuario.email,
                rol: usuario.rol
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
        
        // 8. Respondemos con éxito (sin incluir la contraseña)
        res.json({
            success: true,
            message: 'Inicio de sesión exitoso.',
            data: {
                usuario: {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    email: usuario.email,
                    rol: usuario.rol,
                    avatar: usuario.avatar
                },
                token
            }
        });
        
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error al iniciar sesión.'
        });
    }
};

/**
 * OBTENER PERFIL DEL USUARIO ACTUAL
 * GET /api/auth/perfil
 * Requiere autenticación
 */
const obtenerPerfil = async (req, res) => {
    try {
        // req.usuario fue establecido por el middleware verificarToken
        const [rows] = await pool.execute(
            `SELECT id, nombre, email, rol, avatar, fecha_registro 
             FROM usuario WHERE id = ?`,
            [req.usuario.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado.'
            });
        }
        
        res.json({
            success: true,
            data: rows[0]
        });
        
    } catch (error) {
        console.error('Error en obtenerPerfil:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener perfil.'
        });
    }
};

/**
 * ACTUALIZAR PERFIL
 * PUT /api/auth/perfil
 * Requiere autenticación
 */
const actualizarPerfil = async (req, res) => {
    try {
        const { nombre, avatar } = req.body;
        const usuarioId = req.usuario.id;
        
        // Construimos la consulta dinámicamente
        const campos = [];
        const valores = [];
        
        if (nombre) {
            campos.push('nombre = ?');
            valores.push(nombre);
        }
        
        if (avatar !== undefined) {
            campos.push('avatar = ?');
            valores.push(avatar);
        }
        
        if (campos.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No hay campos para actualizar.'
            });
        }
        
        valores.push(usuarioId);
        
        await pool.execute(
            `UPDATE usuario SET ${campos.join(', ')} WHERE id = ?`,
            valores
        );
        
        // Obtenemos el usuario actualizado
        const [rows] = await pool.execute(
            'SELECT id, nombre, email, rol, avatar FROM usuario WHERE id = ?',
            [usuarioId]
        );
        
        res.json({
            success: true,
            message: 'Perfil actualizado correctamente.',
            data: rows[0]
        });
        
    } catch (error) {
        console.error('Error en actualizarPerfil:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar perfil.'
        });
    }
};

/**
 * CAMBIAR CONTRASEÑA
 * PUT /api/auth/cambiar-password
 * Requiere autenticación
 */
const cambiarPassword = async (req, res) => {
    try {
        const { passwordActual, passwordNuevo } = req.body;
        const usuarioId = req.usuario.id;
        
        // Validamos los campos
        if (!passwordActual || !passwordNuevo) {
            return res.status(400).json({
                success: false,
                message: 'Contraseña actual y nueva son requeridas.'
            });
        }
        
        if (passwordNuevo.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La nueva contraseña debe tener al menos 6 caracteres.'
            });
        }
        
        // Obtenemos la contraseña actual del usuario
        const [rows] = await pool.execute(
            'SELECT password FROM usuario WHERE id = ?',
            [usuarioId]
        );
        
        // Verificamos la contraseña actual
        const passwordValido = await bcrypt.compare(passwordActual, rows[0].password);
        
        if (!passwordValido) {
            return res.status(401).json({
                success: false,
                message: 'Contraseña actual incorrecta.'
            });
        }
        
        // Encriptamos la nueva contraseña
        const hashedPassword = await bcrypt.hash(passwordNuevo, 10);
        
        // Actualizamos la contraseña
        await pool.execute(
            'UPDATE usuario SET password = ? WHERE id = ?',
            [hashedPassword, usuarioId]
        );
        
        res.json({
            success: true,
            message: 'Contraseña actualizada correctamente.'
        });
        
    } catch (error) {
        console.error('Error en cambiarPassword:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar contraseña.'
        });
    }
};

/**
 * OBTENER TODOS LOS USUARIOS (admin)
 * GET /api/auth/usuarios
 * Requiere autenticación - Solo admin
 */
const obtenerUsuarios = async (req, res) => {
    try {
        const [usuarios] = await pool.execute(
            `SELECT id, nombre, email, rol, activo, avatar, fecha_registro
             FROM usuario
             ORDER BY fecha_registro DESC`
        );

        res.json({
            success: true,
            data: usuarios,
            total: usuarios.length
        });

    } catch (error) {
        console.error('Error en obtenerUsuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuarios.'
        });
    }
};

/**
 * CAMBIAR ROL DE USUARIO (admin)
 * PATCH /api/auth/usuarios/:id/rol
 * Requiere autenticación - Solo admin
 */
const cambiarRol = async (req, res) => {
    try {
        const { id } = req.params;
        const { rol } = req.body;

        const rolesPermitidos = ['usuario', 'vendedor', 'admin'];
        if (!rol || !rolesPermitidos.includes(rol)) {
            return res.status(400).json({
                success: false,
                message: 'Rol debe ser "usuario", "vendedor" o "admin".'
            });
        }

        // No permitir cambiar el rol del propio admin
        if (parseInt(id) === req.usuario.id) {
            return res.status(400).json({
                success: false,
                message: 'No puedes cambiar tu propio rol.'
            });
        }

        const [users] = await pool.execute('SELECT id FROM usuario WHERE id = ?', [id]);
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado.'
            });
        }

        await pool.execute('UPDATE usuario SET rol = ? WHERE id = ?', [rol, id]);

        res.json({
            success: true,
            message: `Rol actualizado a "${rol}" correctamente.`
        });

    } catch (error) {
        console.error('Error en cambiarRol:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar rol.'
        });
    }
};

/**
 * ACTIVAR/DESACTIVAR USUARIO (admin)
 * PATCH /api/auth/usuarios/:id/estado
 * Requiere autenticación - Solo admin
 */
const cambiarEstadoUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { activo } = req.body;

        if (activo === undefined || typeof activo !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'El campo "activo" (boolean) es requerido.'
            });
        }

        if (parseInt(id) === req.usuario.id) {
            return res.status(400).json({
                success: false,
                message: 'No puedes desactivar tu propia cuenta.'
            });
        }

        const [users] = await pool.execute('SELECT id FROM usuario WHERE id = ?', [id]);
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado.'
            });
        }

        await pool.execute('UPDATE usuario SET activo = ? WHERE id = ?', [activo, id]);

        res.json({
            success: true,
            message: activo ? 'Usuario activado.' : 'Usuario desactivado.'
        });

    } catch (error) {
        console.error('Error en cambiarEstadoUsuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar estado del usuario.'
        });
    }
};

// ============================================================
// RECUPERACION DE CONTRASEÑA
// ============================================================

/**
 * SOLICITAR RECUPERACION
 * POST /api/auth/recuperar
 * Publico - envia codigo de 6 digitos al email
 */
const solicitarRecuperacion = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'El correo electronico es requerido.'
            });
        }

        // Buscar usuario (no revelamos si existe o no por seguridad)
        const [usuarios] = await pool.execute(
            'SELECT id, nombre, email FROM usuario WHERE email = ? AND activo = TRUE',
            [email.toLowerCase().trim()]
        );

        // Siempre respondemos exito (seguridad: no revelar si el email existe)
        if (usuarios.length === 0) {
            return res.json({
                success: true,
                message: 'Si el correo esta registrado, recibiras un codigo de recuperacion.'
            });
        }

        const usuario = usuarios[0];

        // Generar codigo de 6 digitos
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();

        // Hashear el codigo antes de guardarlo
        const codigoHash = await bcrypt.hash(codigo, 10);

        // Guardar en BD con expiracion de 15 minutos
        await pool.execute(
            'UPDATE usuario SET reset_code = ?, reset_code_expira = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?',
            [codigoHash, usuario.id]
        );

        // Enviar email
        try {
            await enviarEmail(
                usuario.email,
                'Recupera tu contraseña - ¿Qué Plan?',
                templateRecuperacion(usuario.nombre, codigo)
            );
        } catch (emailError) {
            console.error('Error enviando email de recuperacion:', emailError.message);
            // En desarrollo, mostrar el codigo en consola como fallback
            if (process.env.NODE_ENV === 'development') {
                console.log(`🔑 CODIGO DE RECUPERACION para ${email}: ${codigo}`);
            }
        }

        res.json({
            success: true,
            message: 'Si el correo esta registrado, recibiras un codigo de recuperacion.'
        });

    } catch (error) {
        console.error('Error en solicitarRecuperacion:', error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar la solicitud.'
        });
    }
};

/**
 * RESETEAR CONTRASEÑA
 * POST /api/auth/reset-password
 * Publico - valida codigo y cambia la contraseña
 */
const resetearPassword = async (req, res) => {
    try {
        const { email, codigo, nueva_password } = req.body;

        if (!email || !codigo || !nueva_password) {
            return res.status(400).json({
                success: false,
                message: 'Email, codigo y nueva contraseña son requeridos.'
            });
        }

        if (nueva_password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 6 caracteres.'
            });
        }

        // Buscar usuario
        const [usuarios] = await pool.execute(
            'SELECT id, reset_code, reset_code_expira FROM usuario WHERE email = ? AND activo = TRUE',
            [email.toLowerCase().trim()]
        );

        if (usuarios.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Codigo invalido o expirado.'
            });
        }

        const usuario = usuarios[0];

        // Verificar que tiene un codigo de reset
        if (!usuario.reset_code || !usuario.reset_code_expira) {
            return res.status(400).json({
                success: false,
                message: 'Codigo invalido o expirado.'
            });
        }

        // Verificar que no ha expirado
        if (new Date(usuario.reset_code_expira) < new Date()) {
            // Limpiar codigo expirado
            await pool.execute(
                'UPDATE usuario SET reset_code = NULL, reset_code_expira = NULL WHERE id = ?',
                [usuario.id]
            );
            return res.status(400).json({
                success: false,
                message: 'El codigo ha expirado. Solicita uno nuevo.'
            });
        }

        // Verificar codigo
        const codigoValido = await bcrypt.compare(codigo, usuario.reset_code);
        if (!codigoValido) {
            return res.status(400).json({
                success: false,
                message: 'Codigo invalido o expirado.'
            });
        }

        // Hashear nueva contraseña y actualizar
        const passwordHash = await bcrypt.hash(nueva_password, 10);
        await pool.execute(
            'UPDATE usuario SET password = ?, reset_code = NULL, reset_code_expira = NULL WHERE id = ?',
            [passwordHash, usuario.id]
        );

        res.json({
            success: true,
            message: 'Contraseña actualizada correctamente.'
        });

    } catch (error) {
        console.error('Error en resetearPassword:', error);
        res.status(500).json({
            success: false,
            message: 'Error al restablecer la contraseña.'
        });
    }
};

// ============================================================
// EXPORTAMOS LAS FUNCIONES
// ============================================================

module.exports = {
    registro,
    login,
    obtenerPerfil,
    actualizarPerfil,
    cambiarPassword,
    obtenerUsuarios,
    cambiarRol,
    cambiarEstadoUsuario,
    solicitarRecuperacion,
    resetearPassword
};
