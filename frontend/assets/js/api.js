// ============================================================
// API.JS - Comunicacion con el Backend
// ============================================================

const API_URL = '/api';

async function apiRequest(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const token = localStorage.getItem('queplan_token');

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };

    const config = {
        ...options,
        headers: { ...headers, ...options.headers }
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('queplan_token');
                localStorage.removeItem('queplan_usuario');
                if (!window.location.pathname.includes('login')) {
                    window.location.href = '/pages/login.html';
                }
            }
            throw new Error(data.message || 'Error en la peticion');
        }

        return data;
    } catch (error) {
        console.error(`Error en ${endpoint}:`, error);
        throw error;
    }
}

// ---- Auth ----
const authAPI = {
    registro: (nombre, email, password, rol = 'usuario') =>
        apiRequest('/auth/registro', { method: 'POST', body: { nombre, email, password, rol } }),

    login: (email, password) =>
        apiRequest('/auth/login', { method: 'POST', body: { email, password } }),

    obtenerPerfil: () =>
        apiRequest('/auth/perfil'),

    actualizarPerfil: (datos) =>
        apiRequest('/auth/perfil', { method: 'PUT', body: datos }),

    cambiarPassword: (passwordActual, passwordNuevo) =>
        apiRequest('/auth/cambiar-password', { method: 'PUT', body: { passwordActual, passwordNuevo } }),

    obtenerUsuarios: () =>
        apiRequest('/auth/usuarios'),

    cambiarRol: (id, rol) =>
        apiRequest(`/auth/usuarios/${id}/rol`, { method: 'PATCH', body: { rol } }),

    cambiarEstadoUsuario: (id, activo) =>
        apiRequest(`/auth/usuarios/${id}/estado`, { method: 'PATCH', body: { activo } })
};

// ---- Moods ----
const moodsAPI = {
    obtenerTodos: () => apiRequest('/moods'),
    obtenerPorId: (id) => apiRequest(`/moods/${id}`),
    obtenerUbicaciones: (id) => apiRequest(`/moods/${id}/ubicaciones`)
};

// ---- Ubicaciones ----
const ubicacionesAPI = {
    obtenerTodas: (filtros = {}) => {
        const params = new URLSearchParams();
        if (filtros.precioMin) params.append('precioMin', filtros.precioMin);
        if (filtros.precioMax) params.append('precioMax', filtros.precioMax);
        if (filtros.mood) params.append('mood', filtros.mood);
        if (filtros.buscar) params.append('buscar', filtros.buscar);
        const qs = params.toString();
        return apiRequest(qs ? `/ubicaciones?${qs}` : '/ubicaciones');
    },

    obtenerPorId: (id) => apiRequest(`/ubicaciones/${id}`),

    crear: (datos) =>
        apiRequest('/ubicaciones', { method: 'POST', body: datos }),

    actualizar: (id, datos) =>
        apiRequest(`/ubicaciones/${id}`, { method: 'PUT', body: datos }),

    eliminar: (id) =>
        apiRequest(`/ubicaciones/${id}`, { method: 'DELETE' }),

    cambiarEstado: (id, estado) =>
        apiRequest(`/ubicaciones/${id}/estado`, { method: 'PATCH', body: { estado } }),

    obtenerPendientes: () =>
        apiRequest('/ubicaciones/pendientes'),

    calificar: (id, estrellas) =>
        apiRequest(`/ubicaciones/${id}/calificar`, { method: 'POST', body: { estrellas } }),

    agregarFavorito: (id) =>
        apiRequest(`/ubicaciones/${id}/favorito`, { method: 'POST' }),

    quitarFavorito: (id) =>
        apiRequest(`/ubicaciones/${id}/favorito`, { method: 'DELETE' }),

    obtenerFavoritos: () =>
        apiRequest('/ubicaciones/favoritos'),

    obtenerMias: () =>
        apiRequest('/ubicaciones/mis-ubicaciones'),

    obtenerTodasAdmin: () =>
        apiRequest('/ubicaciones/admin/todas')
};

// ---- Eventos ----
const eventosAPI = {
    obtenerTodos: (filtros = {}) => {
        const params = new URLSearchParams();
        if (filtros.tipo) params.append('tipo', filtros.tipo);
        if (filtros.activo !== undefined) params.append('activo', filtros.activo);
        const qs = params.toString();
        return apiRequest(qs ? `/eventos?${qs}` : '/eventos');
    },

    obtenerODS: () => apiRequest('/eventos/ods'),
    obtenerPorId: (id) => apiRequest(`/eventos/${id}`),

    obtenerPendientes: () => apiRequest('/eventos/pendientes'),
    obtenerMisEventos: () => apiRequest('/eventos/mis-eventos'),
    cambiarEstado: (id, estado) =>
        apiRequest(`/eventos/${id}/estado`, { method: 'PATCH', body: { estado } }),

    crear: (datos) =>
        apiRequest('/eventos', { method: 'POST', body: datos }),

    actualizar: (id, datos) =>
        apiRequest(`/eventos/${id}`, { method: 'PUT', body: datos }),

    eliminar: (id) =>
        apiRequest(`/eventos/${id}`, { method: 'DELETE' }),

    // Asistencia
    obtenerAsistencia: (id) => apiRequest(`/eventos/${id}/asistencia`),
    toggleAsistencia: (id) => apiRequest(`/eventos/${id}/asistencia`, { method: 'POST' }),
    obtenerAsistentes: (id) => apiRequest(`/eventos/${id}/asistentes`),
    obtenerResumenAsistencia: () => apiRequest('/eventos/asistencia/resumen')
};

// ---- Actividades ----
const actividadesAPI = {
    obtenerPorUbicacion: (ubicacionId) =>
        apiRequest(`/ubicaciones/${ubicacionId}/actividades`),

    crear: (ubicacionId, datos) =>
        apiRequest(`/ubicaciones/${ubicacionId}/actividades`, { method: 'POST', body: datos }),

    actualizar: (ubicacionId, id, datos) =>
        apiRequest(`/ubicaciones/${ubicacionId}/actividades/${id}`, { method: 'PUT', body: datos }),

    eliminar: (ubicacionId, id) =>
        apiRequest(`/ubicaciones/${ubicacionId}/actividades/${id}`, { method: 'DELETE' })
};

// ---- Upload ----
const uploadAPI = {
    subirImagen: async (file) => {
        const url = `${API_URL}/upload`;
        const token = localStorage.getItem('queplan_token');
        const formData = new FormData();
        formData.append('imagen', file);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error al subir imagen');
        }

        return data;
    }
};

// ---- Reportes ----
const reportesAPI = {
    crear: (datos) =>
        apiRequest('/reportes', { method: 'POST', body: datos }),

    obtenerTodos: (estado = null) => {
        let endpoint = '/reportes';
        if (estado) endpoint += `?estado=${estado}`;
        return apiRequest(endpoint);
    },

    obtenerConteo: () => apiRequest('/reportes/count'),

    cambiarEstado: (id, estado, nota_admin = null) =>
        apiRequest(`/reportes/${id}/estado`, { method: 'PATCH', body: { estado, nota_admin } }),

    eliminarElemento: (id) =>
        apiRequest(`/reportes/${id}/eliminar-elemento`, { method: 'DELETE' })
};

// ---- Recuperacion de contraseña ----
const recuperarAPI = {
    solicitarCodigo: (email) =>
        apiRequest('/auth/recuperar', { method: 'POST', body: { email } }),

    resetPassword: (email, codigo, nueva_password) =>
        apiRequest('/auth/reset-password', { method: 'POST', body: { email, codigo, nueva_password } })
};

// ---- Notificaciones ----
const notificacionesAPI = {
    obtenerTodas: (leidas = null) => {
        let endpoint = '/notificaciones';
        if (leidas !== null) endpoint += `?leidas=${leidas}`;
        return apiRequest(endpoint);
    },

    obtenerConteo: () => apiRequest('/notificaciones/count'),

    marcarLeida: (id) =>
        apiRequest(`/notificaciones/${id}/leer`, { method: 'PATCH' }),

    marcarTodasLeidas: () =>
        apiRequest('/notificaciones/leer-todas', { method: 'PATCH' }),

    eliminar: (id) =>
        apiRequest(`/notificaciones/${id}`, { method: 'DELETE' })
};
