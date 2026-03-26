// ============================================================
// HOME.JS - Mapa Principal
// ============================================================

let map;
let markers = [];
let ubicaciones = [];
let moodsData = [];
let filtrosMood = [];
let panelAbierto = false;

// ---- Emojis por mood ----
const MOOD_EMOJIS = {
    'Playa': '🏖️', 'Naturaleza': '🌿', 'Gastronomía': '🍽️', 'Cultura': '🏛️',
    'Aventura': '🪂', 'Vida nocturna': '🎉', 'Relax': '🧘', 'Familiar': '👨‍👩‍👧‍👦',
    'Romántico': '💕', 'Ecológico': '🌱'
};

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
    initMap();
    initPanelControls();
    initFilterControls();
    await cargarMoods();
    await cargarUbicaciones();
    ocultarLoading();
});

// ---- Map ----
function initMap() {
    map = L.map('map', {
        center: [21.1619, -86.8515],
        zoom: 13,
        zoomControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);
}

// obtenerTodas devuelve moods como string GROUP_CONCAT ("Playa,Naturaleza"), no array
function parseMoods(ubicacion) {
    if (!ubicacion.moods) return [];
    if (Array.isArray(ubicacion.moods)) return ubicacion.moods;
    return ubicacion.moods.split(',').map(n => ({ nombre: n.trim() }));
}

function crearMarker(ubicacion) {
    const moods = parseMoods(ubicacion);
    const emoji = moods.length > 0
        ? MOOD_EMOJIS[moods[0].nombre] || '📍'
        : '📍';

    const icon = L.divIcon({
        className: '',
        html: `<div class="marker-icon"><span>${emoji}</span></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
    });

    const marker = L.marker([ubicacion.latitud, ubicacion.longitud], { icon });

    const moodBadges = moods
        .map(m => `<span class="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-orange-50 text-orange-700">${MOOD_EMOJIS[m.nombre] || ''} ${m.nombre}</span>`)
        .join(' ');

    const stars = parseFloat(ubicacion.promedio_calificacion) || 0;
    const totalCal = ubicacion.total_calificaciones || 0;

    marker.bindPopup(`
        <div class="font-body">
            ${ubicacion.imagen_url ? `<img src="${ubicacion.imagen_url}" alt="${ubicacion.nombre}" class="w-full h-32 object-cover">` : ''}
            <div class="p-4">
                <h3 class="font-display font-bold text-base text-gray-900 mb-1">${ubicacion.nombre}</h3>
                <div class="flex items-center gap-1 mb-2">
                    ${renderizarEstrellas(stars)}
                    <span class="text-xs text-gray-500 ml-1">(${totalCal})</span>
                </div>
                ${moodBadges ? `<div class="flex flex-wrap gap-1 mb-2">${moodBadges}</div>` : ''}
                <div class="flex items-center justify-between">
                    <span class="text-sm font-semibold text-queplan-orange">${formatearPrecio(ubicacion.precio_promedio)}</span>
                    <a href="/pages/ubicacion.html?id=${ubicacion.id}" class="text-xs font-semibold text-queplan-orange hover:underline">
                        Ver detalle <i class="fas fa-arrow-right ml-0.5"></i>
                    </a>
                </div>
            </div>
        </div>
    `, { maxWidth: 300, closeButton: true });

    return marker;
}

function mostrarMarcadores(ubics) {
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    ubics.forEach(u => {
        const m = crearMarker(u);
        m.addTo(map);
        markers.push(m);
    });

    if (markers.length > 0) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

// ---- Data Loading ----
async function cargarMoods() {
    try {
        const data = await moodsAPI.obtenerTodos();
        moodsData = data.data || [];
        renderizarMoodChips();
    } catch (e) {
        console.error('Error cargando moods:', e);
    }
}

async function cargarUbicaciones(filtros = {}) {
    try {
        const data = await ubicacionesAPI.obtenerTodas(filtros);
        ubicaciones = data.data || [];
        mostrarMarcadores(ubicaciones);
    } catch (e) {
        console.error('Error cargando ubicaciones:', e);
        mostrarToast('Error cargando ubicaciones', 'error');
    }
}

function ocultarLoading() {
    const el = document.getElementById('mapLoading');
    if (el) {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
    }
}

// ---- Moods ----
function renderizarMoodChips() {
    const grid = document.getElementById('moodGrid');
    if (!grid) return;
    grid.innerHTML = moodsData.map(m => `
        <button class="mood-chip flex items-center gap-2 px-3 py-2 bg-gray-50 border-2 border-transparent rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all" data-mood-id="${m.id}">
            <span class="text-lg">${m.icono || MOOD_EMOJIS[m.nombre] || '📍'}</span>
            <span>${m.nombre}</span>
        </button>
    `).join('');

    grid.querySelectorAll('.mood-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('active');
            const id = chip.dataset.moodId;
            if (filtrosMood.includes(id)) {
                filtrosMood = filtrosMood.filter(x => x !== id);
            } else {
                filtrosMood.push(id);
            }
        });
    });
}

// ---- Panel Controls ----
function initPanelControls() {
    const panel = document.getElementById('filtersPanel');
    const toggle = document.getElementById('panelToggle');
    const toggleMobile = document.getElementById('panelToggleMobile');
    const close = document.getElementById('closePanel');
    const mapContainer = document.getElementById('mapContainer');

    function abrirPanel() {
        panel.classList.add('panel-open');
        if (window.innerWidth >= 768) mapContainer.classList.add('map-pushed');
        panelAbierto = true;
        if (toggle) toggle.style.display = 'none';
        if (toggleMobile) toggleMobile.style.display = 'none';
        setTimeout(() => map.invalidateSize(), 350);
    }

    function cerrarPanel() {
        panel.classList.remove('panel-open');
        mapContainer.classList.remove('map-pushed');
        panelAbierto = false;
        if (toggle) toggle.style.display = '';
        if (toggleMobile) toggleMobile.style.display = '';
        setTimeout(() => map.invalidateSize(), 350);
    }

    if (toggle) toggle.addEventListener('click', () => panelAbierto ? cerrarPanel() : abrirPanel());
    if (toggleMobile) toggleMobile.addEventListener('click', abrirPanel);
    if (close) close.addEventListener('click', cerrarPanel);
}

// ---- Filter Controls ----
function initFilterControls() {
    // Price presets
    document.querySelectorAll('.price-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.price-preset').forEach(b => b.classList.remove('active'));
            btn.classList.toggle('active');
            const min = document.getElementById('priceMin');
            const max = document.getElementById('priceMax');
            if (btn.classList.contains('active')) {
                min.value = btn.dataset.min;
                max.value = btn.dataset.max;
            } else {
                min.value = '';
                max.value = '';
            }
        });
    });

    // Search debounce
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => aplicarFiltros(), 400));
    }

    // Apply
    const btnApply = document.getElementById('btnApplyFilters');
    if (btnApply) btnApply.addEventListener('click', aplicarFiltros);

    // Clear
    const btnClear = document.getElementById('btnClearFilters');
    if (btnClear) btnClear.addEventListener('click', limpiarFiltros);
}

function aplicarFiltros() {
    const filtros = {};
    const search = document.getElementById('searchInput')?.value?.trim();
    const min = document.getElementById('priceMin')?.value;
    const max = document.getElementById('priceMax')?.value;

    if (search) filtros.buscar = search;
    if (min) filtros.precioMin = min;
    if (max) filtros.precioMax = max;
    if (filtrosMood.length > 0) filtros.mood = filtrosMood.join(',');

    cargarUbicaciones(filtros);
}

function limpiarFiltros() {
    document.getElementById('searchInput').value = '';
    document.getElementById('priceMin').value = '';
    document.getElementById('priceMax').value = '';
    filtrosMood = [];
    document.querySelectorAll('.mood-chip').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.price-preset').forEach(b => b.classList.remove('active'));
    cargarUbicaciones();
}
