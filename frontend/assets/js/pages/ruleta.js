// ============================================================
// RULETA.JS - Ruleta de Lugares Aleatorios
// ============================================================

let moodsData = [];
let filtrosMood = [];
let ubicacionesPool = [];
let resultadoActual = null;
let miniMap = null;
let miniMapMarker = null;
let spinning = false;

const MOOD_EMOJIS = {
    'Playa': '🏖️', 'Naturaleza': '🌿', 'Gastronomía': '🍽️', 'Cultura': '🏛️',
    'Aventura': '🪂', 'Vida nocturna': '🎉', 'Relax': '🧘', 'Familiar': '👨‍👩‍👧‍👦',
    'Romántico': '💕', 'Ecológico': '🌱'
};

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
    await cargarMoods();
    initFilterControls();
    initButtons();
});

// ---- Moods ----
async function cargarMoods() {
    try {
        const data = await moodsAPI.obtenerTodos();
        moodsData = data.data || [];
        renderizarMoodChips();
    } catch (e) {
        console.error('Error cargando moods:', e);
    }
}

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

// ---- Filter Controls ----
function initFilterControls() {
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
}

function construirFiltros() {
    const filtros = {};
    const min = document.getElementById('priceMin').value;
    const max = document.getElementById('priceMax').value;
    if (min) filtros.precioMin = min;
    if (max) filtros.precioMax = max;
    if (filtrosMood.length > 0) filtros.mood = filtrosMood.join(',');
    return filtros;
}

// ---- Buttons ----
function initButtons() {
    document.getElementById('btnGirar').addEventListener('click', girarRuleta);
    document.getElementById('btnGirarDeNuevo').addEventListener('click', girarRuleta);
}

// ---- Roulette Core ----
async function girarRuleta() {
    if (spinning) return;
    spinning = true;

    const btn = document.getElementById('btnGirar');
    btn.disabled = true;
    btn.classList.remove('spin-ready');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Buscando...';

    // Hide previous results
    ocultar(document.getElementById('resultSection'));
    ocultar(document.getElementById('emptyState'));

    try {
        const data = await ubicacionesAPI.obtenerTodas(construirFiltros());
        ubicacionesPool = data.data || [];

        if (ubicacionesPool.length === 0) {
            ocultar(document.getElementById('ruletaContainer'));
            mostrar(document.getElementById('emptyState'));
            resetBoton();
            return;
        }

        const ruletaContainer = document.getElementById('ruletaContainer');
        mostrar(ruletaContainer);
        ruletaContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        animarRuleta(ubicacionesPool);
    } catch (e) {
        console.error('Error en ruleta:', e);
        mostrarToast('Error al buscar lugares', 'error');
        resetBoton();
    }
}

function resetBoton() {
    const btn = document.getElementById('btnGirar');
    btn.disabled = false;
    btn.classList.add('spin-ready');
    btn.innerHTML = '<i class="fas fa-random mr-2"></i> ¡Girar la Ruleta!';
    spinning = false;
}

// ---- Slot Machine Animation ----
function animarRuleta(pool) {
    const card = document.getElementById('ruletaCard');
    const totalSteps = 20 + Math.floor(Math.random() * 10);
    const ganadorIndex = Math.floor(Math.random() * pool.length);
    let step = 0;

    function tick() {
        const ubicacion = (step === totalSteps) ? pool[ganadorIndex] : pool[Math.floor(Math.random() * pool.length)];

        card.innerHTML = renderPreviewCard(ubicacion);
        card.classList.remove('ruleta-cycling');
        void card.offsetWidth; // force reflow
        card.classList.add('ruleta-cycling');

        step++;
        if (step <= totalSteps) {
            const progress = step / totalSteps;
            const delay = 50 + Math.pow(progress, 2) * 300;
            setTimeout(tick, delay);
        } else {
            // Winner!
            resultadoActual = pool[ganadorIndex];
            setTimeout(() => {
                ocultar(document.getElementById('ruletaContainer'));
                mostrarResultado(resultadoActual);
                resetBoton();
            }, 400);
        }
    }

    tick();
}

// ---- Preview Card (during cycling) ----
function renderPreviewCard(u) {
    const moods = parseMoods(u);
    const moodBadges = moods.slice(0, 3).map(m =>
        `<span class="px-2 py-0.5 bg-queplan-cream text-queplan-orange text-xs font-medium rounded-full">${MOOD_EMOJIS[m.nombre] || '📍'} ${m.nombre}</span>`
    ).join('');

    return `
        <div class="flex items-center gap-4 p-4">
            ${u.imagen_url
                ? `<img src="${u.imagen_url}" alt="${u.nombre}" class="w-24 h-24 rounded-xl object-cover flex-shrink-0">`
                : `<div class="w-24 h-24 rounded-xl bg-gradient-to-br from-queplan-orange to-queplan-gold flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-map-marker-alt text-white/40 text-2xl"></i>
                  </div>`}
            <div class="min-w-0">
                <h3 class="font-display text-lg font-bold text-gray-900 truncate">${u.nombre}</h3>
                <p class="text-sm font-semibold text-queplan-orange mb-1">${formatearPrecio(u.precio_promedio)}</p>
                <div class="flex flex-wrap gap-1">${moodBadges}</div>
            </div>
        </div>
    `;
}

// ---- Full Result ----
function mostrarResultado(u) {
    const moods = parseMoods(u);
    const moodBadges = moods.map(m =>
        `<span class="inline-flex items-center gap-1 px-2.5 py-1 bg-queplan-cream text-queplan-orange text-xs font-medium rounded-full">${MOOD_EMOJIS[m.nombre] || '📍'} ${m.nombre}</span>`
    ).join('');

    const stars = u.promedio_calificacion || 0;
    const totalCal = u.total_calificaciones || 0;

    const resultCard = document.getElementById('resultCard');
    resultCard.innerHTML = `
        ${u.imagen_url
            ? `<img src="${u.imagen_url}" alt="${u.nombre}" class="w-full h-48 md:h-56 object-cover">`
            : `<div class="w-full h-48 md:h-56 bg-gradient-to-br from-queplan-orange to-queplan-gold flex items-center justify-center">
                <i class="fas fa-map-marker-alt text-white/30 text-5xl"></i>
              </div>`}
        <div class="p-6">
            <div class="flex items-start justify-between gap-4 mb-3">
                <h2 class="font-display text-2xl font-bold text-gray-900">${u.nombre}</h2>
                <span class="text-xl font-bold text-gradient whitespace-nowrap">${formatearPrecio(u.precio_promedio)}</span>
            </div>
            ${u.descripcion ? `<p class="text-gray-600 text-sm mb-4 line-clamp-3">${u.descripcion}</p>` : ''}
            <div class="flex items-center gap-1 mb-3">
                ${renderizarEstrellas(stars)}
                <span class="text-xs text-gray-500 ml-1">(${totalCal} ${totalCal === 1 ? 'reseña' : 'reseñas'})</span>
            </div>
            <div class="flex flex-wrap gap-1.5 mb-3">${moodBadges}</div>
            ${u.direccion ? `<p class="text-sm text-gray-500"><i class="fas fa-map-pin mr-1.5 text-queplan-orange"></i>${u.direccion}</p>` : ''}
        </div>
    `;
    resultCard.classList.remove('ruleta-result');
    void resultCard.offsetWidth;
    resultCard.classList.add('ruleta-result');

    // Links
    document.getElementById('btnDetalle').href = `/pages/ubicacion.html?id=${u.id}`;
    document.getElementById('btnDirecciones').href = `https://www.google.com/maps/dir/?api=1&destination=${u.latitud},${u.longitud}`;

    // Mini map
    initMiniMap(u.latitud, u.longitud, u.nombre);

    const resultSection = document.getElementById('resultSection');
    mostrar(resultSection);
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---- Mini Map ----
function initMiniMap(lat, lng, nombre) {
    const container = document.getElementById('resultMap');

    if (miniMap) {
        miniMap.setView([lat, lng], 15);
        if (miniMapMarker) miniMapMarker.remove();
    } else {
        miniMap = L.map('resultMap', {
            center: [lat, lng],
            zoom: 15,
            zoomControl: true,
            dragging: true,
            scrollWheelZoom: false
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(miniMap);
    }

    miniMapMarker = L.marker([lat, lng]).addTo(miniMap).bindPopup(nombre).openPopup();

    // Fix for map in hidden container
    setTimeout(() => miniMap.invalidateSize(), 200);
}

// ---- Helpers ----
function parseMoods(ubicacion) {
    if (!ubicacion.moods) return [];
    if (Array.isArray(ubicacion.moods)) return ubicacion.moods;
    return ubicacion.moods.split(',').map(n => ({ nombre: n.trim() }));
}

function mostrar(el) { if (el) el.classList.remove('hidden'); }
function ocultar(el) { if (el) el.classList.add('hidden'); }
