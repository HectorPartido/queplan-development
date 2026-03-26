// ============================================================
// FAVORITOS.JS
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    protegerPagina();
    await cargarFavoritos();
});

async function cargarFavoritos() {
    try {
        const data = await ubicacionesAPI.obtenerFavoritos();
        const favoritos = data.data || [];
        renderizarFavoritos(favoritos);
    } catch (e) {
        alertaError('Error', 'No se pudieron cargar tus favoritos');
    } finally {
        ocultar('#favoritosLoading');
    }
}

function renderizarFavoritos(favoritos) {
    const grid = document.getElementById('favoritosGrid');
    const empty = document.getElementById('favoritosEmpty');

    if (favoritos.length === 0) {
        mostrar('#favoritosEmpty');
        return;
    }

    mostrar('#favoritosGrid');

    grid.innerHTML = favoritos.map((f, i) => `
        <div class="card animate-fade-in-up stagger-${(i % 6) + 1}" style="animation-fill-mode: both" id="fav-${f.id}">
            ${f.imagen_url
                ? `<img src="${f.imagen_url}" alt="${f.nombre}" class="w-full h-40 object-cover">`
                : `<div class="h-40 bg-gradient-to-br from-queplan-orange to-queplan-gold flex items-center justify-center"><i class="fas fa-map-marker-alt text-white/30 text-4xl"></i></div>`}
            <div class="p-5">
                <h3 class="font-display text-lg font-semibold text-gray-900 mb-1">${f.nombre}</h3>
                <p class="text-sm font-semibold text-queplan-orange mb-3">${formatearPrecio(f.precio_promedio)}</p>
                <div class="flex items-center gap-2">
                    <a href="/pages/ubicacion.html?id=${f.id}" class="flex-1 btn-primary text-center text-sm py-2">
                        Ver detalle
                    </a>
                    <button onclick="quitarFavorito(${f.id})" class="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-red-200 text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <i class="fas fa-heart-broken"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

async function quitarFavorito(id) {
    const confirm = await alertaConfirmar('Quitar favorito', 'Se eliminara de tu lista de favoritos');
    if (!confirm) return;

    try {
        await ubicacionesAPI.quitarFavorito(id);
        const el = document.getElementById(`fav-${id}`);
        if (el) {
            el.style.transition = 'opacity 0.3s, transform 0.3s';
            el.style.opacity = '0';
            el.style.transform = 'scale(0.9)';
            setTimeout(() => {
                el.remove();
                // Check if empty
                const grid = document.getElementById('favoritosGrid');
                if (grid.children.length === 0) {
                    ocultar('#favoritosGrid');
                    mostrar('#favoritosEmpty');
                }
            }, 300);
        }
        mostrarToast('Quitado de favoritos');
    } catch (e) {
        alertaError('Error', e.message);
    }
}
