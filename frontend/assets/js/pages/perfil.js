// ============================================================
// PERFIL.JS
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    protegerPagina();
    await cargarPerfil();
    initForms();
});

async function cargarPerfil() {
    try {
        const data = await authAPI.obtenerPerfil();
        const u = data.data;
        document.getElementById('editNombre').value = u.nombre;
        document.getElementById('userEmail').textContent = u.email;

        const roles = { usuario: 'Usuario', vendedor: 'Vendedor', admin: 'Administrador' };
        document.getElementById('userRolBadge').textContent = roles[u.rol] || u.rol;

        // Update stored user
        guardarSesion(obtenerToken(), u);
        actualizarUISegunSesion();
    } catch (e) {
        alertaError('Error', 'No se pudo cargar el perfil');
    }
}

function initForms() {
    // Profile form
    document.getElementById('perfilForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnGuardarPerfil');
        const nombre = document.getElementById('editNombre').value.trim();

        if (!nombre) { alertaError('Error', 'El nombre es requerido'); return; }

        botonCargando(btn, true);
        try {
            const data = await authAPI.actualizarPerfil({ nombre });
            guardarSesion(obtenerToken(), data.data);
            actualizarUISegunSesion();
            mostrarToast('Perfil actualizado!');
        } catch (e) {
            alertaError('Error', e.message);
        } finally {
            botonCargando(btn, false);
        }
    });

    // Password form
    document.getElementById('passwordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnCambiarPassword');
        const actual = document.getElementById('passwordActual').value;
        const nuevo = document.getElementById('passwordNuevo').value;
        const confirmar = document.getElementById('passwordConfirmar').value;

        if (nuevo !== confirmar) { alertaError('Error', 'Las contrasenas no coinciden'); return; }
        if (nuevo.length < 6) { alertaError('Error', 'Minimo 6 caracteres'); return; }

        botonCargando(btn, true);
        try {
            await authAPI.cambiarPassword(actual, nuevo);
            mostrarToast('Contrasena cambiada!');
            document.getElementById('passwordForm').reset();
        } catch (e) {
            alertaError('Error', e.message);
        } finally {
            botonCargando(btn, false);
        }
    });
}
