// ============================================================
// MIS-UBICACIONES.JS - Gestion de Ubicaciones del Vendedor
// ============================================================

let misUbicaciones = [];
let moodsDisponibles = [];
let moodsSeleccionados = [];
let mapPicker = null;
let markerPicker = null;
let modoEdicion = false;
let editandoId = null;
let misEventos = [];
let modoEdicionEvento = false;
let editandoEventoId = null;
let misActividades = [];
let modoEdicionActividad = false;
let editandoActividadId = null;
let editandoActividadUbicacionId = null;

document.addEventListener('DOMContentLoaded', async () => {
    protegerPaginaPorRol(['vendedor', 'admin']);
    initMapPicker();
    initFormEvents();
    initEventoFormEvents();
    initActividadFormEvents();
    await Promise.all([cargarMoods(), cargarMisUbicaciones(), cargarMisEventos()]);
    await cargarMisActividades();
});

// ---- Map Picker ----
function initMapPicker() {
    mapPicker = L.map('mapPicker', { attributionControl: false })
        .setView([21.1619, -86.8515], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '' })
        .addTo(mapPicker);

    mapPicker.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setMarker(lat, lng);
    });

    // Fix map render when form becomes visible
    const observer = new MutationObserver(() => {
        if (!document.getElementById('formSection').classList.contains('hidden')) {
            setTimeout(() => mapPicker.invalidateSize(), 100);
        }
    });
    observer.observe(document.getElementById('formSection'), { attributes: true, attributeFilter: ['class'] });
}

function setMarker(lat, lng) {
    if (markerPicker) {
        markerPicker.setLatLng([lat, lng]);
    } else {
        markerPicker = L.marker([lat, lng]).addTo(mapPicker);
    }

    document.getElementById('inputLatitud').value = lat;
    document.getElementById('inputLongitud').value = lng;
    document.getElementById('coordsValue').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    mostrar('#coordsText');

    // Sincronizar campos manuales
    const latManual = document.getElementById('inputLatitudManual');
    const lngManual = document.getElementById('inputLongitudManual');
    if (latManual) latManual.value = lat;
    if (lngManual) lngManual.value = lng;

    mapPicker.setView([lat, lng], 15);
}

// ---- Form Events ----
function initFormEvents() {
    const btnNueva = document.getElementById('btnNueva');
    const btnEmpty = document.getElementById('btnEmptyAdd');
    const btnCancel = document.getElementById('btnCancelForm');
    const form = document.getElementById('ubicacionForm');

    btnNueva.addEventListener('click', () => toggleForm(true));
    if (btnEmpty) btnEmpty.addEventListener('click', () => toggleForm(true));
    btnCancel.addEventListener('click', () => toggleForm(false));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarUbicacion();
    });

    // Aplicar coordenadas manuales
    const btnCoords = document.getElementById('btnAplicarCoords');
    if (btnCoords) {
        btnCoords.addEventListener('click', () => {
            const lat = parseFloat(document.getElementById('inputLatitudManual').value);
            const lng = parseFloat(document.getElementById('inputLongitudManual').value);
            if (isNaN(lat) || isNaN(lng)) return alertaError('Coordenadas inválidas', 'Ingresa latitud y longitud válidas');
            if (lat < -90 || lat > 90) return alertaError('Latitud inválida', 'Debe estar entre -90 y 90');
            if (lng < -180 || lng > 180) return alertaError('Longitud inválida', 'Debe estar entre -180 y 180');
            setMarker(lat, lng);
            mostrarToast('Coordenadas aplicadas');
        });
    }
}

function toggleForm(show) {
    const section = document.getElementById('formSection');
    if (show) {
        if (!modoEdicion) resetForm();
        mostrar(section);
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => mapPicker.invalidateSize(), 200);
    } else {
        ocultar(section);
        resetForm();
    }
}

// ---- Load Moods ----
async function cargarMoods() {
    try {
        const res = await moodsAPI.obtenerTodos();
        moodsDisponibles = res.data || [];
        renderizarMoodSelector();
    } catch (error) {
        console.error('Error cargando moods:', error);
    }
}

function renderizarMoodSelector() {
    const container = document.getElementById('moodSelector');
    container.innerHTML = moodsDisponibles.map(m => `
        <button type="button" data-mood-id="${m.id}" class="mood-chip px-3 py-1.5 text-sm rounded-full border-2 border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 transition-all cursor-pointer select-none">
            ${m.icono || ''} ${m.nombre}
        </button>
    `).join('');

    container.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-mood-id]');
        if (!chip) return;

        const id = parseInt(chip.dataset.moodId);
        chip.classList.toggle('active');

        if (moodsSeleccionados.includes(id)) {
            moodsSeleccionados = moodsSeleccionados.filter(m => m !== id);
        } else {
            moodsSeleccionados.push(id);
        }
    });
}

// ---- Load My Locations ----
async function cargarMisUbicaciones() {
    try {
        const res = await ubicacionesAPI.obtenerMias();
        misUbicaciones = res.data || [];
        renderizarMisUbicaciones();
    } catch (error) {
        alertaError('Error', 'No se pudieron cargar tus ubicaciones');
    } finally {
        ocultar('#ubicacionesLoading');
    }
}

function renderizarMisUbicaciones() {
    const grid = document.getElementById('misUbicacionesGrid');
    const empty = document.getElementById('ubicacionesEmpty');

    if (misUbicaciones.length === 0) {
        ocultar(grid);
        mostrar(empty);
        return;
    }

    mostrar(grid);
    ocultar(empty);

    grid.innerHTML = misUbicaciones.map((u, i) => {
        const moods = parseMoods(u.moods);
        const moodBadges = moods.map(m => `<span class="inline-block px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded-full border border-orange-200">${m}</span>`).join('');

        return `
        <div id="ubicacion-${u.id}" class="card animate-fade-in-up stagger-${(i % 6) + 1} overflow-hidden" style="animation-fill-mode: both">
            <!-- Image -->
            <div class="h-40 relative overflow-hidden">
                ${u.imagen_url
                    ? `<img src="${u.imagen_url}" alt="${u.nombre}" class="w-full h-full object-cover">`
                    : `<div class="w-full h-full bg-gradient-to-br from-queplan-orange/20 via-queplan-gold/20 to-queplan-coral/20 flex items-center justify-center">
                        <i class="fas fa-map-marker-alt text-3xl text-queplan-orange/40"></i>
                    </div>`
                }
                <div class="absolute top-3 right-3">
                    ${renderizarEstadoBadge(u.estado)}
                </div>
            </div>

            <!-- Body -->
            <div class="p-4">
                <h3 class="font-display text-base font-bold text-gray-900 mb-1">${u.nombre}</h3>

                <div class="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                    <span><i class="fas fa-dollar-sign mr-1"></i>${formatearPrecio(u.precio_promedio)}</span>
                    ${u.promedio_calificacion ? `<span><i class="fas fa-star text-yellow-400 mr-1"></i>${parseFloat(u.promedio_calificacion).toFixed(1)}</span>` : ''}
                </div>

                ${moodBadges ? `<div class="flex flex-wrap gap-1 mb-3">${moodBadges}</div>` : ''}

                <p class="text-xs text-gray-400 mb-3"><i class="fas fa-calendar mr-1"></i>${tiempoRelativo(u.fecha_creacion)}</p>

                <!-- Actions -->
                <div class="flex gap-2">
                    <button data-action="editar" data-id="${u.id}" class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-queplan-orange/10 text-queplan-orange text-xs font-semibold rounded-lg hover:bg-queplan-orange/20 transition-colors cursor-pointer">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button data-action="eliminar" data-id="${u.id}" class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors cursor-pointer">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');

    // Event delegation
    grid.onclick = (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id = parseInt(btn.dataset.id);
        if (btn.dataset.action === 'editar') editarUbicacion(id);
        if (btn.dataset.action === 'eliminar') eliminarUbicacion(id);
    };
}

// ---- Parse moods ----
function parseMoods(moodsStr) {
    if (!moodsStr) return [];
    if (typeof moodsStr === 'string') return moodsStr.split(',').map(m => m.trim()).filter(Boolean);
    return moodsStr;
}

function parseMoodIds(moodIdsStr) {
    if (!moodIdsStr) return [];
    if (typeof moodIdsStr === 'string') return moodIdsStr.split(',').map(id => parseInt(id.trim())).filter(n => !isNaN(n));
    return moodIdsStr;
}

// ---- Save (Create or Update) ----
async function guardarUbicacion() {
    const nombre = document.getElementById('inputNombre').value.trim();
    const descripcion = document.getElementById('inputDescripcion').value.trim();
    const direccion = document.getElementById('inputDireccion').value.trim();
    const precio_promedio = parseFloat(document.getElementById('inputPrecio').value);
    const telefono = document.getElementById('inputTelefono').value.trim();
    const horario = document.getElementById('inputHorario').value.trim();
    const imagen_url = document.getElementById('inputImagen').value.trim();
    const latitud = parseFloat(document.getElementById('inputLatitud').value);
    const longitud = parseFloat(document.getElementById('inputLongitud').value);

    // Validate
    if (!nombre) return alertaError('Campo requerido', 'Ingresa el nombre del lugar');
    if (isNaN(precio_promedio) || precio_promedio < 0) return alertaError('Campo requerido', 'Ingresa un precio valido');
    if (isNaN(latitud) || isNaN(longitud)) return alertaError('Ubicacion requerida', 'Haz clic en el mapa para colocar la ubicacion');

    const datos = {
        nombre,
        descripcion: descripcion || null,
        direccion: direccion || null,
        precio_promedio,
        telefono: telefono || null,
        horario: horario || null,
        imagen_url: imagen_url || null,
        latitud,
        longitud,
        moods: moodsSeleccionados
    };

    const btn = document.getElementById('btnSubmit');
    botonCargando(btn, true);

    try {
        if (modoEdicion) {
            await ubicacionesAPI.actualizar(editandoId, datos);
            mostrarToast('Ubicacion actualizada');
        } else {
            await ubicacionesAPI.crear(datos);
            await alertaExito('Solicitud enviada', 'Tu ubicacion esta pendiente de aprobacion por un administrador');
        }

        botonCargando(btn, false);
        toggleForm(false);
        await cargarMisUbicaciones();
    } catch (error) {
        alertaError('Error', error.message || 'No se pudo guardar la ubicacion');
        botonCargando(btn, false);
    }
}

// ---- Edit ----
function editarUbicacion(id) {
    const u = misUbicaciones.find(ub => ub.id === id);
    if (!u) return;

    modoEdicion = true;
    editandoId = id;

    // Populate form
    document.getElementById('inputNombre').value = u.nombre || '';
    document.getElementById('inputDescripcion').value = u.descripcion || '';
    document.getElementById('inputDireccion').value = u.direccion || '';
    document.getElementById('inputPrecio').value = u.precio_promedio || '';
    document.getElementById('inputTelefono').value = u.telefono || '';
    document.getElementById('inputHorario').value = u.horario || '';
    document.getElementById('inputImagen').value = u.imagen_url || '';

    // Show image preview if exists
    if (u.imagen_url) {
        mostrarPreviewImagen(u.imagen_url, 'ubicacion');
    }

    // Set marker
    if (u.latitud && u.longitud) {
        setMarker(parseFloat(u.latitud), parseFloat(u.longitud));
    }

    // Set moods
    const existingMoodIds = parseMoodIds(u.mood_ids);
    moodsSeleccionados = [...existingMoodIds];

    // Update mood chips visual
    document.querySelectorAll('#moodSelector [data-mood-id]').forEach(chip => {
        const chipId = parseInt(chip.dataset.moodId);
        if (existingMoodIds.includes(chipId)) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });

    // Update form title and button
    document.getElementById('formTitle').innerHTML = '<i class="fas fa-edit text-queplan-orange mr-2"></i>Editar Ubicacion';
    document.getElementById('btnSubmitText').textContent = 'Guardar Cambios';

    toggleForm(true);
}

// ---- Delete ----
async function eliminarUbicacion(id) {
    const confirmado = await alertaConfirmar(
        'Eliminar ubicacion',
        'Esta accion no se puede deshacer. Se eliminara permanentemente.'
    );
    if (!confirmado) return;

    try {
        await ubicacionesAPI.eliminar(id);

        // Animate out
        const card = document.getElementById(`ubicacion-${id}`);
        if (card) {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.9)';
            setTimeout(() => card.remove(), 300);
        }

        misUbicaciones = misUbicaciones.filter(u => u.id !== id);

        if (misUbicaciones.length === 0) {
            setTimeout(() => {
                ocultar('#misUbicacionesGrid');
                mostrar('#ubicacionesEmpty');
            }, 350);
        }

        mostrarToast('Ubicacion eliminada');
    } catch (error) {
        alertaError('Error', error.message || 'No se pudo eliminar la ubicacion');
    }
}

// ---- Reset Form ----
function resetForm() {
    document.getElementById('ubicacionForm').reset();
    document.getElementById('inputLatitud').value = '';
    document.getElementById('inputLongitud').value = '';
    const latM = document.getElementById('inputLatitudManual');
    const lngM = document.getElementById('inputLongitudManual');
    if (latM) latM.value = '';
    if (lngM) lngM.value = '';
    document.getElementById('inputImagen').value = '';
    ocultar('#coordsText');
    quitarImagen('ubicacion');

    moodsSeleccionados = [];
    document.querySelectorAll('#moodSelector .active').forEach(c => c.classList.remove('active'));

    if (markerPicker) {
        mapPicker.removeLayer(markerPicker);
        markerPicker = null;
    }

    mapPicker.setView([21.1619, -86.8515], 13);

    modoEdicion = false;
    editandoId = null;
    document.getElementById('formTitle').innerHTML = '<i class="fas fa-map-marker-alt text-queplan-orange mr-2"></i>Nueva Ubicacion';
    document.getElementById('btnSubmitText').textContent = 'Enviar Solicitud';
}

// ============================================================
// SECCION: EVENTOS
// ============================================================

function initEventoFormEvents() {
    const btnNuevo = document.getElementById('btnNuevoEvento');
    const btnEmpty = document.getElementById('btnEmptyEvento');
    const btnCancel = document.getElementById('btnCancelEventoForm');
    const form = document.getElementById('eventoForm');

    btnNuevo.addEventListener('click', () => toggleEventoForm(true));
    if (btnEmpty) btnEmpty.addEventListener('click', () => toggleEventoForm(true));
    btnCancel.addEventListener('click', () => toggleEventoForm(false));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarEvento();
    });

    // Tipo selector toggle
    const options = document.querySelectorAll('#tipoEventoSelector .group-option');
    options.forEach(opt => {
        opt.addEventListener('click', () => {
            options.forEach(o => {
                o.classList.remove('active');
                o.classList.remove('border-blue-200', 'bg-blue-50');
                o.classList.add('border-gray-200', 'bg-gray-50');
            });
            opt.classList.add('active');
            opt.classList.remove('border-gray-200', 'bg-gray-50');
            opt.classList.add('border-blue-200', 'bg-blue-50');

            const tipo = opt.querySelector('input[name="tipoEvento"]').value;
            const ubicacionWrapper = document.getElementById('ubicacionEventoWrapper');
            if (tipo === 'general') {
                mostrar(ubicacionWrapper);
            } else {
                ocultar(ubicacionWrapper);
            }
        });
    });
}

function toggleEventoForm(show) {
    const section = document.getElementById('eventoFormSection');
    if (show) {
        if (!modoEdicionEvento) resetEventoForm();
        poblarSelectUbicaciones();
        mostrar(section);
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        ocultar(section);
        resetEventoForm();
    }
}

function poblarSelectUbicaciones() {
    const select = document.getElementById('selectUbicacion');
    const aprobadas = misUbicaciones.filter(u => u.estado === 'aprobada');
    select.innerHTML = '<option value="">Selecciona una de tus ubicaciones</option>' +
        aprobadas.map(u => `<option value="${u.id}">${u.nombre}</option>`).join('');
}

// ---- Load My Events ----
async function cargarMisEventos() {
    try {
        const res = await eventosAPI.obtenerMisEventos();
        misEventos = res.data || [];
        renderizarMisEventos();
    } catch (error) {
        console.error('Error cargando eventos:', error);
    } finally {
        ocultar('#eventosLoading');
    }
}

function renderizarEventoEstadoBadge(estado) {
    return renderizarEstadoBadge(estado);
}

function renderizarEventoTipoBadge(tipo) {
    if (tipo === 'ods') {
        return '<span class="inline-block px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full border border-green-200"><i class="fas fa-leaf mr-1"></i>ODS</span>';
    }
    return '<span class="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200"><i class="fas fa-calendar mr-1"></i>General</span>';
}

function renderizarMisEventos() {
    const grid = document.getElementById('misEventosGrid');
    const empty = document.getElementById('eventosEmpty');

    if (misEventos.length === 0) {
        ocultar(grid);
        mostrar(empty);
        return;
    }

    mostrar(grid);
    ocultar(empty);

    grid.innerHTML = misEventos.map((e, i) => {
        return `
        <div id="evento-${e.id}" class="card animate-fade-in-up stagger-${(i % 6) + 1} overflow-hidden" style="animation-fill-mode: both">
            <!-- Image -->
            <div class="h-40 relative overflow-hidden">
                ${e.imagen_url
                    ? `<img src="${e.imagen_url}" alt="${e.titulo}" class="w-full h-full object-cover">`
                    : `<div class="w-full h-full bg-gradient-to-br ${e.tipo === 'ods' ? 'from-green-200 via-emerald-100 to-teal-200' : 'from-queplan-orange/20 via-queplan-gold/20 to-queplan-coral/20'} flex items-center justify-center">
                        <i class="fas ${e.tipo === 'ods' ? 'fa-leaf text-green-400' : 'fa-calendar-alt text-queplan-orange/40'} text-3xl"></i>
                    </div>`
                }
                <div class="absolute top-3 right-3">
                    ${renderizarEventoEstadoBadge(e.estado)}
                </div>
                <div class="absolute top-3 left-3">
                    ${renderizarEventoTipoBadge(e.tipo)}
                </div>
            </div>

            <!-- Body -->
            <div class="p-4">
                <h3 class="font-display text-base font-bold text-gray-900 mb-1">${e.titulo}</h3>

                <div class="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                    <span><i class="fas fa-calendar mr-1"></i>${formatearFechaCorta(e.fecha)}</span>
                    <span><i class="fas fa-clock mr-1"></i>${e.hora}</span>
                </div>

                ${e.ubicacion_nombre ? `<p class="text-xs text-gray-500 mb-2"><i class="fas fa-map-pin mr-1"></i>${e.ubicacion_nombre}</p>` : ''}

                <p class="text-xs text-gray-400 mb-3"><i class="fas fa-calendar mr-1"></i>${tiempoRelativo(e.fecha_creacion)}</p>

                <!-- Actions -->
                <div class="flex gap-2">
                    <button data-action="editar-evento" data-id="${e.id}" class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-queplan-orange/10 text-queplan-orange text-xs font-semibold rounded-lg hover:bg-queplan-orange/20 transition-colors cursor-pointer">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button data-action="eliminar-evento" data-id="${e.id}" class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors cursor-pointer">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');

    // Event delegation
    grid.onclick = (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id = parseInt(btn.dataset.id);
        if (btn.dataset.action === 'editar-evento') editarEvento(id);
        if (btn.dataset.action === 'eliminar-evento') eliminarEvento(id);
    };
}

// ---- Save Event ----
async function guardarEvento() {
    const tipo = document.querySelector('input[name="tipoEvento"]:checked')?.value || 'general';
    const titulo = document.getElementById('inputEventoTitulo').value.trim();
    const descripcion = document.getElementById('inputEventoDescripcion').value.trim();
    const fecha = document.getElementById('inputEventoFecha').value;
    const hora = document.getElementById('inputEventoHora').value;
    const imagen_url = document.getElementById('inputEventoImagen').value.trim();
    const ubicacion_id = tipo === 'general' ? parseInt(document.getElementById('selectUbicacion').value) : null;

    // Validate
    if (!titulo) return alertaError('Campo requerido', 'Ingresa el titulo del evento');
    if (!fecha) return alertaError('Campo requerido', 'Ingresa la fecha del evento');
    if (!hora) return alertaError('Campo requerido', 'Ingresa la hora del evento');
    if (tipo === 'general' && !ubicacion_id) return alertaError('Campo requerido', 'Selecciona una ubicacion para el evento');

    const datos = {
        titulo,
        descripcion: descripcion || null,
        fecha,
        hora,
        tipo,
        ubicacion_id,
        imagen_url: imagen_url || null
    };

    const btn = document.getElementById('btnEventoSubmit');
    botonCargando(btn, true);

    try {
        if (modoEdicionEvento) {
            await eventosAPI.actualizar(editandoEventoId, datos);
            mostrarToast('Evento actualizado');
        } else {
            await eventosAPI.crear(datos);
            await alertaExito('Solicitud enviada', 'Tu evento esta pendiente de aprobacion por un administrador');
        }

        botonCargando(btn, false);
        toggleEventoForm(false);
        await cargarMisEventos();
    } catch (error) {
        alertaError('Error', error.message || 'No se pudo guardar el evento');
        botonCargando(btn, false);
    }
}

// ---- Edit Event ----
function editarEvento(id) {
    const e = misEventos.find(ev => ev.id === id);
    if (!e) return;

    modoEdicionEvento = true;
    editandoEventoId = id;

    // Populate form
    document.getElementById('inputEventoTitulo').value = e.titulo || '';
    document.getElementById('inputEventoDescripcion').value = e.descripcion || '';
    document.getElementById('inputEventoFecha').value = e.fecha ? e.fecha.split('T')[0] : '';
    document.getElementById('inputEventoHora').value = e.hora || '';
    document.getElementById('inputEventoImagen').value = e.imagen_url || '';

    // Show image preview if exists
    if (e.imagen_url) {
        mostrarPreviewImagen(e.imagen_url, 'evento');
    }

    // Set tipo
    const tipoRadio = document.querySelector(`input[name="tipoEvento"][value="${e.tipo}"]`);
    if (tipoRadio) {
        tipoRadio.checked = true;
        tipoRadio.closest('.group-option').click();
    }

    // Set ubicacion
    if (e.tipo === 'general' && e.ubicacion_id) {
        poblarSelectUbicaciones();
        document.getElementById('selectUbicacion').value = e.ubicacion_id;
    }

    // Update form title and button
    document.getElementById('eventoFormTitle').innerHTML = '<i class="fas fa-edit text-queplan-orange mr-2"></i>Editar Evento';
    document.getElementById('btnEventoSubmitText').textContent = 'Guardar Cambios';

    toggleEventoForm(true);
}

// ---- Delete Event ----
async function eliminarEvento(id) {
    const confirmado = await alertaConfirmar(
        'Eliminar evento',
        'Esta accion no se puede deshacer. Se eliminara permanentemente.'
    );
    if (!confirmado) return;

    try {
        await eventosAPI.eliminar(id);

        // Animate out
        const card = document.getElementById(`evento-${id}`);
        if (card) {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.9)';
            setTimeout(() => card.remove(), 300);
        }

        misEventos = misEventos.filter(e => e.id !== id);

        if (misEventos.length === 0) {
            setTimeout(() => {
                ocultar('#misEventosGrid');
                mostrar('#eventosEmpty');
            }, 350);
        }

        mostrarToast('Evento eliminado');
    } catch (error) {
        alertaError('Error', error.message || 'No se pudo eliminar el evento');
    }
}

// ---- Reset Event Form ----
function resetEventoForm() {
    document.getElementById('eventoForm').reset();
    document.getElementById('inputEventoImagen').value = '';
    quitarImagen('evento');

    // Reset tipo selector visual
    const options = document.querySelectorAll('#tipoEventoSelector .group-option');
    options.forEach((o, i) => {
        if (i === 0) {
            o.classList.add('active', 'border-blue-200', 'bg-blue-50');
            o.classList.remove('border-gray-200', 'bg-gray-50');
        } else {
            o.classList.remove('active', 'border-blue-200', 'bg-blue-50');
            o.classList.add('border-gray-200', 'bg-gray-50');
        }
    });

    mostrar('#ubicacionEventoWrapper');

    modoEdicionEvento = false;
    editandoEventoId = null;
    document.getElementById('eventoFormTitle').innerHTML = '<i class="fas fa-calendar-alt text-queplan-orange mr-2"></i>Nuevo Evento';
    document.getElementById('btnEventoSubmitText').textContent = 'Enviar Solicitud';
}

// ============================================================
// SECCION: ACTIVIDADES
// ============================================================

function initActividadFormEvents() {
    const btnNueva = document.getElementById('btnNuevaActividad');
    const btnEmpty = document.getElementById('btnEmptyActividad');
    const btnCancel = document.getElementById('btnCancelActividadForm');
    const form = document.getElementById('actividadForm');

    btnNueva.addEventListener('click', () => toggleActividadForm(true));
    if (btnEmpty) btnEmpty.addEventListener('click', () => toggleActividadForm(true));
    btnCancel.addEventListener('click', () => toggleActividadForm(false));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarActividad();
    });
}

function toggleActividadForm(show) {
    const section = document.getElementById('actividadFormSection');
    if (show) {
        if (!modoEdicionActividad) resetActividadForm();
        poblarSelectActividadUbicaciones();
        mostrar(section);
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        ocultar(section);
        resetActividadForm();
    }
}

function poblarSelectActividadUbicaciones() {
    const select = document.getElementById('selectActividadUbicacion');
    const aprobadas = misUbicaciones.filter(u => u.estado === 'aprobada');
    select.innerHTML = '<option value="">Selecciona una de tus ubicaciones</option>' +
        aprobadas.map(u => `<option value="${u.id}">${u.nombre}</option>`).join('');
}

// ---- Load My Activities ----
async function cargarMisActividades() {
    try {
        mostrar('#actividadesLoading');
        // Fetch activities for all my locations
        const allActividades = [];
        for (const u of misUbicaciones) {
            try {
                const res = await actividadesAPI.obtenerPorUbicacion(u.id);
                const acts = (res.data || []).map(a => ({ ...a, ubicacion_nombre: u.nombre }));
                allActividades.push(...acts);
            } catch (e) {
                // skip if individual fetch fails
            }
        }
        misActividades = allActividades;
        renderizarMisActividades();
    } catch (error) {
        console.error('Error cargando actividades:', error);
    } finally {
        ocultar('#actividadesLoading');
    }
}

function renderizarMisActividades() {
    const grid = document.getElementById('misActividadesGrid');
    const empty = document.getElementById('actividadesEmpty');

    if (misActividades.length === 0) {
        ocultar(grid);
        mostrar(empty);
        return;
    }

    mostrar(grid);
    ocultar(empty);

    grid.innerHTML = misActividades.map((a, i) => {
        return `
        <div id="actividad-${a.id}" class="card animate-fade-in-up stagger-${(i % 6) + 1} overflow-hidden" style="animation-fill-mode: both">
            <div class="p-4">
                <div class="flex items-start justify-between gap-2 mb-2">
                    <h3 class="font-display text-base font-bold text-gray-900">${a.nombre}</h3>
                    ${a.precio ? `<span class="text-sm font-bold text-gradient whitespace-nowrap">${formatearPrecio(a.precio)}</span>` : ''}
                </div>

                ${a.descripcion ? `<p class="text-sm text-gray-600 mb-2 line-clamp-2">${a.descripcion}</p>` : ''}

                <div class="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                    ${a.duracion ? `<span><i class="fas fa-clock mr-1"></i>${a.duracion}</span>` : ''}
                    ${a.horario ? `<span><i class="fas fa-calendar-check mr-1"></i>${a.horario}</span>` : ''}
                </div>

                <p class="text-xs text-gray-400 mb-3">
                    <i class="fas fa-map-pin mr-1 text-queplan-orange"></i>${a.ubicacion_nombre || 'Ubicacion'}
                </p>

                <!-- Actions -->
                <div class="flex gap-2">
                    <button data-action="editar-actividad" data-id="${a.id}" data-ubicacion-id="${a.ubicacion_id}" class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-queplan-orange/10 text-queplan-orange text-xs font-semibold rounded-lg hover:bg-queplan-orange/20 transition-colors cursor-pointer">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button data-action="eliminar-actividad" data-id="${a.id}" data-ubicacion-id="${a.ubicacion_id}" class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors cursor-pointer">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');

    // Event delegation
    grid.onclick = (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id = parseInt(btn.dataset.id);
        const ubicacionId = parseInt(btn.dataset.ubicacionId);
        if (btn.dataset.action === 'editar-actividad') editarActividad(id, ubicacionId);
        if (btn.dataset.action === 'eliminar-actividad') eliminarActividad(id, ubicacionId);
    };
}

// ---- Save Activity ----
async function guardarActividad() {
    const ubicacion_id = parseInt(document.getElementById('selectActividadUbicacion').value);
    const nombre = document.getElementById('inputActividadNombre').value.trim();
    const descripcion = document.getElementById('inputActividadDescripcion').value.trim();
    const precio = document.getElementById('inputActividadPrecio').value;
    const duracion = document.getElementById('inputActividadDuracion').value.trim();
    const horario = document.getElementById('inputActividadHorario').value.trim();

    // Validate
    if (!ubicacion_id) return alertaError('Campo requerido', 'Selecciona una ubicacion');
    if (!nombre) return alertaError('Campo requerido', 'Ingresa el nombre de la actividad');

    const datos = {
        nombre,
        descripcion: descripcion || null,
        precio: precio ? parseFloat(precio) : null,
        duracion: duracion || null,
        horario: horario || null
    };

    const btn = document.getElementById('btnActividadSubmit');
    botonCargando(btn, true);

    try {
        if (modoEdicionActividad) {
            await actividadesAPI.actualizar(editandoActividadUbicacionId, editandoActividadId, datos);
            mostrarToast('Actividad actualizada');
        } else {
            await actividadesAPI.crear(ubicacion_id, datos);
            mostrarToast('Actividad creada');
        }

        botonCargando(btn, false);
        toggleActividadForm(false);
        await cargarMisActividades();
    } catch (error) {
        alertaError('Error', error.message || 'No se pudo guardar la actividad');
        botonCargando(btn, false);
    }
}

// ---- Edit Activity ----
function editarActividad(id, ubicacionId) {
    const a = misActividades.find(act => act.id === id);
    if (!a) return;

    modoEdicionActividad = true;
    editandoActividadId = id;
    editandoActividadUbicacionId = ubicacionId;

    // Populate form
    poblarSelectActividadUbicaciones();
    document.getElementById('selectActividadUbicacion').value = a.ubicacion_id;
    document.getElementById('inputActividadNombre').value = a.nombre || '';
    document.getElementById('inputActividadDescripcion').value = a.descripcion || '';
    document.getElementById('inputActividadPrecio').value = a.precio || '';
    document.getElementById('inputActividadDuracion').value = a.duracion || '';
    document.getElementById('inputActividadHorario').value = a.horario || '';

    // Update form title and button
    document.getElementById('actividadFormTitle').innerHTML = '<i class="fas fa-edit text-queplan-orange mr-2"></i>Editar Actividad';
    document.getElementById('btnActividadSubmitText').textContent = 'Guardar Cambios';

    toggleActividadForm(true);
}

// ---- Delete Activity ----
async function eliminarActividad(id, ubicacionId) {
    const confirmado = await alertaConfirmar(
        'Eliminar actividad',
        'Esta accion no se puede deshacer. Se eliminara permanentemente.'
    );
    if (!confirmado) return;

    try {
        await actividadesAPI.eliminar(ubicacionId, id);

        // Animate out
        const card = document.getElementById(`actividad-${id}`);
        if (card) {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.9)';
            setTimeout(() => card.remove(), 300);
        }

        misActividades = misActividades.filter(a => a.id !== id);

        if (misActividades.length === 0) {
            setTimeout(() => {
                ocultar('#misActividadesGrid');
                mostrar('#actividadesEmpty');
            }, 350);
        }

        mostrarToast('Actividad eliminada');
    } catch (error) {
        alertaError('Error', error.message || 'No se pudo eliminar la actividad');
    }
}

// ---- Reset Activity Form ----
function resetActividadForm() {
    document.getElementById('actividadForm').reset();

    modoEdicionActividad = false;
    editandoActividadId = null;
    editandoActividadUbicacionId = null;
    document.getElementById('actividadFormTitle').innerHTML = '<i class="fas fa-hiking text-queplan-orange mr-2"></i>Nueva Actividad';
    document.getElementById('btnActividadSubmitText').textContent = 'Guardar Actividad';
}

// ============================================================
// SUBIDA DE IMAGENES
// ============================================================

/**
 * Maneja la seleccion de un archivo de imagen
 * @param {HTMLInputElement} input - El input file
 * @param {string} tipo - 'ubicacion' o 'evento'
 */
async function manejarArchivoImagen(input, tipo) {
    const file = input.files[0];
    if (!file) return;

    // Validar tamanio
    if (file.size > 5 * 1024 * 1024) {
        alertaError('Imagen muy grande', 'La imagen no puede pesar mas de 5MB');
        input.value = '';
        return;
    }

    // Validar tipo
    const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!tiposPermitidos.includes(file.type)) {
        alertaError('Formato no valido', 'Solo se permiten imagenes JPG, PNG, WebP o GIF');
        input.value = '';
        return;
    }

    // Mostrar preview local inmediato
    const reader = new FileReader();
    reader.onload = (e) => mostrarPreviewImagen(e.target.result, tipo);
    reader.readAsDataURL(file);

    // Subir al servidor
    const uploadArea = tipo === 'ubicacion'
        ? document.getElementById('imgUploadArea')
        : document.getElementById('eventoImgUploadArea');

    const originalHTML = uploadArea.innerHTML;
    uploadArea.innerHTML = `
        <div class="flex items-center justify-center gap-2 py-2">
            <div class="w-5 h-5 border-2 border-queplan-orange/30 border-t-queplan-orange rounded-full animate-spin"></div>
            <span class="text-sm text-gray-500">Subiendo imagen...</span>
        </div>`;
    uploadArea.style.pointerEvents = 'none';

    try {
        const res = await uploadAPI.subirImagen(file);
        const hiddenInput = tipo === 'ubicacion'
            ? document.getElementById('inputImagen')
            : document.getElementById('inputEventoImagen');
        hiddenInput.value = res.data.url;
        mostrarToast('Imagen subida');
    } catch (error) {
        alertaError('Error', error.message || 'No se pudo subir la imagen');
        quitarImagen(tipo);
    } finally {
        uploadArea.innerHTML = originalHTML;
        uploadArea.style.pointerEvents = '';
        // Re-bind the file input's onchange since innerHTML replaced it
        const newFileInput = uploadArea.querySelector('input[type="file"]');
        if (newFileInput) {
            newFileInput.onchange = function() { manejarArchivoImagen(this, tipo); };
        }
    }
}

/**
 * Muestra la preview de una imagen
 * @param {string} src - URL o data URL de la imagen
 * @param {string} tipo - 'ubicacion' o 'evento'
 */
function mostrarPreviewImagen(src, tipo) {
    if (tipo === 'ubicacion') {
        document.getElementById('imgPreviewSrc').src = src;
        mostrar('#imgPreview');
        ocultar('#imgUploadArea');
    } else {
        document.getElementById('eventoImgPreviewSrc').src = src;
        mostrar('#eventoImgPreview');
        ocultar('#eventoImgUploadArea');
    }
}

/**
 * Quita la imagen y vuelve a mostrar el area de upload
 * @param {string} tipo - 'ubicacion' o 'evento'
 */
function quitarImagen(tipo) {
    if (tipo === 'ubicacion') {
        document.getElementById('inputImagen').value = '';
        document.getElementById('imgPreviewSrc').src = '';
        ocultar('#imgPreview');
        mostrar('#imgUploadArea');
        const fileInput = document.getElementById('inputImagenFile');
        if (fileInput) fileInput.value = '';
        const urlInput = document.getElementById('inputImagenUrl');
        if (urlInput) urlInput.value = '';
    } else {
        document.getElementById('inputEventoImagen').value = '';
        document.getElementById('eventoImgPreviewSrc').src = '';
        ocultar('#eventoImgPreview');
        mostrar('#eventoImgUploadArea');
        const fileInput = document.getElementById('inputEventoImagenFile');
        if (fileInput) fileInput.value = '';
        const urlInput = document.getElementById('inputEventoImagenUrl');
        if (urlInput) urlInput.value = '';
    }
}

/**
 * Usa una URL pegada como imagen
 * @param {string} url - URL de la imagen
 * @param {string} tipo - 'ubicacion' o 'evento'
 */
function usarUrlImagen(url, tipo) {
    if (!url || !url.trim()) return;

    const hiddenInput = tipo === 'ubicacion'
        ? document.getElementById('inputImagen')
        : document.getElementById('inputEventoImagen');
    hiddenInput.value = url.trim();
    mostrarPreviewImagen(url.trim(), tipo);
}

// ---- Drag and Drop ----
document.addEventListener('DOMContentLoaded', () => {
    initDragDrop('imgUploadArea', 'ubicacion');
    initDragDrop('eventoImgUploadArea', 'evento');
});

function initDragDrop(areaId, tipo) {
    const area = document.getElementById(areaId);
    if (!area) return;

    ['dragenter', 'dragover'].forEach(evt => {
        area.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            area.classList.add('border-queplan-orange', 'bg-orange-50/50');
        });
    });

    ['dragleave', 'drop'].forEach(evt => {
        area.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            area.classList.remove('border-queplan-orange', 'bg-orange-50/50');
        });
    });

    area.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const fileInputId = tipo === 'ubicacion' ? 'inputImagenFile' : 'inputEventoImagenFile';
            const fileInput = document.getElementById(fileInputId);
            // Create a new DataTransfer to set files on the input
            const dt = new DataTransfer();
            dt.items.add(files[0]);
            fileInput.files = dt.files;
            manejarArchivoImagen(fileInput, tipo);
        }
    });
}
