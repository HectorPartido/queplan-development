// ============================================================
// ADMIN.JS - Panel de Administracion
// ============================================================

let pendientes = [];
let usuarios = [];
const miniMaps = {};
let usuariosCargados = false;
let eventosPendientes = [];
let eventosCargados = false;
let asistenciaCargada = false;
let resumenAsistencia = [];
let ubicacionesAdmin = [];
let ubicacionesAdminCargadas = false;
let ubicacionesAdminFiltradas = [];
let reportesCargados = false;
let reportesData = [];
let moodsDisponiblesAdmin = [];
let moodsSeleccionadosAdmin = [];

document.addEventListener('DOMContentLoaded', async () => {
    protegerPaginaPorRol(['admin']);
    initTabs();
    await cargarPendientes();
    // Load event pending count for badge
    eventosAPI.obtenerPendientes().then(res => {
        document.getElementById('eventoPendingBadge').textContent = (res.data || []).length;
    }).catch(() => {});

    // Load reportes pending count for badge
    reportesAPI.obtenerConteo().then(res => {
        const badge = document.getElementById('reportesBadge');
        if (res.total > 0) {
            badge.textContent = res.total;
            badge.style.display = '';
        }
    }).catch(() => {});

    // Navigate to tab from URL hash (e.g. admin.html#reportes)
    const hash = window.location.hash.replace('#', '');
    const params = new URLSearchParams(window.location.search);
    const tabParam = hash || params.get('tab');
    if (tabParam) {
        const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabParam}"]`);
        if (tabBtn) tabBtn.click();
    }
});

// ---- Tabs ----
function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const target = tab.dataset.tab;
            document.getElementById('tabPendientes').classList.toggle('hidden', target !== 'pendientes');
            document.getElementById('tabUsuarios').classList.toggle('hidden', target !== 'usuarios');
            document.getElementById('tabEventos').classList.toggle('hidden', target !== 'eventos');
            document.getElementById('tabUbicaciones').classList.toggle('hidden', target !== 'ubicaciones');
            document.getElementById('tabAsistencia').classList.toggle('hidden', target !== 'asistencia');
            document.getElementById('tabReportes').classList.toggle('hidden', target !== 'reportes');

            if (target === 'usuarios' && !usuariosCargados) {
                cargarUsuarios();
            }
            if (target === 'eventos' && !eventosCargados) {
                cargarEventosPendientes();
            }
            if (target === 'ubicaciones' && !ubicacionesAdminCargadas) {
                cargarUbicacionesAdmin();
                cargarMoodsAdmin();
            }
            if (target === 'asistencia' && !asistenciaCargada) {
                cargarResumenAsistencia();
            }
            if (target === 'reportes' && !reportesCargados) {
                cargarReportes();
                initFiltrosReportes();
            }
        });
    });
}

// ================================================================
// TAB: SOLICITUDES PENDIENTES
// ================================================================

async function cargarPendientes() {
    try {
        const res = await ubicacionesAPI.obtenerPendientes();
        pendientes = res.data || [];
        document.getElementById('pendingBadge').textContent = pendientes.length;
        renderizarPendientes();
    } catch (error) {
        alertaError('Error', 'No se pudieron cargar las solicitudes pendientes');
    } finally {
        ocultar('#adminLoading');
    }
}

function renderizarPendientes() {
    const grid = document.getElementById('pendientesGrid');
    const empty = document.getElementById('pendientesEmpty');

    if (pendientes.length === 0) {
        ocultar(grid);
        mostrar(empty);
        return;
    }

    mostrar(grid);
    ocultar(empty);

    grid.innerHTML = pendientes.map((u, i) => {
        const moods = parseMoods(u.moods);
        const moodBadges = moods.map(m => `<span class="inline-block px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded-full border border-orange-200">${m}</span>`).join('');

        return `
        <div id="pending-${u.id}" class="card animate-fade-in-up stagger-${(i % 6) + 1} overflow-hidden" style="animation-fill-mode: both">
            <div class="h-44 relative overflow-hidden">
                ${u.imagen_url
                    ? `<img src="${u.imagen_url}" alt="${u.nombre}" class="w-full h-full object-cover">`
                    : `<div class="w-full h-full bg-gradient-to-br from-queplan-orange/20 via-queplan-gold/20 to-queplan-coral/20 flex items-center justify-center">
                        <i class="fas fa-map-marker-alt text-4xl text-queplan-orange/40"></i>
                    </div>`
                }
                <div class="absolute top-3 right-3">${renderizarEstadoBadge('pendiente')}</div>
            </div>
            <div class="p-5">
                <h3 class="font-display text-lg font-bold text-gray-900 mb-1">${u.nombre}</h3>
                <p class="text-xs text-gray-500 mb-3">
                    <i class="fas fa-user mr-1"></i> ${u.vendedor_nombre} &middot; ${u.vendedor_email}
                </p>
                ${u.descripcion ? `<p class="text-sm text-gray-600 mb-3 line-clamp-3">${u.descripcion}</p>` : ''}
                <div class="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                    <span><i class="fas fa-dollar-sign mr-1"></i>${formatearPrecio(u.precio_promedio)}</span>
                    ${u.telefono ? `<span><i class="fas fa-phone mr-1"></i>${u.telefono}</span>` : ''}
                    ${u.horario ? `<span><i class="fas fa-clock mr-1"></i>${u.horario}</span>` : ''}
                </div>
                ${u.direccion ? `<p class="text-xs text-gray-500 mb-3"><i class="fas fa-map-pin mr-1"></i>${u.direccion}</p>` : ''}
                ${moodBadges ? `<div class="flex flex-wrap gap-1 mb-3">${moodBadges}</div>` : ''}
                <div id="minimap-${u.id}" class="h-36 rounded-xl overflow-hidden border border-gray-200 mb-3"></div>
                <p class="text-xs text-gray-400 mb-4"><i class="fas fa-calendar mr-1"></i>Enviada ${tiempoRelativo(u.fecha_creacion)}</p>
                <div class="flex gap-3">
                    <button data-action="aprobar" data-id="${u.id}" class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                        <i class="fas fa-check"></i> Aprobar
                    </button>
                    <button data-action="rechazar" data-id="${u.id}" class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-red-200 text-red-500 text-sm font-semibold rounded-xl hover:bg-red-50 transition-all cursor-pointer">
                        <i class="fas fa-times"></i> Rechazar
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');

    setTimeout(() => initMiniMaps(), 100);
    grid.addEventListener('click', handlePendienteAction);
}

function parseMoods(moodsStr) {
    if (!moodsStr) return [];
    if (typeof moodsStr === 'string') return moodsStr.split(',').map(m => m.trim()).filter(Boolean);
    return moodsStr;
}

function initMiniMaps() {
    pendientes.forEach(u => {
        const container = document.getElementById(`minimap-${u.id}`);
        if (!container || miniMaps[u.id]) return;

        const map = L.map(container, {
            zoomControl: false, dragging: false, scrollWheelZoom: false,
            doubleClickZoom: false, touchZoom: false, attributionControl: false
        }).setView([u.latitud, u.longitud], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '' }).addTo(map);
        L.marker([u.latitud, u.longitud]).addTo(map);
        miniMaps[u.id] = map;
        setTimeout(() => map.invalidateSize(), 200);
    });
}

function handlePendienteAction(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = parseInt(btn.dataset.id);
    if (btn.dataset.action === 'aprobar') aprobar(id);
    if (btn.dataset.action === 'rechazar') rechazar(id);
}

async function aprobar(id) {
    const confirmado = await alertaConfirmar('Aprobar ubicacion', 'Esta ubicacion aparecera en el mapa para todos los usuarios');
    if (!confirmado) return;
    try {
        await ubicacionesAPI.cambiarEstado(id, 'aprobada');
        removerCard(id);
        mostrarToast('Ubicacion aprobada exitosamente');
    } catch (error) {
        alertaError('Error', error.message || 'No se pudo aprobar la ubicacion');
    }
}

async function rechazar(id) {
    const confirmado = await alertaConfirmar('Rechazar ubicacion', 'El vendedor podra ver que su solicitud fue rechazada');
    if (!confirmado) return;
    try {
        await ubicacionesAPI.cambiarEstado(id, 'rechazada');
        removerCard(id);
        mostrarToast('Ubicacion rechazada', 'info');
    } catch (error) {
        alertaError('Error', error.message || 'No se pudo rechazar la ubicacion');
    }
}

function removerCard(id) {
    const card = document.getElementById(`pending-${id}`);
    if (card) {
        card.style.transition = 'all 0.3s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        setTimeout(() => card.remove(), 300);
    }
    if (miniMaps[id]) { miniMaps[id].remove(); delete miniMaps[id]; }
    pendientes = pendientes.filter(u => u.id !== id);
    document.getElementById('pendingBadge').textContent = pendientes.length;
    if (pendientes.length === 0) {
        setTimeout(() => { ocultar('#pendientesGrid'); mostrar('#pendientesEmpty'); }, 350);
    }
}

// ================================================================
// TAB: GESTION DE USUARIOS
// ================================================================

async function cargarUsuarios() {
    try {
        const res = await authAPI.obtenerUsuarios();
        usuarios = res.data || [];
        renderizarUsuarios();
        usuariosCargados = true;
    } catch (error) {
        alertaError('Error', 'No se pudieron cargar los usuarios');
    } finally {
        ocultar('#usuariosLoading');
    }
}

function rolBadge(rol) {
    const estilos = {
        admin: 'bg-purple-100 text-purple-700 border-purple-200',
        vendedor: 'bg-orange-100 text-orange-700 border-orange-200',
        usuario: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    const iconos = { admin: 'fa-shield-alt', vendedor: 'fa-store', usuario: 'fa-user' };
    return `<span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${estilos[rol] || estilos.usuario}">
        <i class="fas ${iconos[rol] || iconos.usuario}"></i> ${rol}
    </span>`;
}

function renderizarUsuarios(lista = null) {
    const body = document.getElementById('usuariosBody');
    const table = document.getElementById('usuariosTable');
    const adminUser = obtenerUsuario();
    const datos = lista || usuarios;

    mostrar(table);

    body.innerHTML = datos.map(u => {
        const esSelf = adminUser && u.id === adminUser.id;
        const iniciales = u.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

        return `
        <tr class="border-b border-gray-100 hover:bg-gray-50/50 transition-colors" id="user-row-${u.id}">
            <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-gradient-to-br from-queplan-orange to-queplan-gold flex items-center justify-center text-white text-xs font-bold shrink-0">
                        ${iniciales}
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-gray-900">${u.nombre}${esSelf ? ' <span class="text-xs text-gray-400">(tu)</span>' : ''}</p>
                        <p class="text-xs text-gray-500">${u.email}</p>
                    </div>
                </div>
            </td>
            <td class="px-5 py-3.5">${rolBadge(u.rol)}</td>
            <td class="px-5 py-3.5">
                ${u.activo
                    ? '<span class="inline-flex items-center gap-1 text-xs text-green-600 font-medium"><i class="fas fa-circle text-[6px]"></i> Activo</span>'
                    : '<span class="inline-flex items-center gap-1 text-xs text-red-500 font-medium"><i class="fas fa-circle text-[6px]"></i> Inactivo</span>'
                }
            </td>
            <td class="px-5 py-3.5 text-xs text-gray-500">${formatearFechaCorta(u.fecha_registro)}</td>
            <td class="px-5 py-3.5 text-right">
                ${esSelf ? '<span class="text-xs text-gray-400">—</span>' : `
                    <div class="flex items-center justify-end gap-1.5">
                        <select data-user-id="${u.id}" data-action="cambiar-rol" class="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-queplan-orange cursor-pointer">
                            <option value="usuario" ${u.rol === 'usuario' ? 'selected' : ''}>Usuario</option>
                            <option value="vendedor" ${u.rol === 'vendedor' ? 'selected' : ''}>Vendedor</option>
                            <option value="admin" ${u.rol === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                        <button data-user-id="${u.id}" data-action="toggle-activo" data-activo="${u.activo}" class="text-xs px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${u.activo
                            ? 'border-red-200 text-red-500 hover:bg-red-50'
                            : 'border-green-200 text-green-600 hover:bg-green-50'
                        }">
                            <i class="fas ${u.activo ? 'fa-ban' : 'fa-check'}"></i>
                        </button>
                    </div>
                `}
            </td>
        </tr>`;
    }).join('');

    // Event delegation for role changes
    body.addEventListener('change', async (e) => {
        const select = e.target.closest('[data-action="cambiar-rol"]');
        if (!select) return;
        const userId = parseInt(select.dataset.userId);
        const nuevoRol = select.value;
        await cambiarRolUsuario(userId, nuevoRol);
    });

    // Event delegation for toggle active
    body.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action="toggle-activo"]');
        if (!btn) return;
        const userId = parseInt(btn.dataset.userId);
        const activo = btn.dataset.activo === 'true' || btn.dataset.activo === '1';
        await toggleActivoUsuario(userId, activo);
    });
}

// Búsqueda de usuarios
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('buscarUsuarioInput');
    if (input) {
        input.addEventListener('input', () => {
            const q = input.value.toLowerCase().trim();
            if (!q) {
                renderizarUsuarios();
                return;
            }
            const filtrados = usuarios.filter(u =>
                u.nombre.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u.rol.toLowerCase().includes(q)
            );
            renderizarUsuarios(filtrados);
        });
    }
});

async function cambiarRolUsuario(userId, nuevoRol) {
    try {
        await authAPI.cambiarRol(userId, nuevoRol);
        // Update local data
        const u = usuarios.find(u => u.id === userId);
        if (u) u.rol = nuevoRol;
        mostrarToast(`Rol cambiado a "${nuevoRol}"`);
        // Re-render the badge in the row
        const row = document.getElementById(`user-row-${userId}`);
        if (row) {
            const rolCell = row.querySelectorAll('td')[1];
            if (rolCell) rolCell.innerHTML = rolBadge(nuevoRol);
        }
    } catch (error) {
        alertaError('Error', error.message || 'No se pudo cambiar el rol');
        // Revert select
        const select = document.querySelector(`select[data-user-id="${userId}"]`);
        const u = usuarios.find(u => u.id === userId);
        if (select && u) select.value = u.rol;
    }
}

// ================================================================
// TAB: GESTION DE EVENTOS PENDIENTES
// ================================================================

async function cargarEventosPendientes() {
    try {
        const res = await eventosAPI.obtenerPendientes();
        eventosPendientes = res.data || [];
        document.getElementById('eventoPendingBadge').textContent = eventosPendientes.length;
        renderizarEventosPendientes();
        eventosCargados = true;
    } catch (error) {
        alertaError('Error', 'No se pudieron cargar los eventos pendientes');
    } finally {
        ocultar('#eventosAdminLoading');
    }
}

function renderizarTipoBadge(tipo) {
    if (tipo === 'ods') {
        return '<span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 border border-green-200"><i class="fas fa-leaf"></i> ODS</span>';
    }
    return '<span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 border border-blue-200"><i class="fas fa-calendar"></i> General</span>';
}

function renderizarEventosPendientes() {
    const grid = document.getElementById('eventosPendientesGrid');
    const empty = document.getElementById('eventosPendientesEmpty');

    if (eventosPendientes.length === 0) {
        ocultar(grid);
        mostrar(empty);
        return;
    }

    mostrar(grid);
    ocultar(empty);

    grid.innerHTML = eventosPendientes.map((e, i) => {
        return `
        <div id="pending-evento-${e.id}" class="card animate-fade-in-up stagger-${(i % 6) + 1} overflow-hidden" style="animation-fill-mode: both">
            <div class="h-44 relative overflow-hidden">
                ${e.imagen_url
                    ? `<img src="${e.imagen_url}" alt="${e.titulo}" class="w-full h-full object-cover">`
                    : `<div class="w-full h-full bg-gradient-to-br ${e.tipo === 'ods' ? 'from-green-200 via-emerald-100 to-teal-200' : 'from-queplan-orange/20 via-queplan-gold/20 to-queplan-coral/20'} flex items-center justify-center">
                        <i class="fas ${e.tipo === 'ods' ? 'fa-leaf text-green-400' : 'fa-calendar-alt text-queplan-orange/40'} text-4xl"></i>
                    </div>`
                }
                <div class="absolute top-3 right-3">${renderizarTipoBadge(e.tipo)}</div>
                <div class="absolute top-3 left-3">${renderizarEstadoBadge('pendiente')}</div>
            </div>
            <div class="p-5">
                <h3 class="font-display text-lg font-bold text-gray-900 mb-1">${e.titulo}</h3>
                <p class="text-xs text-gray-500 mb-3">
                    <i class="fas fa-user mr-1"></i> ${e.creador_nombre} &middot; ${e.creador_email}
                </p>
                ${e.descripcion ? `<p class="text-sm text-gray-600 mb-3 line-clamp-3">${e.descripcion}</p>` : ''}
                <div class="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                    <span><i class="fas fa-calendar mr-1"></i>${formatearFechaCorta(e.fecha)}</span>
                    <span><i class="fas fa-clock mr-1"></i>${e.hora}</span>
                    ${e.ubicacion_nombre ? `<span><i class="fas fa-map-pin mr-1"></i>${e.ubicacion_nombre}</span>` : ''}
                </div>
                <p class="text-xs text-gray-400 mb-4"><i class="fas fa-calendar mr-1"></i>Enviada ${tiempoRelativo(e.fecha_creacion)}</p>
                <div class="flex gap-3">
                    <button data-action="aprobar-evento" data-id="${e.id}" class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                        <i class="fas fa-check"></i> Aprobar
                    </button>
                    <button data-action="rechazar-evento" data-id="${e.id}" class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-red-200 text-red-500 text-sm font-semibold rounded-xl hover:bg-red-50 transition-all cursor-pointer">
                        <i class="fas fa-times"></i> Rechazar
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');

    grid.addEventListener('click', handleEventoAction);
}

function handleEventoAction(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = parseInt(btn.dataset.id);
    if (btn.dataset.action === 'aprobar-evento') aprobarEvento(id);
    if (btn.dataset.action === 'rechazar-evento') rechazarEvento(id);
}

async function aprobarEvento(id) {
    const confirmado = await alertaConfirmar('Aprobar evento', 'Este evento sera visible para todos los usuarios y se enviaran notificaciones');
    if (!confirmado) return;
    try {
        await eventosAPI.cambiarEstado(id, 'aprobada');
        removerEventoCard(id);
        mostrarToast('Evento aprobado exitosamente');
    } catch (error) {
        alertaError('Error', error.message || 'No se pudo aprobar el evento');
    }
}

async function rechazarEvento(id) {
    const confirmado = await alertaConfirmar('Rechazar evento', 'El creador sera notificado del rechazo');
    if (!confirmado) return;
    try {
        await eventosAPI.cambiarEstado(id, 'rechazada');
        removerEventoCard(id);
        mostrarToast('Evento rechazado', 'info');
    } catch (error) {
        alertaError('Error', error.message || 'No se pudo rechazar el evento');
    }
}

function removerEventoCard(id) {
    const card = document.getElementById(`pending-evento-${id}`);
    if (card) {
        card.style.transition = 'all 0.3s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        setTimeout(() => card.remove(), 300);
    }
    eventosPendientes = eventosPendientes.filter(e => e.id !== id);
    document.getElementById('eventoPendingBadge').textContent = eventosPendientes.length;
    if (eventosPendientes.length === 0) {
        setTimeout(() => { ocultar('#eventosPendientesGrid'); mostrar('#eventosPendientesEmpty'); }, 350);
    }
}

// ================================================================
// TAB: GESTION DE USUARIOS (continued)
// ================================================================

// ================================================================
// TAB: ASISTENCIA A EVENTOS
// ================================================================

async function cargarResumenAsistencia() {
    try {
        const res = await eventosAPI.obtenerResumenAsistencia();
        resumenAsistencia = res.data || [];
        renderizarResumenAsistencia();
        asistenciaCargada = true;
    } catch (error) {
        alertaError('Error', 'No se pudo cargar el resumen de asistencia');
    } finally {
        ocultar('#asistenciaLoading');
    }
}

function renderizarResumenAsistencia() {
    const content = document.getElementById('asistenciaContent');
    const body = document.getElementById('asistenciaBody');
    const empty = document.getElementById('asistenciaEmpty');

    if (resumenAsistencia.length === 0) {
        ocultar(content);
        mostrar(empty);
        return;
    }

    mostrar(content);
    ocultar(empty);

    body.innerHTML = resumenAsistencia.map(e => {
        const totalAsistentes = parseInt(e.total_asistentes) || 0;
        const barWidth = Math.min(totalAsistentes * 10, 100);
        const barColor = totalAsistentes >= 10 ? 'bg-green-500' : totalAsistentes >= 5 ? 'bg-yellow-400' : 'bg-gray-300';

        return `
        <tr class="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
            <td class="px-5 py-3.5">
                <p class="text-sm font-semibold text-gray-900">${e.titulo}</p>
            </td>
            <td class="px-5 py-3.5">${renderizarTipoBadge(e.tipo)}</td>
            <td class="px-5 py-3.5">
                <div class="text-sm text-gray-600">${formatearFechaCorta(e.fecha)}</div>
                <div class="text-xs text-gray-400">${e.hora}</div>
            </td>
            <td class="px-5 py-3.5 text-sm text-gray-600">${e.creador_nombre}</td>
            <td class="px-5 py-3.5 text-center">
                <div class="flex flex-col items-center gap-1">
                    <span class="inline-flex items-center gap-1.5 text-sm font-bold ${totalAsistentes > 0 ? 'text-queplan-orange' : 'text-gray-400'}">
                        <i class="fas fa-users"></i> ${totalAsistentes}
                    </span>
                    <div class="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div class="h-full ${barColor} rounded-full transition-all" style="width: ${barWidth}%"></div>
                    </div>
                </div>
            </td>
            <td class="px-5 py-3.5 text-right">
                ${totalAsistentes > 0 ? `
                <button onclick="verAsistentes(${e.id})" class="text-xs px-3 py-1.5 rounded-lg border border-queplan-orange/30 text-queplan-orange hover:bg-orange-50 transition-colors cursor-pointer">
                    <i class="fas fa-eye mr-1"></i>Ver
                </button>` : '<span class="text-xs text-gray-400">Sin asistentes</span>'}
            </td>
        </tr>`;
    }).join('');
}

async function verAsistentes(eventoId) {
    const modal = document.getElementById('modalAsistentes');
    const title = document.getElementById('modalAsistentesTitle');
    const body = document.getElementById('modalAsistentesBody');

    // Loading state
    body.innerHTML = '<div class="flex justify-center py-8"><div class="w-8 h-8 border-4 border-queplan-orange/30 border-t-queplan-orange rounded-full animate-spin"></div></div>';
    mostrar(modal);

    try {
        const res = await eventosAPI.obtenerAsistentes(eventoId);
        const asistentes = res.data || [];
        title.textContent = `Asistentes - ${res.evento || 'Evento'}`;

        if (asistentes.length === 0) {
            body.innerHTML = '<p class="text-center text-gray-500 py-4">No hay asistentes registrados</p>';
            return;
        }

        body.innerHTML = `
            <p class="text-sm text-gray-500 mb-4">${asistentes.length} ${asistentes.length === 1 ? 'persona asistira' : 'personas asistiran'}</p>
            <div class="space-y-2">
                ${asistentes.map(a => {
                    const iniciales = a.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    return `
                    <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div class="w-9 h-9 rounded-full bg-gradient-to-br from-queplan-orange to-queplan-gold flex items-center justify-center text-white text-xs font-bold shrink-0">
                            ${iniciales}
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold text-gray-900 truncate">${a.nombre}</p>
                            <p class="text-xs text-gray-500 truncate">${a.email}</p>
                        </div>
                        <span class="text-xs text-gray-400 shrink-0">${tiempoRelativo(a.fecha_registro)}</span>
                    </div>`;
                }).join('')}
            </div>
        `;
    } catch (error) {
        body.innerHTML = `<p class="text-center text-red-500 py-4">Error al cargar asistentes: ${error.message}</p>`;
    }
}

function cerrarModalAsistentes() {
    ocultar('#modalAsistentes');
}

// ================================================================
// TAB: GESTION DE USUARIOS (continued)
// ================================================================

// ================================================================
// TAB: GESTION DE UBICACIONES (admin)
// ================================================================

async function cargarUbicacionesAdmin() {
    try {
        const res = await ubicacionesAPI.obtenerTodasAdmin();
        ubicacionesAdmin = res.data || [];
        ubicacionesAdminFiltradas = [...ubicacionesAdmin];
        renderizarUbicacionesAdmin();
        ubicacionesAdminCargadas = true;
        initFiltrosUbicaciones();
    } catch (error) {
        alertaError('Error', 'No se pudieron cargar las ubicaciones');
    } finally {
        ocultar('#ubicacionesAdminLoading');
    }
}

function initFiltrosUbicaciones() {
    const buscador = document.getElementById('ubicacionBuscar');
    const filtroEstado = document.getElementById('ubicacionFiltroEstado');

    let debounceTimer;
    buscador.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(filtrarUbicaciones, 300);
    });
    filtroEstado.addEventListener('change', filtrarUbicaciones);
}

function filtrarUbicaciones() {
    const buscar = document.getElementById('ubicacionBuscar').value.toLowerCase().trim();
    const estado = document.getElementById('ubicacionFiltroEstado').value;

    ubicacionesAdminFiltradas = ubicacionesAdmin.filter(u => {
        const coincideBusqueda = !buscar ||
            u.nombre.toLowerCase().includes(buscar) ||
            (u.vendedor_nombre && u.vendedor_nombre.toLowerCase().includes(buscar)) ||
            (u.direccion && u.direccion.toLowerCase().includes(buscar));
        const coincideEstado = !estado || u.estado === estado;
        return coincideBusqueda && coincideEstado;
    });

    renderizarUbicacionesAdmin();
}

function estadoBadgeUbicacion(estado) {
    const estilos = {
        aprobada: 'bg-green-100 text-green-700 border-green-200',
        pendiente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        rechazada: 'bg-red-100 text-red-700 border-red-200'
    };
    const iconos = { aprobada: 'fa-check-circle', pendiente: 'fa-clock', rechazada: 'fa-times-circle' };
    return `<span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${estilos[estado] || estilos.pendiente}">
        <i class="fas ${iconos[estado] || iconos.pendiente}"></i> ${estado}
    </span>`;
}

function renderizarUbicacionesAdmin() {
    const table = document.getElementById('ubicacionesAdminTable');
    const body = document.getElementById('ubicacionesAdminBody');
    const empty = document.getElementById('ubicacionesAdminEmpty');

    if (ubicacionesAdminFiltradas.length === 0) {
        ocultar(table);
        mostrar(empty);
        return;
    }

    mostrar(table);
    ocultar(empty);

    body.innerHTML = ubicacionesAdminFiltradas.map(u => {
        const calif = u.promedio_calificacion ? parseFloat(u.promedio_calificacion).toFixed(1) : '—';
        const totalCalif = parseInt(u.total_calificaciones) || 0;

        return `
        <tr class="border-b border-gray-100 hover:bg-gray-50/50 transition-colors" id="ubicacion-row-${u.id}">
            <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                        ${u.imagen_url
                            ? `<img src="${u.imagen_url}" alt="${u.nombre}" class="w-full h-full object-cover">`
                            : `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-queplan-orange/20 to-queplan-gold/20"><i class="fas fa-map-marker-alt text-queplan-orange/50 text-sm"></i></div>`
                        }
                    </div>
                    <div class="min-w-0">
                        <p class="text-sm font-semibold text-gray-900 truncate">${u.nombre}</p>
                        <p class="text-xs text-gray-400 truncate">${u.direccion || 'Sin direccion'}</p>
                    </div>
                </div>
            </td>
            <td class="px-5 py-3.5">
                <p class="text-sm text-gray-700">${u.vendedor_nombre}</p>
                <p class="text-xs text-gray-400">${u.vendedor_email}</p>
            </td>
            <td class="px-5 py-3.5">${estadoBadgeUbicacion(u.estado)}</td>
            <td class="px-5 py-3.5 text-sm text-gray-600">${formatearPrecio(u.precio_promedio)}</td>
            <td class="px-5 py-3.5 text-center">
                <span class="text-sm ${totalCalif > 0 ? 'text-yellow-500 font-semibold' : 'text-gray-400'}">
                    ${totalCalif > 0 ? `<i class="fas fa-star"></i> ${calif}` : '—'}
                </span>
                ${totalCalif > 0 ? `<p class="text-xs text-gray-400">(${totalCalif})</p>` : ''}
            </td>
            <td class="px-5 py-3.5 text-right">
                <div class="flex items-center justify-end gap-1.5">
                    <button onclick="abrirEditarUbicacion(${u.id})" class="text-xs px-2.5 py-1.5 rounded-lg border border-queplan-orange/30 text-queplan-orange hover:bg-orange-50 transition-colors cursor-pointer" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="eliminarUbicacionAdmin(${u.id})" class="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors cursor-pointer" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ---- Moods Admin ----
async function cargarMoodsAdmin() {
    try {
        const res = await moodsAPI.obtenerTodos();
        moodsDisponiblesAdmin = res.data || [];
        renderizarMoodSelectorAdmin();
    } catch (error) {
        console.error('Error cargando moods:', error);
    }
}

function renderizarMoodSelectorAdmin() {
    const container = document.getElementById('editMoodSelector');
    if (!container) return;
    container.innerHTML = moodsDisponiblesAdmin.map(m => `
        <button type="button" data-mood-id="${m.id}" class="mood-chip px-3 py-1.5 text-sm rounded-full border-2 border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 transition-all cursor-pointer select-none">
            ${m.icono || ''} ${m.nombre}
        </button>
    `).join('');

    container.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-mood-id]');
        if (!chip) return;
        const id = parseInt(chip.dataset.moodId);
        chip.classList.toggle('active');
        if (moodsSeleccionadosAdmin.includes(id)) {
            moodsSeleccionadosAdmin = moodsSeleccionadosAdmin.filter(m => m !== id);
        } else {
            moodsSeleccionadosAdmin.push(id);
        }
    });
}

function setMoodsSeleccionadosAdmin(moodIdsStr) {
    moodsSeleccionadosAdmin = parseMoodIdsAdmin(moodIdsStr);
    document.querySelectorAll('#editMoodSelector [data-mood-id]').forEach(chip => {
        const chipId = parseInt(chip.dataset.moodId);
        chip.classList.toggle('active', moodsSeleccionadosAdmin.includes(chipId));
    });
}

function parseMoodIdsAdmin(moodIdsStr) {
    if (!moodIdsStr) return [];
    if (typeof moodIdsStr === 'string') return moodIdsStr.split(',').map(id => parseInt(id.trim())).filter(n => !isNaN(n));
    return moodIdsStr;
}

let _imagenEditMode = 'upload'; // 'upload' or 'url'
let _imagenFileSeleccionado = null;
let _imagenUrlActual = null;
let _imagenRemovida = false;

function abrirEditarUbicacion(id) {
    const u = ubicacionesAdmin.find(ub => ub.id === id);
    if (!u) return;

    document.getElementById('editUbicacionId').value = u.id;
    document.getElementById('editNombre').value = u.nombre || '';
    document.getElementById('editDescripcion').value = u.descripcion || '';
    document.getElementById('editDireccion').value = u.direccion || '';
    document.getElementById('editPrecio').value = u.precio_promedio || '';
    document.getElementById('editTelefono').value = u.telefono || '';
    document.getElementById('editHorario').value = u.horario || '';
    document.getElementById('editImagenUrl').value = u.imagen_url || '';
    document.getElementById('editLatitud').value = u.latitud || '';
    document.getElementById('editLongitud').value = u.longitud || '';
    document.getElementById('editEstado').value = u.estado || 'pendiente';

    // Reset imagen state
    _imagenFileSeleccionado = null;
    _imagenRemovida = false;
    _imagenUrlActual = u.imagen_url || null;
    document.getElementById('editImagenFile').value = '';

    // Show preview if image exists
    if (u.imagen_url) {
        document.getElementById('editImagenPreviewImg').src = u.imagen_url;
        mostrar('#editImagenPreview');
    } else {
        ocultar('#editImagenPreview');
    }

    // Set moods
    setMoodsSeleccionadosAdmin(u.mood_ids);

    // Default to upload mode
    toggleImagenMode('upload');

    // Init file input listener (rebind to avoid duplicates)
    const fileInput = document.getElementById('editImagenFile');
    const newFileInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(newFileInput, fileInput);
    newFileInput.addEventListener('change', onImagenFileSelected);

    mostrar('#modalEditarUbicacion');

    // Form submit handler
    const form = document.getElementById('formEditarUbicacion');
    form.onsubmit = async (e) => {
        e.preventDefault();
        await guardarEdicionUbicacion();
    };
}

function toggleImagenMode(mode) {
    _imagenEditMode = mode;
    const btnUpload = document.getElementById('btnModoUpload');
    const btnUrl = document.getElementById('btnModoUrl');
    const wrapUpload = document.getElementById('editImagenUploadWrap');
    const wrapUrl = document.getElementById('editImagenUrlWrap');

    if (mode === 'upload') {
        btnUpload.className = 'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border-2 border-queplan-orange bg-queplan-orange/10 text-queplan-orange transition-all cursor-pointer';
        btnUrl.className = 'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border-2 border-gray-200 text-gray-500 hover:bg-gray-50 transition-all cursor-pointer';
        mostrar(wrapUpload);
        ocultar(wrapUrl);
    } else {
        btnUrl.className = 'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border-2 border-queplan-orange bg-queplan-orange/10 text-queplan-orange transition-all cursor-pointer';
        btnUpload.className = 'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border-2 border-gray-200 text-gray-500 hover:bg-gray-50 transition-all cursor-pointer';
        ocultar(wrapUpload);
        mostrar(wrapUrl);
    }
}

function onImagenFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
        alertaError('Archivo muy grande', 'La imagen no debe superar 5MB');
        e.target.value = '';
        return;
    }

    _imagenFileSeleccionado = file;
    _imagenRemovida = false;

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => {
        document.getElementById('editImagenPreviewImg').src = ev.target.result;
        mostrar('#editImagenPreview');
    };
    reader.readAsDataURL(file);
}

function quitarImagenEdit() {
    _imagenFileSeleccionado = null;
    _imagenRemovida = true;
    document.getElementById('editImagenFile').value = '';
    document.getElementById('editImagenUrl').value = '';
    ocultar('#editImagenPreview');
}

async function guardarEdicionUbicacion() {
    const id = parseInt(document.getElementById('editUbicacionId').value);

    // Determine imagen_url based on mode
    let imagenUrl;
    if (_imagenRemovida) {
        imagenUrl = '';  // Clear the image
    } else if (_imagenEditMode === 'url') {
        imagenUrl = document.getElementById('editImagenUrl').value.trim() || null;
    } else {
        // Upload mode: keep current unless new file selected
        imagenUrl = null; // null = don't change
    }

    const latVal = document.getElementById('editLatitud').value;
    const lngVal = document.getElementById('editLongitud').value;

    const datos = {
        nombre: document.getElementById('editNombre').value.trim(),
        descripcion: document.getElementById('editDescripcion').value.trim() || null,
        direccion: document.getElementById('editDireccion').value.trim() || null,
        precio_promedio: parseFloat(document.getElementById('editPrecio').value) || null,
        telefono: document.getElementById('editTelefono').value.trim() || null,
        horario: document.getElementById('editHorario').value.trim() || null,
        imagen_url: imagenUrl,
        latitud: latVal !== '' ? parseFloat(latVal) : null,
        longitud: lngVal !== '' ? parseFloat(lngVal) : null,
        moods: moodsSeleccionadosAdmin
    };
    const nuevoEstado = document.getElementById('editEstado').value;

    if (!datos.nombre) {
        return alertaError('Campo requerido', 'El nombre es obligatorio');
    }

    const btn = document.getElementById('btnGuardarUbicacion');
    botonCargando(btn, true);

    try {
        // If a file was selected, upload it first
        if (_imagenFileSeleccionado) {
            const uploadRes = await uploadAPI.subirImagen(_imagenFileSeleccionado);
            datos.imagen_url = uploadRes.data.url;
        }

        // Actualizar datos de la ubicacion
        await ubicacionesAPI.actualizar(id, datos);

        // Si el estado cambió, actualizarlo por separado
        const ubicacionActual = ubicacionesAdmin.find(u => u.id === id);
        if (ubicacionActual && ubicacionActual.estado !== nuevoEstado) {
            await ubicacionesAPI.cambiarEstado(id, nuevoEstado);
        }

        // Actualizar datos locales
        if (ubicacionActual) {
            // Rebuild mood strings from selected IDs
            const moodNames = moodsSeleccionadosAdmin.map(id => {
                const m = moodsDisponiblesAdmin.find(md => md.id === id);
                return m ? m.nombre : '';
            }).filter(Boolean);
            Object.assign(ubicacionActual, datos, {
                estado: nuevoEstado,
                moods: moodNames.join(','),
                mood_ids: moodsSeleccionadosAdmin.join(',')
            });
        }

        cerrarModalEditarUbicacion();
        filtrarUbicaciones();
        mostrarToast('Ubicacion actualizada');

        // Refrescar pendientes badge si cambio de estado
        if (ubicacionActual && ubicacionActual.estado !== nuevoEstado) {
            const pendCount = ubicacionesAdmin.filter(u => u.estado === 'pendiente').length;
            document.getElementById('pendingBadge').textContent = pendCount;
        }
    } catch (error) {
        alertaError('Error', error.message || 'No se pudo actualizar la ubicacion');
    } finally {
        botonCargando(btn, false);
    }
}

function cerrarModalEditarUbicacion() {
    ocultar('#modalEditarUbicacion');
    _imagenFileSeleccionado = null;
    _imagenRemovida = false;
    moodsSeleccionadosAdmin = [];
}

async function eliminarUbicacionAdmin(id) {
    const u = ubicacionesAdmin.find(ub => ub.id === id);
    const nombre = u ? u.nombre : 'esta ubicacion';

    const confirmado = await alertaConfirmar(
        'Eliminar ubicacion',
        `¿Estas seguro de eliminar "${nombre}"? Esta accion no se puede deshacer.`
    );
    if (!confirmado) return;

    try {
        await ubicacionesAPI.eliminar(id);

        // Remover de arrays locales
        ubicacionesAdmin = ubicacionesAdmin.filter(ub => ub.id !== id);
        filtrarUbicaciones();
        mostrarToast('Ubicacion eliminada');

        // Update pending badge
        const pendCount = ubicacionesAdmin.filter(u => u.estado === 'pendiente').length;
        document.getElementById('pendingBadge').textContent = pendCount;
    } catch (error) {
        alertaError('Error', error.message || 'No se pudo eliminar la ubicacion');
    }
}

// ================================================================
// TAB: GESTION DE USUARIOS (continued)
// ================================================================

// ================================================================
// TAB: REPORTES
// ================================================================

function initFiltrosReportes() {
    document.getElementById('reporteFiltroEstado').addEventListener('change', () => {
        reportesCargados = false;
        cargarReportes();
    });
}

async function cargarReportes() {
    const estado = document.getElementById('reporteFiltroEstado').value;
    const loading = document.getElementById('reportesLoading');
    const content = document.getElementById('reportesContent');
    const empty = document.getElementById('reportesEmpty');

    mostrar(loading);
    ocultar(content);
    ocultar(empty);

    try {
        const res = await reportesAPI.obtenerTodos(estado || null);
        reportesData = res.data || [];
        const conteo = res.conteo || {};

        // Conteos badges
        document.getElementById('reporteConteos').innerHTML = `
            <span class="px-2 py-1 rounded-full ${!estado ? 'bg-gray-200 font-semibold' : 'bg-gray-100'} text-gray-600">Todos: ${(conteo.pendiente || 0) + (conteo.revisado || 0) + (conteo.resuelto || 0)}</span>
            <span class="px-2 py-1 rounded-full ${estado === 'pendiente' ? 'bg-yellow-200 font-semibold' : 'bg-yellow-50'} text-yellow-700">Pendientes: ${conteo.pendiente || 0}</span>
            <span class="px-2 py-1 rounded-full ${estado === 'revisado' ? 'bg-blue-200 font-semibold' : 'bg-blue-50'} text-blue-700">Revisados: ${conteo.revisado || 0}</span>
            <span class="px-2 py-1 rounded-full ${estado === 'resuelto' ? 'bg-green-200 font-semibold' : 'bg-green-50'} text-green-700">Resueltos: ${conteo.resuelto || 0}</span>
        `;

        // Badge
        const badge = document.getElementById('reportesBadge');
        if (conteo.pendiente > 0) {
            badge.textContent = conteo.pendiente;
            badge.style.display = '';
        } else {
            badge.style.display = 'none';
        }

        renderizarReportes();
        reportesCargados = true;
    } catch (error) {
        alertaError('Error', 'No se pudieron cargar los reportes');
    } finally {
        ocultar(loading);
    }
}

function motivoLabel(motivo) {
    const map = {
        informacion_falsa: { text: 'Informacion falsa', icon: 'fa-info-circle', color: 'text-blue-500' },
        contenido_inapropiado: { text: 'Contenido inapropiado', icon: 'fa-ban', color: 'text-purple-500' },
        estafa: { text: 'Posible estafa', icon: 'fa-exclamation-triangle', color: 'text-yellow-600' },
        peligroso: { text: 'Peligroso', icon: 'fa-skull-crossbones', color: 'text-red-600' },
        spam: { text: 'Spam', icon: 'fa-robot', color: 'text-gray-500' },
        otro: { text: 'Otro', icon: 'fa-ellipsis-h', color: 'text-gray-500' }
    };
    const m = map[motivo] || map.otro;
    return `<span class="inline-flex items-center gap-1 text-sm"><i class="fas ${m.icon} ${m.color}"></i> ${m.text}</span>`;
}

function tipoReporteIcon(tipo) {
    if (tipo === 'ubicacion') return '<i class="fas fa-map-marker-alt text-queplan-orange"></i>';
    if (tipo === 'evento') return '<i class="fas fa-calendar-alt text-blue-500"></i>';
    return '<i class="fas fa-running text-green-500"></i>';
}

function estadoReporteBadge(estado) {
    const map = {
        pendiente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        revisado: 'bg-blue-100 text-blue-700 border-blue-200',
        resuelto: 'bg-green-100 text-green-700 border-green-200'
    };
    return `<span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${map[estado] || map.pendiente}">${estado}</span>`;
}

function renderizarReportes() {
    const content = document.getElementById('reportesContent');
    const empty = document.getElementById('reportesEmpty');

    if (reportesData.length === 0) {
        ocultar(content);
        mostrar(empty);
        return;
    }

    mostrar(content);
    ocultar(empty);

    content.innerHTML = reportesData.map(r => {
        const esPendiente = r.estado === 'pendiente';
        const esRevisado = r.estado === 'revisado';

        return `
        <div class="bg-white rounded-2xl shadow-sm p-5 border-l-4 ${esPendiente ? 'border-l-yellow-400' : esRevisado ? 'border-l-blue-400' : 'border-l-green-400'}" id="reporte-${r.id}">
            <div class="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div class="flex items-center gap-3">
                    ${tipoReporteIcon(r.tipo)}
                    <div>
                        <p class="text-sm font-semibold text-gray-900">${r.nombre_elemento || 'Elemento eliminado'}</p>
                        <p class="text-xs text-gray-500 capitalize">${r.tipo}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    ${estadoReporteBadge(r.estado)}
                </div>
            </div>

            <!-- Motivo -->
            <div class="mb-3">
                ${motivoLabel(r.motivo)}
            </div>

            <!-- Descripcion del reporte -->
            ${r.descripcion ? `<p class="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 mb-3">${r.descripcion}</p>` : ''}

            <!-- Info del reportador -->
            <div class="flex flex-wrap items-center gap-4 text-xs text-gray-400 mb-3">
                <span><i class="fas fa-user mr-1"></i>${r.reportado_por} (${r.email_reportador})</span>
                <span><i class="fas fa-calendar mr-1"></i>${tiempoRelativo(r.fecha_creacion)}</span>
                ${r.resuelto_por_nombre ? `<span><i class="fas fa-user-shield mr-1"></i>Atendido por: ${r.resuelto_por_nombre}</span>` : ''}
            </div>

            ${r.nota_admin ? `<p class="text-xs text-gray-500 italic mb-3"><i class="fas fa-sticky-note mr-1"></i>Nota: ${r.nota_admin}</p>` : ''}

            <!-- Acciones -->
            ${esPendiente || esRevisado ? `
            <div class="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                ${esPendiente ? `
                <button onclick="marcarReporteRevisado(${r.id})" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer">
                    <i class="fas fa-eye"></i> Marcar revisado
                </button>` : ''}
                <button onclick="resolverReporte(${r.id})" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition-colors cursor-pointer">
                    <i class="fas fa-check"></i> Resolver
                </button>
                ${r.nombre_elemento ? `
                <button onclick="eliminarElementoReportado(${r.id}, '${r.tipo}', '${(r.nombre_elemento || '').replace(/'/g, "\\'")}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                    <i class="fas fa-trash"></i> Eliminar ${r.tipo}
                </button>` : ''}
            </div>` : ''}
        </div>`;
    }).join('');
}

async function marcarReporteRevisado(id) {
    try {
        await reportesAPI.cambiarEstado(id, 'revisado');
        mostrarToast('Reporte marcado como revisado');
        reportesCargados = false;
        await cargarReportes();
    } catch (error) {
        alertaError('Error', error.message || 'No se pudo actualizar el reporte');
    }
}

async function resolverReporte(id) {
    const { value: nota } = await Swal.fire({
        title: 'Resolver reporte',
        input: 'textarea',
        inputLabel: 'Nota del administrador (opcional)',
        inputPlaceholder: 'Describe la accion tomada...',
        showCancelButton: true,
        confirmButtonText: 'Resolver',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#22c55e'
    });

    if (nota === undefined) return; // Cancelled

    try {
        await reportesAPI.cambiarEstado(id, 'resuelto', nota || null);
        mostrarToast('Reporte resuelto');
        reportesCargados = false;
        await cargarReportes();
    } catch (error) {
        alertaError('Error', error.message || 'No se pudo resolver el reporte');
    }
}

async function eliminarElementoReportado(reporteId, tipo, nombre) {
    const confirmado = await alertaConfirmar(
        `Eliminar ${tipo}`,
        `¿Estas seguro de eliminar "${nombre}"? Esta accion no se puede deshacer y resolvera todos los reportes asociados.`
    );
    if (!confirmado) return;

    try {
        await reportesAPI.eliminarElemento(reporteId);
        mostrarToast(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} eliminada y reportes resueltos`);
        reportesCargados = false;
        await cargarReportes();
    } catch (error) {
        alertaError('Error', error.message || 'No se pudo eliminar el elemento');
    }
}

// ================================================================
// TAB: GESTION DE USUARIOS (continued)
// ================================================================

async function toggleActivoUsuario(userId, estadoActual) {
    const nuevoEstado = !estadoActual;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    const confirmado = await alertaConfirmar(
        `${nuevoEstado ? 'Activar' : 'Desactivar'} usuario`,
        `El usuario ${nuevoEstado ? 'podra' : 'no podra'} iniciar sesion`
    );
    if (!confirmado) return;

    try {
        await authAPI.cambiarEstadoUsuario(userId, nuevoEstado);
        const u = usuarios.find(u => u.id === userId);
        if (u) u.activo = nuevoEstado;
        mostrarToast(`Usuario ${nuevoEstado ? 'activado' : 'desactivado'}`);
        renderizarUsuarios();
    } catch (error) {
        alertaError('Error', error.message || `No se pudo ${accion} al usuario`);
    }
}
