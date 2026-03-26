// ============================================================
// LOGIN.JS
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    redirigirSiLogueado();

    const form = document.getElementById('loginForm');
    const btnLogin = document.getElementById('btnLogin');
    const togglePwd = document.getElementById('togglePassword');
    const pwdInput = document.getElementById('password');

    // Toggle password visibility
    if (togglePwd && pwdInput) {
        togglePwd.addEventListener('click', () => {
            const isPassword = pwdInput.type === 'password';
            pwdInput.type = isPassword ? 'text' : 'password';
            togglePwd.querySelector('i').classList.toggle('fa-eye');
            togglePwd.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    // Form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = pwdInput.value;

        if (!email || !password) {
            alertaError('Campos requeridos', 'Ingresa tu correo y contrasena');
            return;
        }

        botonCargando(btnLogin, true);

        try {
            const data = await authAPI.login(email, password);
            guardarSesion(data.data.token, data.data.usuario);
            mostrarToast('Bienvenido de vuelta!', 'success');

            setTimeout(() => {
                const redirect = localStorage.getItem('queplan_redirect');
                if (redirect) {
                    localStorage.removeItem('queplan_redirect');
                    window.location.href = redirect;
                } else {
                    window.location.href = '/';
                }
            }, 800);
        } catch (error) {
            alertaError('Error al iniciar sesion', error.message);
        } finally {
            botonCargando(btnLogin, false);
        }
    });
});
