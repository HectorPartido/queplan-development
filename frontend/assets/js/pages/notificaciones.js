// ============================================================
// NOTIFICACIONES.JS
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    protegerPagina();
    await cargarNotificaciones();
    initMarcarTodas();
});

async function cargarNotificaciones() {
    try {
        const data = await notificacionesAPI.obtenerTodas();
        const notificaciones = data.data || [];
        const noLeidas = data.no_leidas || 0;
        renderizarNotificaciones(notificaciones, noLeidas);
    } catch (e) {
        alertaError('Error', 'No se pudieron cargar las notificaciones');
    } finally {
        ocultar('#notiLoading');
    }
}

/**
 * Determina icono y colores segun el contenido de la notificacion
 */
function obtenerEstiloNotificacion(n) {
    // Reporte
    if (n.mensaje.includes('⚠️') || n.mensaje.toLowerCase().includes('reporte')) {
        return { icon: 'fa-flag', bg: 'bg-red-100', text: 'text-red-500' };
    }
    // ODS / Llamado a la ayuda
    if (n.evento_tipo === 'ods' || n.mensaje.includes('🆘') || n.mensaje.includes('🐢') || n.mensaje.includes('🌿') || n.mensaje.includes('🦀')) {
        return { icon: 'fa-leaf', bg: 'bg-emerald-100', text: 'text-emerald-600' };
    }
    // Solicitud de evento (admin)
    if (n.mensaje.includes('📋') || n.mensaje.toLowerCase().includes('solicitud')) {
        return { icon: 'fa-clipboard-list', bg: 'bg-blue-100', text: 'text-blue-500' };
    }
    // Evento general
    if (n.evento_tipo || n.mensaje.includes('📅')) {
        return { icon: 'fa-calendar-alt', bg: 'bg-orange-100', text: 'text-queplan-orange' };
    }
    // Default
    return { icon: 'fa-bell', bg: 'bg-orange-100', text: 'text-queplan-orange' };
}

function renderizarNotificaciones(notificaciones, noLeidas) {
    const list = document.getElementById('notiList');
    const empty = document.getElementById('notiEmpty');
    const btnTodas = document.getElementById('btnMarcarTodas');

    if (notificaciones.length === 0) {
        mostrar('#notiEmpty');
        return;
    }

    mostrar('#notiList');
    if (noLeidas > 0) mostrar(btnTodas);

    list.innerHTML = notificaciones.map((n, i) => {
        const estilo = obtenerEstiloNotificacion(n);
        const tieneUrl = n.url ? true : false;

        return `
        <div class="notification-item ${n.leida ? '' : 'unread'} bg-white rounded-xl shadow-sm flex items-start gap-4 animate-fade-in-up stagger-${(i % 6) + 1} ${tieneUrl ? 'hover:shadow-md transition-shadow' : ''}" style="animation-fill-mode: both" id="noti-${n.id}">
            <div class="flex-1 min-w-0 flex items-start gap-4 p-4 ${tieneUrl ? 'cursor-pointer' : ''}" ${tieneUrl ? `onclick="navegarNotificacion(${n.id}, '${n.url}')"` : ''}>
                <div class="w-10 h-10 rounded-full ${estilo.bg} ${estilo.text} flex items-center justify-center flex-shrink-0">
                    <i class="fas ${estilo.icon}"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-900 ${n.leida ? '' : 'font-semibold'}">${n.mensaje}</p>
                    ${n.evento_titulo ? `<p class="text-xs text-queplan-orange mt-0.5">${n.evento_titulo}</p>` : ''}
                    <p class="text-xs text-gray-400 mt-1">${tiempoRelativo(n.fecha)}</p>
                </div>
                ${tieneUrl ? '<i class="fas fa-chevron-right text-gray-300 text-xs flex-shrink-0 mt-1"></i>' : ''}
            </div>
            <div class="flex items-center gap-1 flex-shrink-0 pr-4 pt-4">
                ${!n.leida ? `
                    <button onclick="event.stopPropagation(); marcarLeida(${n.id})" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-queplan-orange hover:bg-queplan-cream transition-colors" title="Marcar como leida">
                        <i class="fas fa-check"></i>
                    </button>
                ` : ''}
                <button onclick="event.stopPropagation(); eliminarNotificacion(${n.id})" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Eliminar">
                    <i class="fas fa-trash-alt text-xs"></i>
                </button>
            </div>
        </div>`;
    }).join('');
}

/**
 * Navegar a la URL de la notificacion y marcarla como leida
 */
async function navegarNotificacion(id, url) {
    try {
        await notificacionesAPI.marcarLeida(id);
    } catch (e) {
        // No bloquear la navegacion si falla marcar como leida
    }
    window.location.href = url;
}

async function marcarLeida(id) {
    try {
        await notificacionesAPI.marcarLeida(id);
        const el = document.getElementById(`noti-${id}`);
        if (el) {
            el.classList.remove('unread');
            const checkBtn = el.querySelector('[title="Marcar como leida"]');
            if (checkBtn) checkBtn.remove();
        }
        actualizarConteoNotificaciones();
    } catch (e) {
        alertaError('Error', e.message);
    }
}

async function eliminarNotificacion(id) {
    try {
        await notificacionesAPI.eliminar(id);
        const el = document.getElementById(`noti-${id}`);
        if (el) {
            el.style.transition = 'opacity 0.3s, transform 0.3s';
            el.style.opacity = '0';
            el.style.transform = 'translateX(20px)';
            setTimeout(() => {
                el.remove();
                if (document.getElementById('notiList').children.length === 0) {
                    ocultar('#notiList');
                    ocultar('#btnMarcarTodas');
                    mostrar('#notiEmpty');
                }
            }, 300);
        }
        actualizarConteoNotificaciones();
        mostrarToast('Notificacion eliminada');
    } catch (e) {
        alertaError('Error', e.message);
    }
}

function initMarcarTodas() {
    const btn = document.getElementById('btnMarcarTodas');
    if (btn) {
        btn.addEventListener('click', async () => {
            try {
                await notificacionesAPI.marcarTodasLeidas();
                document.querySelectorAll('.notification-item.unread').forEach(el => {
                    el.classList.remove('unread');
                    const checkBtn = el.querySelector('[title="Marcar como leida"]');
                    if (checkBtn) checkBtn.remove();
                });
                ocultar(btn);
                actualizarConteoNotificaciones();
                mostrarToast('Todas marcadas como leidas');
            } catch (e) {
                alertaError('Error', e.message);
            }
        });
    }
}
