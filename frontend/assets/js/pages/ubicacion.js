// ============================================================
// UBICACION.JS - Detalle de ubicacion
// ============================================================

let ubicacion = null;
let esFavorito = false;
let miniMapInstance = null;
let miniMapMarker = null;

document.addEventListener('DOMContentLoaded', async () => {
    const id = obtenerParametroURL('id');
    if (!id) {
        alertaError('Error', 'No se especifico una ubicacion');
        setTimeout(() => window.location.href = '/', 1500);
        return;
    }
    await cargarUbicacion(id);
});

async function cargarUbicacion(id) {
    try {
        const data = await ubicacionesAPI.obtenerPorId(id);
        ubicacion = data.data;
        renderizarDetalle();
        ocultar('#loading');
        mostrar('#detailContent');

        // Leaflet needs a tick to calculate container size after becoming visible
        setTimeout(() => {
            if (miniMapInstance) miniMapInstance.invalidateSize();
        }, 200);
    } catch (e) {
        alertaError('Error', 'No se pudo cargar la ubicacion');
        setTimeout(() => window.location.href = '/', 1500);
    }
}

function actualizarCalificacionUI() {
    const cal = parseFloat(ubicacion.promedio_calificacion) || 0;
    const total = ubicacion.total_calificaciones || 0;
    document.getElementById('ratingNumber').textContent = cal.toFixed(1);
    document.getElementById('ratingStars').innerHTML = renderizarEstrellas(cal);
    document.getElementById('totalCalificaciones').textContent = total;
}

function renderizarDetalle() {
    const u = ubicacion;
    document.title = `${u.nombre} | ¿Qué Plan?`;

    // Hero
    const heroImg = document.getElementById('heroImage');
    if (u.imagen_url) {
        heroImg.src = u.imagen_url;
        heroImg.alt = u.nombre;
    } else {
        document.getElementById('heroSection').style.background = 'linear-gradient(135deg, #F26B3A, #F5A623)';
        heroImg.style.display = 'none';
    }

    document.getElementById('ubicacionNombre').textContent = u.nombre;
    document.getElementById('ubicacionDescripcion').textContent = u.descripcion || 'Sin descripcion disponible.';
    document.getElementById('precio').textContent = formatearPrecio(u.precio_promedio);

    // Moods
    const badges = document.getElementById('moodBadges');
    if (u.moods?.length) {
        badges.innerHTML = u.moods.map(m =>
            `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur">${m.icono || ''} ${m.nombre}</span>`
        ).join('');
    }

    // Info
    if (u.horario) { document.getElementById('horario').textContent = u.horario; mostrar('#infoHorario'); }
    if (u.telefono) { document.getElementById('telefono').textContent = u.telefono; mostrar('#infoTelefono'); }
    if (u.direccion) { document.getElementById('direccion').textContent = u.direccion; mostrar('#infoDireccion'); }
    document.getElementById('vendedor').textContent = u.vendedor_nombre || 'Desconocido';

    // Rating
    actualizarCalificacionUI();

    // Interactive rating
    if (estaLogueado()) {
        initInteractiveRating();
    }

    // Activities
    if (u.actividades?.length) {
        mostrar('#actividadesSection');
        const logueado = estaLogueado();
        document.getElementById('actividadesList').innerHTML = u.actividades.map(a => `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl group">
                <div>
                    <p class="font-medium text-gray-900">${a.nombre}</p>
                    ${a.descripcion ? `<p class="text-sm text-gray-500 mt-0.5">${a.descripcion}</p>` : ''}
                    ${a.duracion ? `<span class="text-xs text-gray-400"><i class="fas fa-clock mr-1"></i>${a.duracion}</span>` : ''}
                </div>
                <div class="flex items-center gap-3">
                    ${a.precio ? `<span class="font-semibold text-queplan-orange">${formatearPrecio(a.precio)}</span>` : ''}
                    ${logueado ? `<button onclick="abrirModalReportar('actividad', ${a.id}, '${a.nombre.replace(/'/g, "\\'")}')" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all cursor-pointer" title="Reportar actividad"><i class="fas fa-flag text-xs"></i></button>` : ''}
                </div>
            </div>
        `).join('');
    }

    // Mini map - only create once
    if (!miniMapInstance) {
        miniMapInstance = L.map('miniMap', { zoomControl: false, dragging: false, scrollWheelZoom: false })
            .setView([u.latitud, u.longitud], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '' }).addTo(miniMapInstance);
        miniMapMarker = L.marker([u.latitud, u.longitud]).addTo(miniMapInstance);
    } else {
        miniMapInstance.setView([u.latitud, u.longitud], 15);
        miniMapMarker.setLatLng([u.latitud, u.longitud]);
    }

    // Favorito
    initFavorito();

    // Reportar ubicacion
    const btnReportar = document.getElementById('btnReportarUbicacion');
    if (btnReportar) {
        btnReportar.onclick = () => abrirModalReportar('ubicacion', u.id, u.nombre);
    }
}

function initInteractiveRating() {
    const container = document.getElementById('interactiveStars');

    function setupStars() {
        container.innerHTML = renderizarEstrellas(0, true);
        container.querySelectorAll('i').forEach(star => {
            star.addEventListener('click', async () => {
                const rating = parseInt(star.dataset.rating);
                try {
                    await ubicacionesAPI.calificar(ubicacion.id, rating);
                    mostrarToast('Calificacion guardada!');
                    // Reload just the rating data
                    const data = await ubicacionesAPI.obtenerPorId(ubicacion.id);
                    ubicacion = data.data;
                    actualizarCalificacionUI();
                } catch (e) {
                    alertaError('Error', e.message);
                }
            });
            star.addEventListener('mouseenter', () => {
                const val = parseInt(star.dataset.rating);
                container.querySelectorAll('i').forEach((s, i) => {
                    s.className = i < val
                        ? 'fas fa-star text-amber-400 cursor-pointer hover:text-amber-500 transition-transform'
                        : 'far fa-star text-gray-300 cursor-pointer hover:text-amber-500 transition-transform';
                });
            });
        });
        container.onmouseleave = setupStars;
    }

    setupStars();
}

function initFavorito() {
    const btn = document.getElementById('btnFavorito');
    if (!btn || !estaLogueado()) return;

    // Prevent duplicate listeners
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', async () => {
        try {
            if (esFavorito) {
                await ubicacionesAPI.quitarFavorito(ubicacion.id);
                esFavorito = false;
                newBtn.innerHTML = '<i class="far fa-heart"></i>';
                newBtn.classList.remove('text-red-500');
                newBtn.classList.add('text-gray-400');
                mostrarToast('Quitado de favoritos');
            } else {
                await ubicacionesAPI.agregarFavorito(ubicacion.id);
                esFavorito = true;
                newBtn.innerHTML = '<i class="fas fa-heart"></i>';
                newBtn.classList.add('text-red-500');
                newBtn.classList.remove('text-gray-400');
                mostrarToast('Agregado a favoritos!');
            }
        } catch (e) {
            alertaError('Error', e.message);
        }
    });
}
