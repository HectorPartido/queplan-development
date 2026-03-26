// ============================================================
// REPORTAR MODAL - Componente reutilizable para reportar
// ============================================================
// Uso: abrirModalReportar('ubicacion', 123, 'Nombre del lugar')
// Se inyecta automaticamente en el DOM
// ============================================================

(function () {
    const modalHTML = `
    <div id="modalReportar" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4 hidden transition-opacity duration-300 opacity-0">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-95">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 class="font-display text-lg font-bold text-gray-900">
                    <i class="fas fa-flag text-red-500 mr-2"></i>Reportar
                </h3>
                <button onclick="cerrarModalReportar()" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <!-- Body -->
            <div class="px-6 py-5">
                <p class="text-sm text-gray-500 mb-1">Reportando:</p>
                <p id="reportarNombreElemento" class="text-sm font-semibold text-gray-900 mb-5"></p>

                <!-- Motivo -->
                <p class="text-sm font-medium text-gray-700 mb-3">Selecciona el motivo del reporte:</p>
                <div class="space-y-2 mb-5" id="reportarMotivos">
                    <label class="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-queplan-orange/50 hover:bg-orange-50/30 transition-colors cursor-pointer">
                        <input type="radio" name="reporteMotivo" value="informacion_falsa" class="accent-queplan-orange">
                        <div>
                            <p class="text-sm font-medium text-gray-800"><i class="fas fa-info-circle text-blue-500 mr-1"></i> Informacion falsa</p>
                            <p class="text-xs text-gray-500">Los datos o la descripcion no son reales</p>
                        </div>
                    </label>
                    <label class="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-queplan-orange/50 hover:bg-orange-50/30 transition-colors cursor-pointer">
                        <input type="radio" name="reporteMotivo" value="estafa" class="accent-queplan-orange">
                        <div>
                            <p class="text-sm font-medium text-gray-800"><i class="fas fa-exclamation-triangle text-yellow-500 mr-1"></i> Posible estafa</p>
                            <p class="text-xs text-gray-500">Sospecho que es fraudulento o enganoso</p>
                        </div>
                    </label>
                    <label class="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-queplan-orange/50 hover:bg-orange-50/30 transition-colors cursor-pointer">
                        <input type="radio" name="reporteMotivo" value="peligroso" class="accent-queplan-orange">
                        <div>
                            <p class="text-sm font-medium text-gray-800"><i class="fas fa-skull-crossbones text-red-500 mr-1"></i> Peligroso</p>
                            <p class="text-xs text-gray-500">Puede representar un riesgo para los usuarios</p>
                        </div>
                    </label>
                    <label class="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-queplan-orange/50 hover:bg-orange-50/30 transition-colors cursor-pointer">
                        <input type="radio" name="reporteMotivo" value="contenido_inapropiado" class="accent-queplan-orange">
                        <div>
                            <p class="text-sm font-medium text-gray-800"><i class="fas fa-ban text-purple-500 mr-1"></i> Contenido inapropiado</p>
                            <p class="text-xs text-gray-500">Contiene material ofensivo o inadecuado</p>
                        </div>
                    </label>
                    <label class="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-queplan-orange/50 hover:bg-orange-50/30 transition-colors cursor-pointer">
                        <input type="radio" name="reporteMotivo" value="spam" class="accent-queplan-orange">
                        <div>
                            <p class="text-sm font-medium text-gray-800"><i class="fas fa-robot text-gray-500 mr-1"></i> Spam</p>
                            <p class="text-xs text-gray-500">Publicidad no deseada o contenido repetido</p>
                        </div>
                    </label>
                    <label class="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-queplan-orange/50 hover:bg-orange-50/30 transition-colors cursor-pointer">
                        <input type="radio" name="reporteMotivo" value="otro" class="accent-queplan-orange">
                        <div>
                            <p class="text-sm font-medium text-gray-800"><i class="fas fa-ellipsis-h text-gray-500 mr-1"></i> Otro motivo</p>
                            <p class="text-xs text-gray-500">Describe el problema abajo</p>
                        </div>
                    </label>
                </div>

                <!-- Descripcion -->
                <div class="mb-5">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Descripcion (opcional)</label>
                    <textarea id="reporteDescripcion" rows="3" maxlength="500" placeholder="Describe con mas detalle el problema..." class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-queplan-orange resize-none transition-colors"></textarea>
                    <p class="text-xs text-gray-400 mt-1 text-right"><span id="reporteCharCount">0</span>/500</p>
                </div>

                <!-- Botones -->
                <div class="flex gap-3">
                    <button id="btnEnviarReporte" onclick="enviarReporte()" class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                        <i class="fas fa-flag"></i> Enviar reporte
                    </button>
                    <button onclick="cerrarModalReportar()" class="px-4 py-2.5 border-2 border-gray-200 text-gray-500 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all cursor-pointer">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Char counter
    const textarea = document.getElementById('reporteDescripcion');
    if (textarea) {
        textarea.addEventListener('input', () => {
            document.getElementById('reporteCharCount').textContent = textarea.value.length;
        });
    }
})();

// Estado del modal
let _reportarTipo = null;
let _reportarReferenciaId = null;

function abrirModalReportar(tipo, referenciaId, nombreElemento) {
    // Verificar login
    const token = localStorage.getItem('queplan_token');
    if (!token) {
        if (typeof alertaError === 'function') {
            alertaError('Inicia sesion', 'Necesitas iniciar sesion para reportar');
        }
        return;
    }

    _reportarTipo = tipo;
    _reportarReferenciaId = referenciaId;

    document.getElementById('reportarNombreElemento').textContent = nombreElemento || 'Elemento';

    // Reset form
    document.querySelectorAll('input[name="reporteMotivo"]').forEach(r => r.checked = false);
    document.getElementById('reporteDescripcion').value = '';
    document.getElementById('reporteCharCount').textContent = '0';

    const modal = document.getElementById('modalReportar');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.scale-95').classList.remove('scale-95');
        modal.querySelector('.bg-white').classList.add('scale-100');
    });
}

function cerrarModalReportar() {
    const modal = document.getElementById('modalReportar');
    modal.classList.add('opacity-0');
    const content = modal.querySelector('.bg-white');
    if (content) {
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
    }
    setTimeout(() => {
        modal.classList.add('hidden');
        _reportarTipo = null;
        _reportarReferenciaId = null;
    }, 300);
}

async function enviarReporte() {
    const motivo = document.querySelector('input[name="reporteMotivo"]:checked')?.value;
    const descripcion = document.getElementById('reporteDescripcion').value.trim();

    if (!motivo) {
        if (typeof alertaError === 'function') {
            alertaError('Motivo requerido', 'Selecciona un motivo para el reporte');
        }
        return;
    }

    const btn = document.getElementById('btnEnviarReporte');
    if (typeof botonCargando === 'function') botonCargando(btn, true);

    try {
        await reportesAPI.crear({
            tipo: _reportarTipo,
            referencia_id: _reportarReferenciaId,
            motivo,
            descripcion: descripcion || null
        });

        cerrarModalReportar();

        if (typeof alertaExito === 'function') {
            alertaExito('Reporte enviado', 'Un administrador revisara tu reporte. Gracias por ayudar a mantener la comunidad segura.');
        }
    } catch (error) {
        if (typeof alertaError === 'function') {
            alertaError('Error', error.message || 'No se pudo enviar el reporte');
        }
    } finally {
        if (typeof botonCargando === 'function') botonCargando(btn, false);
    }
}

// Cerrar con Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('modalReportar').classList.contains('hidden')) {
        cerrarModalReportar();
    }
});
