// ============================================================
// REGISTRO.JS
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    redirigirSiLogueado();

    const form = document.getElementById('registroForm');
    const btnRegistro = document.getElementById('btnRegistro');
    const togglePwd = document.getElementById('togglePassword');
    const pwdInput = document.getElementById('password');

    if (togglePwd && pwdInput) {
        togglePwd.addEventListener('click', () => {
            const isPassword = pwdInput.type === 'password';
            pwdInput.type = isPassword ? 'text' : 'password';
            togglePwd.querySelector('i').classList.toggle('fa-eye');
            togglePwd.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    // Role selector toggle
    const rolOptions = document.querySelectorAll('.group-option');
    rolOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            rolOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            opt.querySelector('input[type="radio"]').checked = true;
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nombre = document.getElementById('nombre').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = pwdInput.value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const terminos = document.getElementById('terminos').checked;
        const rol = document.querySelector('input[name="rol"]:checked')?.value || 'usuario';

        if (!nombre || !email || !password || !confirmPassword) {
            alertaError('Campos requeridos', 'Completa todos los campos');
            return;
        }

        if (password !== confirmPassword) {
            alertaError('Error', 'Las contrasenas no coinciden');
            return;
        }

        if (password.length < 6) {
            alertaError('Error', 'La contrasena debe tener al menos 6 caracteres');
            return;
        }

        if (!terminos) {
            alertaError('Error', 'Debes aceptar los terminos y condiciones');
            return;
        }

        botonCargando(btnRegistro, true);

        try {
            const data = await authAPI.registro(nombre, email, password, rol);
            guardarSesion(data.data.token, data.data.usuario);
            mostrarToast('Cuenta creada exitosamente!', 'success');

            setTimeout(() => {
                window.location.href = '/';
            }, 800);
        } catch (error) {
            alertaError('Error al registrarse', error.message);
        } finally {
            botonCargando(btnRegistro, false);
        }
    });
});
