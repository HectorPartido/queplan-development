// ============================================================
// UTILS.JS - Funciones Utilitarias
// ============================================================

const QUEPLAN_COLOR = '#F26B3A';

// ---- Formateo ----
function formatearPrecio(precio) {
    if (Number(precio) === 0) return 'Gratis';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(precio);
}

function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatearFechaCorta(fecha) {
    return new Date(fecha).toLocaleDateString('es-MX');
}

function formatearHora(hora) {
    const [h, m] = hora.split(':');
    const d = new Date();
    d.setHours(parseInt(h), parseInt(m));
    return d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function tiempoRelativo(fecha) {
    const diff = Date.now() - new Date(fecha).getTime();
    const min = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);
    if (min < 1) return 'Justo ahora';
    if (min < 60) return `Hace ${min} min`;
    if (hrs < 24) return `Hace ${hrs}h`;
    if (dias < 7) return `Hace ${dias}d`;
    return formatearFechaCorta(fecha);
}

// ---- Renderizado ----
function renderizarEstrellas(cal, interactivo = false) {
    const r = Math.round(cal * 2) / 2;
    let html = '';
    for (let i = 1; i <= 5; i++) {
        let cls = 'far fa-star text-gray-300';
        if (i <= r) cls = 'fas fa-star text-amber-400';
        else if (i - 0.5 === r) cls = 'fas fa-star-half-alt text-amber-400';
        html += interactivo
            ? `<i class="${cls} cursor-pointer hover:text-amber-500 transition-transform" data-rating="${i}"></i>`
            : `<i class="${cls}"></i>`;
    }
    return html;
}

function renderizarMoodBadge(mood) {
    return `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">${mood.icono || ''} ${mood.nombre}</span>`;
}

function renderizarEstadoBadge(estado) {
    const map = {
        pendiente: { bg: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: 'fa-clock' },
        aprobada:  { bg: 'bg-green-50 text-green-700 border-green-200', icon: 'fa-check' },
        rechazada: { bg: 'bg-red-50 text-red-700 border-red-200', icon: 'fa-times' }
    };
    const s = map[estado] || map.pendiente;
    return `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${s.bg} border"><i class="fas ${s.icon}"></i> ${estado.charAt(0).toUpperCase() + estado.slice(1)}</span>`;
}

function renderizarTipoEventoBadge(tipo) {
    if (tipo === 'ods') {
        return `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200"><i class="fas fa-leaf"></i> Llamado a la Ayuda</span>`;
    }
    return `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"><i class="fas fa-calendar"></i> Evento</span>`;
}

// ---- Alertas (SweetAlert2) ----
function alertaExito(titulo, texto = '') {
    Swal.fire({ icon: 'success', title: titulo, text: texto, confirmButtonColor: QUEPLAN_COLOR });
}

function alertaError(titulo, texto = '') {
    Swal.fire({ icon: 'error', title: titulo, text: texto, confirmButtonColor: QUEPLAN_COLOR });
}

function alertaAdvertencia(titulo, texto = '') {
    Swal.fire({ icon: 'warning', title: titulo, text: texto, confirmButtonColor: QUEPLAN_COLOR });
}

async function alertaConfirmar(titulo, texto = '') {
    const r = await Swal.fire({
        icon: 'question', title: titulo, text: texto,
        showCancelButton: true, confirmButtonColor: QUEPLAN_COLOR, cancelButtonColor: '#6b7280',
        confirmButtonText: 'Si, continuar', cancelButtonText: 'Cancelar'
    });
    return r.isConfirmed;
}

function mostrarToast(mensaje, tipo = 'success') {
    Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        customClass: { popup: 'mt-16' }
    }).fire({ icon: tipo, title: mensaje });
}

// ---- DOM ----
function mostrar(el) { const e = typeof el === 'string' ? document.querySelector(el) : el; if (e) e.classList.remove('hidden'); }
function ocultar(el) { const e = typeof el === 'string' ? document.querySelector(el) : el; if (e) e.classList.add('hidden'); }
function alternar(el) { const e = typeof el === 'string' ? document.querySelector(el) : el; if (e) e.classList.toggle('hidden'); }

function botonCargando(btn, cargando) {
    if (cargando) {
        btn.disabled = true;
        btn.dataset.textoOriginal = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner animate-spin mr-2"></i>Cargando...';
    } else {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.textoOriginal || btn.innerHTML;
    }
}

// ---- URL ----
function obtenerParametroURL(nombre) {
    return new URLSearchParams(window.location.search).get(nombre);
}

// ---- Performance ----
function debounce(func, wait) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => func(...args), wait); };
}

function throttle(func, limit) {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) { func(...args); inThrottle = true; setTimeout(() => inThrottle = false, limit); }
    };
}
