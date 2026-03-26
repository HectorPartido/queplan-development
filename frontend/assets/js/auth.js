// ============================================================
// AUTH.JS - Manejo de Autenticacion
// ============================================================

const TOKEN_KEY = 'queplan_token';
const USUARIO_KEY = 'queplan_usuario';

function guardarSesion(token, usuario) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
}

function obtenerToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function obtenerUsuario() {
    const u = localStorage.getItem(USUARIO_KEY);
    return u ? JSON.parse(u) : null;
}

function estaLogueado() {
    return obtenerToken() !== null;
}

function cerrarSesion() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    window.location.href = '/pages/login.html';
}

function tieneRol(rol) {
    const u = obtenerUsuario();
    return u && u.rol === rol;
}

function tieneAlgunRol(roles) {
    const u = obtenerUsuario();
    return u && roles.includes(u.rol);
}

function protegerPagina() {
    if (!estaLogueado()) {
        localStorage.setItem('queplan_redirect', window.location.href);
        window.location.href = '/pages/login.html';
    }
}

function protegerPaginaPorRol(rolesPermitidos) {
    protegerPagina();
    if (!tieneAlgunRol(rolesPermitidos)) {
        window.location.href = '/';
    }
}

function redirigirSiLogueado() {
    if (estaLogueado()) {
        const redirect = localStorage.getItem('queplan_redirect');
        if (redirect) {
            localStorage.removeItem('queplan_redirect');
            window.location.href = redirect;
        } else {
            window.location.href = '/';
        }
    }
}

// ---- UI Update ----
function actualizarUISegunSesion() {
    const usuario = obtenerUsuario();
    const logueado = estaLogueado();

    // data-auth attributes
    document.querySelectorAll('[data-auth="logueado"]').forEach(el => {
        el.style.display = logueado ? '' : 'none';
    });
    document.querySelectorAll('[data-auth="no-logueado"]').forEach(el => {
        el.style.display = logueado ? 'none' : '';
    });
    document.querySelectorAll('[data-auth="vendedor"]').forEach(el => {
        el.style.display = tieneAlgunRol(['vendedor', 'admin']) ? '' : 'none';
    });
    document.querySelectorAll('[data-auth="admin"]').forEach(el => {
        el.style.display = tieneRol('admin') ? '' : 'none';
    });

    // User name & avatar
    if (usuario) {
        document.querySelectorAll('[data-usuario="nombre"]').forEach(el => {
            el.textContent = usuario.nombre;
        });
        document.querySelectorAll('[data-usuario="iniciales"]').forEach(el => {
            el.textContent = usuario.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        });
    }

    // Notification count
    if (logueado) {
        actualizarConteoNotificaciones();
    }
}

async function actualizarConteoNotificaciones() {
    try {
        const data = await notificacionesAPI.obtenerConteo();
        const count = data.data?.no_leidas || 0;
        document.querySelectorAll('[data-notificacion="count"]').forEach(el => {
            el.textContent = count;
            el.style.display = count > 0 ? '' : 'none';
        });
    } catch (e) {
        // silently fail
    }
}

// ---- Navbar setup ----
function initNavbar() {
    // User dropdown
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('dropdown-active');
        });
        document.addEventListener('click', () => {
            userDropdown.classList.remove('dropdown-active');
        });
    }

    // Mobile menu
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('mobile-menu-open');
            const icon = mobileMenuBtn.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        });
    }

    // Logout buttons
    document.querySelectorAll('[data-action="logout"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            cerrarSesion();
        });
    });
}

// ---- Init ----
function initAuth() {
    actualizarUISegunSesion();
    initNavbar();
}

document.addEventListener('DOMContentLoaded', initAuth);
