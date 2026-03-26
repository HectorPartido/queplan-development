// ============================================================
// RECUPERAR.JS - Flujo de recuperacion de contraseña
// ============================================================

let _emailRecuperar = '';
let _codigoRecuperar = '';
let _timerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    initPaso1();
    initPaso2();
    initPaso3();
    initTogglePasswords();
});

// ============================================================
// PASO 1: INGRESAR EMAIL
// ============================================================

function initPaso1() {
    document.getElementById('formEmail').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('emailRecuperar').value.trim();
        if (!email) return;

        _emailRecuperar = email;
        const btn = document.getElementById('btnEnviarCodigo');
        botonCargando(btn, true);

        try {
            await recuperarAPI.solicitarCodigo(email);
            mostrarPaso(2);
            document.getElementById('emailMostrado').textContent = email;
            iniciarTimer();
            // Focus first OTP input
            document.querySelector('.otp-input').focus();
        } catch (error) {
            alertaError('Error', error.message || 'No se pudo enviar el código');
        } finally {
            botonCargando(btn, false);
        }
    });
}

// ============================================================
// PASO 2: INGRESAR CODIGO OTP
// ============================================================

function initPaso2() {
    const inputs = document.querySelectorAll('.otp-input');

    // Auto-advance between inputs
    inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const value = e.target.value;

            // Only allow digits
            if (!/^\d*$/.test(value)) {
                e.target.value = '';
                return;
            }

            // Handle paste of full code
            if (value.length > 1) {
                const digits = value.replace(/\D/g, '').split('');
                inputs.forEach((inp, i) => {
                    inp.value = digits[i] || '';
                });
                const lastFilledIndex = Math.min(digits.length - 1, inputs.length - 1);
                inputs[lastFilledIndex].focus();
                return;
            }

            // Auto-advance to next input
            if (value && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            // Backspace: go to previous input
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                inputs[index - 1].focus();
                inputs[index - 1].value = '';
            }
        });

        // Select all on focus for easy overwrite
        input.addEventListener('focus', () => {
            input.select();
        });
    });

    // Form submit
    document.getElementById('formCodigo').addEventListener('submit', (e) => {
        e.preventDefault();
        const codigo = Array.from(inputs).map(i => i.value).join('');
        if (codigo.length !== 6) {
            alertaError('Código incompleto', 'Ingresa los 6 dígitos del código');
            return;
        }
        _codigoRecuperar = codigo;
        mostrarPaso(3);
    });

    // Resend code
    document.getElementById('btnReenviar').addEventListener('click', async () => {
        try {
            await recuperarAPI.solicitarCodigo(_emailRecuperar);
            mostrarToast('Código reenviado');
            iniciarTimer();
            // Clear OTP inputs
            inputs.forEach(i => { i.value = ''; });
            inputs[0].focus();
        } catch (error) {
            alertaError('Error', error.message || 'No se pudo reenviar el código');
        }
    });
}

// ============================================================
// PASO 3: NUEVA CONTRASEÑA
// ============================================================

function initPaso3() {
    document.getElementById('formNuevaPassword').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nueva = document.getElementById('nuevaPassword').value;
        const confirmar = document.getElementById('confirmarPassword').value;

        if (nueva.length < 6) {
            return alertaError('Contraseña muy corta', 'La contraseña debe tener al menos 6 carácteres');
        }

        if (nueva !== confirmar) {
            return alertaError('No coinciden', 'Las contraseñas no coinciden');
        }

        const btn = document.getElementById('btnCambiarPassword');
        botonCargando(btn, true);

        try {
            await recuperarAPI.resetPassword(_emailRecuperar, _codigoRecuperar, nueva);

            await Swal.fire({
                icon: 'success',
                title: 'Contraseña actualizada',
                text: 'Ahora puedes iniciar sesión con tu nueva contraseña',
                confirmButtonColor: '#F26B3A',
                confirmButtonText: 'Ir a iniciar sesión'
            });

            window.location.href = '/pages/login.html';
        } catch (error) {
            alertaError('Error', error.message || 'No se pudo cambiar la contraseña');
        } finally {
            botonCargando(btn, false);
        }
    });
}

// ============================================================
// HELPERS
// ============================================================

function mostrarPaso(paso) {
    const subtitulos = {
        1: 'Ingresa tu correo para recibir un código',
        2: 'Ingresa el código que recibiste',
        3: 'Establece tu nueva contraseña'
    };

    document.getElementById('subtitulo').textContent = subtitulos[paso];

    // Animate transition
    const pasoActual = document.querySelector('[id^="paso"]:not(.hidden)');
    if (pasoActual) {
        pasoActual.style.transition = 'opacity 0.2s, transform 0.2s';
        pasoActual.style.opacity = '0';
        pasoActual.style.transform = 'translateX(-20px)';

        setTimeout(() => {
            pasoActual.classList.add('hidden');
            pasoActual.style.opacity = '';
            pasoActual.style.transform = '';

            const nuevoPaso = document.getElementById(`paso${paso}`);
            nuevoPaso.classList.remove('hidden');
            nuevoPaso.style.opacity = '0';
            nuevoPaso.style.transform = 'translateX(20px)';

            // Force reflow
            nuevoPaso.offsetHeight;

            nuevoPaso.style.transition = 'opacity 0.3s, transform 0.3s';
            nuevoPaso.style.opacity = '1';
            nuevoPaso.style.transform = 'translateX(0)';
        }, 200);
    }
}

function iniciarTimer() {
    // Clear previous timer
    if (_timerInterval) clearInterval(_timerInterval);

    let segundos = 15 * 60; // 15 minutes
    const timerEl = document.getElementById('timer');

    _timerInterval = setInterval(() => {
        segundos--;
        const min = Math.floor(segundos / 60);
        const seg = segundos % 60;
        timerEl.textContent = `${min}:${seg.toString().padStart(2, '0')}`;

        if (segundos <= 0) {
            clearInterval(_timerInterval);
            timerEl.textContent = 'Expirado';
            timerEl.classList.remove('text-queplan-orange');
            timerEl.classList.add('text-red-500');
        }

        // Warn at 2 minutes
        if (segundos === 120) {
            timerEl.classList.remove('text-queplan-orange');
            timerEl.classList.add('text-red-500');
        }
    }, 1000);
}

function initTogglePasswords() {
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            const icon = btn.querySelector('i');

            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
    });
}
