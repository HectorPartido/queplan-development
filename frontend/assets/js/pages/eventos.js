// ============================================================
// EVENTOS.JS
// ============================================================

let eventos = [];
let filtroTipo = 'todos';
let asistenciasUsuario = {}; // { eventoId: true/false }

document.addEventListener('DOMContentLoaded', async () => {
    // Check URL param for tipo filter
    const tipoParam = obtenerParametroURL('tipo');
    if (tipoParam === 'ods') {
        filtroTipo = 'ods';
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        document.querySelector('[data-tab="ods"]')?.classList.add('active');
    }

    initTabs();
    initModalEventos();
    await cargarEventos();
});

function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filtroTipo = tab.dataset.tab;
            renderizarEventos();
        });
    });
}

function initModalEventos() {
    const modal = document.getElementById('modalEvento');
    if (!modal) return;

    // Cerrar al hacer click fuera del contenido
    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModalEvento();
    });

    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            cerrarModalEvento();
        }
    });
}

async function cargarEventos() {
    try {
        const data = await eventosAPI.obtenerTodos();
        eventos = data.data || [];

        // Si el usuario esta logueado, cargar su estado de asistencia para cada evento
        if (estaLogueado()) {
            await cargarEstadoAsistencias();
        }

        renderizarEventos();
    } catch (e) {
        alertaError('Error', 'No se pudieron cargar los eventos');
    } finally {
        ocultar('#eventosLoading');
    }
}

async function cargarEstadoAsistencias() {
    // Cargar en paralelo el estado de asistencia de cada evento
    const promesas = eventos.map(async (e) => {
        try {
            const res = await eventosAPI.obtenerAsistencia(e.id);
            asistenciasUsuario[e.id] = res.asistiendo;
        } catch (err) {
            asistenciasUsuario[e.id] = false;
        }
    });
    await Promise.all(promesas);
}

function renderizarEventos() {
    const grid = document.getElementById('eventosGrid');
    const empty = document.getElementById('eventosEmpty');

    let filtrados = eventos;
    if (filtroTipo !== 'todos') {
        filtrados = eventos.filter(e => e.tipo === filtroTipo);
    }

    if (filtrados.length === 0) {
        ocultar('#eventosGrid');
        mostrar('#eventosEmpty');
        return;
    }

    ocultar('#eventosEmpty');
    mostrar('#eventosGrid');

    const logueado = estaLogueado();

    grid.innerHTML = filtrados.map((e, i) => {
        const isOds = e.tipo === 'ods';
        const totalAsistentes = e.total_asistentes || 0;
        const asistiendo = asistenciasUsuario[e.id] || false;

        return `
        <div class="card animate-fade-in-up stagger-${(i % 6) + 1} group" style="animation-fill-mode: both">
            <div class="cursor-pointer" onclick="abrirModalEvento(${e.id})">
                ${e.imagen_url ? `<img src="${e.imagen_url}" alt="${e.titulo}" class="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300">` :
                `<div class="h-44 ${isOds ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-queplan-orange to-queplan-gold'} flex items-center justify-center">
                    <i class="fas ${isOds ? 'fa-leaf' : 'fa-calendar-alt'} text-white/30 text-5xl group-hover:scale-110 transition-transform duration-300"></i>
                </div>`}
                <div class="p-5">
                    <div class="flex items-center justify-between mb-3">
                        ${renderizarTipoEventoBadge(e.tipo)}
                        <span class="text-xs text-gray-400">${tiempoRelativo(e.fecha)}</span>
                    </div>
                    <h3 class="font-display text-lg font-semibold text-gray-900 mb-2 group-hover:text-queplan-orange transition-colors">${e.titulo}</h3>
                    <p class="text-sm text-gray-500 line-clamp-2 mb-4">${e.descripcion || ''}</p>
                    <div class="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        <span><i class="fas fa-calendar mr-1 text-queplan-orange"></i>${formatearFecha(e.fecha)}</span>
                        <span><i class="fas fa-clock mr-1 text-queplan-orange"></i>${formatearHora(e.hora)}</span>
                    </div>
                    ${e.ubicacion_nombre ? `<p class="text-xs text-gray-400 mb-1"><i class="fas fa-map-marker-alt mr-1"></i>${e.ubicacion_nombre}</p>` : ''}
                </div>
            </div>

            <!-- Asistencia (fuera del area clickeable del modal) -->
            <div class="px-5 pb-5">
                <div class="border-t border-gray-100 pt-3">
                    <div class="flex items-center justify-between">
                        <span class="inline-flex items-center gap-1.5 text-sm text-gray-500" id="asistencia-count-${e.id}">
                            <i class="fas fa-users text-queplan-orange"></i>
                            <span>${totalAsistentes}</span> ${totalAsistentes === 1 ? 'asistente' : 'asistentes'}
                        </span>
                        ${logueado ? `
                        <button
                            onclick="toggleAsistencia(${e.id})"
                            id="btn-asistir-${e.id}"
                            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${asistiendo
                                ? 'bg-queplan-orange text-white shadow-md hover:bg-queplan-orange-dark'
                                : 'border-2 border-queplan-orange/30 text-queplan-orange hover:bg-orange-50'
                            }">
                            <i class="fas ${asistiendo ? 'fa-check-circle' : 'fa-hand-point-up'}"></i>
                            ${asistiendo ? 'Asistire' : 'Quiero ir'}
                        </button>` : ''}
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ============================================================
// MODAL DETALLE DE EVENTO
// ============================================================

function abrirModalEvento(eventoId) {
    const evento = eventos.find(e => e.id === eventoId);
    if (!evento) return;

    const modal = document.getElementById('modalEvento');
    const content = document.getElementById('modalEventoContent');
    const hero = document.getElementById('modalEventoHero');
    const isOds = evento.tipo === 'ods';

    // Hero image/gradient
    if (evento.imagen_url) {
        hero.innerHTML = `
            <img src="${evento.imagen_url}" alt="${evento.titulo}" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
            <button onclick="cerrarModalEvento()" class="absolute top-4 right-4 z-20 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 hover:scale-110 transition-all shadow-lg cursor-pointer">
                <i class="fas fa-times"></i>
            </button>
            <div class="absolute bottom-4 left-6 right-6 z-10">
                <div class="mb-2">${renderizarTipoEventoBadge(evento.tipo)}</div>
                <h2 class="font-display text-2xl md:text-3xl font-bold text-white">${evento.titulo}</h2>
            </div>`;
    } else {
        hero.innerHTML = `
            <div class="w-full h-full ${isOds ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-queplan-orange to-queplan-gold'} flex items-center justify-center">
                <i class="fas ${isOds ? 'fa-leaf' : 'fa-calendar-alt'} text-white/20 text-7xl"></i>
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10"></div>
            <button onclick="cerrarModalEvento()" class="absolute top-4 right-4 z-20 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 hover:scale-110 transition-all shadow-lg cursor-pointer">
                <i class="fas fa-times"></i>
            </button>
            <div class="absolute bottom-4 left-6 right-6 z-10">
                <div class="mb-2">${renderizarTipoEventoBadge(evento.tipo)}</div>
                <h2 class="font-display text-2xl md:text-3xl font-bold text-white">${evento.titulo}</h2>
            </div>`;
    }

    // Info
    document.getElementById('modalEventoFecha').textContent = formatearFecha(evento.fecha);
    document.getElementById('modalEventoHora').textContent = formatearHora(evento.hora);
    document.getElementById('modalEventoCreador').textContent = evento.creador_nombre || 'Desconocido';

    // Ubicación
    const ubicWrap = document.getElementById('modalEventoUbicacionWrap');
    if (evento.ubicacion_nombre) {
        document.getElementById('modalEventoUbicacion').textContent = evento.ubicacion_nombre;
        ubicWrap.classList.remove('hidden');
    } else {
        ubicWrap.classList.add('hidden');
    }

    // Descripción completa
    document.getElementById('modalEventoDescripcion').textContent = evento.descripcion || 'Sin descripcion disponible.';

    // Asistencia en modal
    actualizarAsistenciaModal(evento);

    // Reportar evento (bind click)
    const btnReportarEvento = document.getElementById('btnReportarEvento');
    if (btnReportarEvento) {
        btnReportarEvento.onclick = () => abrirModalReportar('evento', evento.id, evento.titulo);
    }

    // Mostrar con animacion
    modal.classList.remove('hidden');
    // Forzar reflow para que la transicion funcione
    modal.offsetHeight;
    modal.classList.remove('opacity-0');
    content.classList.remove('scale-95');
    content.classList.add('scale-100');

    // Bloquear scroll del body
    document.body.style.overflow = 'hidden';
}

function actualizarAsistenciaModal(evento) {
    const totalAsistentes = evento.total_asistentes || 0;
    const asistiendo = asistenciasUsuario[evento.id] || false;
    const logueado = estaLogueado();

    const countEl = document.getElementById('modalAsistenciaCount');
    countEl.innerHTML = `
        <i class="fas fa-users text-queplan-orange text-lg"></i>
        <span class="font-semibold">${totalAsistentes} ${totalAsistentes === 1 ? 'persona asistira' : 'personas asistiran'}</span>`;

    const btnEl = document.getElementById('modalAsistenciaBtn');
    if (logueado) {
        btnEl.innerHTML = `
            <button
                onclick="toggleAsistenciaDesdeModal(${evento.id})"
                id="modal-btn-asistir-${evento.id}"
                class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${asistiendo
                    ? 'bg-queplan-orange text-white shadow-md hover:bg-queplan-orange-dark'
                    : 'border-2 border-queplan-orange/30 text-queplan-orange hover:bg-orange-50'
                }">
                <i class="fas ${asistiendo ? 'fa-check-circle' : 'fa-hand-point-up'}"></i>
                ${asistiendo ? 'Asistiré' : 'Quiero ir'}
            </button>`;
    } else {
        btnEl.innerHTML = '<span class="text-xs text-gray-400">Inicia sesion para confirmar asistencia</span>';
    }
}

function cerrarModalEvento() {
    const modal = document.getElementById('modalEvento');
    const content = document.getElementById('modalEventoContent');

    modal.classList.add('opacity-0');
    content.classList.remove('scale-100');
    content.classList.add('scale-95');

    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }, 300);
}

// ============================================================
// ASISTENCIA
// ============================================================

async function toggleAsistenciaDesdeModal(eventoId) {
    const modalBtn = document.getElementById(`modal-btn-asistir-${eventoId}`);
    if (modalBtn) {
        modalBtn.disabled = true;
        modalBtn.classList.add('opacity-50');
    }

    try {
        const res = await eventosAPI.toggleAsistencia(eventoId);

        // Update local state
        asistenciasUsuario[eventoId] = res.asistiendo;
        const evento = eventos.find(e => e.id === eventoId);
        if (evento) {
            evento.total_asistentes = res.total_asistentes;
        }

        // Update card button
        actualizarBotonCard(eventoId, res);

        // Update card count
        actualizarConteoCard(eventoId, res.total_asistentes);

        // Update modal
        if (evento) actualizarAsistenciaModal(evento);

        mostrarToast(res.asistiendo ? 'Te has registrado al evento' : 'Asistencia cancelada', res.asistiendo ? 'success' : 'info');
    } catch (error) {
        alertaError('Error', error.message || 'No se pudo registrar la asistencia');
    }
}

async function toggleAsistencia(eventoId) {
    const btn = document.getElementById(`btn-asistir-${eventoId}`);
    if (!btn) return;

    btn.disabled = true;
    btn.classList.add('opacity-50');

    try {
        const res = await eventosAPI.toggleAsistencia(eventoId);

        // Update local state
        asistenciasUsuario[eventoId] = res.asistiendo;
        const evento = eventos.find(e => e.id === eventoId);
        if (evento) {
            evento.total_asistentes = res.total_asistentes;
        }

        // Update card button
        actualizarBotonCard(eventoId, res);

        // Update card count
        actualizarConteoCard(eventoId, res.total_asistentes);

        mostrarToast(res.asistiendo ? 'Te has registrado al evento' : 'Asistencia cancelada', res.asistiendo ? 'success' : 'info');
    } catch (error) {
        alertaError('Error', error.message || 'No se pudo registrar la asistencia');
    } finally {
        btn.disabled = false;
        btn.classList.remove('opacity-50');
    }
}

function actualizarBotonCard(eventoId, res) {
    const btn = document.getElementById(`btn-asistir-${eventoId}`);
    if (!btn) return;

    if (res.asistiendo) {
        btn.className = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer bg-queplan-orange text-white shadow-md hover:bg-queplan-orange-dark';
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Asistire';
    } else {
        btn.className = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer border-2 border-queplan-orange/30 text-queplan-orange hover:bg-orange-50';
        btn.innerHTML = '<i class="fas fa-hand-point-up"></i> Quiero ir';
    }
    btn.disabled = false;
    btn.classList.remove('opacity-50');
}

function actualizarConteoCard(eventoId, total) {
    const countEl = document.getElementById(`asistencia-count-${eventoId}`);
    if (countEl) {
        countEl.innerHTML = `<i class="fas fa-users text-queplan-orange"></i> <span>${total}</span> ${total === 1 ? 'asistente' : 'asistentes'}`;
    }
}
