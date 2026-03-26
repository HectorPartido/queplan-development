// ============================================================
// NAVBAR COMPONENT
// ============================================================
// Genera el navbar completo con navegación, auth y mobile menu
// Se inyecta automáticamente al inicio del <body>
// ============================================================

(function () {
    // Detectar la página actual para marcar el link activo
    const path = window.location.pathname;
    const isActive = (href) => {
        if (href === '/' && (path === '/' || path === '/index.html')) return true;
        if (href !== '/' && path.includes(href)) return true;
        return false;
    };

    const activeClass = 'text-white font-medium bg-white/20';
    const normalClass = 'text-white/90 hover:bg-white/15';

    const linkClass = (href) =>
        `flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${isActive(href) ? activeClass : normalClass}`;

    const mobileLinkClass = (href) =>
        `flex items-center gap-2.5 px-4 py-3 font-medium rounded-xl ${isActive(href) ? 'text-white bg-white/20' : 'text-white/90 hover:bg-white/15'}`;

    const navbarHTML = `
    <!-- ========== NAVBAR ========== -->
    <nav class="fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-queplan-coral via-queplan-orange to-queplan-gold flex items-center justify-between px-4 lg:px-6 z-[1001] shadow-lg">
        <a href="/" class="flex items-center gap-2.5 group">
            <img src="/assets/images/logo.png" alt="Logo" class="h-10 w-10 rounded-full p-0.5 object-contain transition-transform group-hover:scale-110">
            <span class="hidden sm:block font-display text-xl font-bold text-white">¿Qué Plan?</span>
        </a>

        <!-- Desktop Nav -->
        <div class="hidden md:flex items-center gap-1.5">
            <a href="/" class="${linkClass('/')}">
                <i class="fas fa-map-marked-alt"></i> Mapa
            </a>
            <a href="/pages/eventos.html" class="${linkClass('/pages/eventos.html')}">
                <i class="fas fa-calendar-alt"></i> Eventos
            </a>
            <a href="/pages/ruleta.html" class="${linkClass('/pages/ruleta.html')}">
                <i class="fas fa-random"></i> Ruleta
            </a>

            <!-- Vendedor -->
            <a href="/pages/mis-ubicaciones.html" data-auth="vendedor" class="${linkClass('/pages/mis-ubicaciones.html')}" style="display:none">
                <i class="fas fa-store"></i> Mis Lugares
            </a>
            <!-- Admin -->
            <a href="/pages/admin.html" data-auth="admin" class="${linkClass('/pages/admin.html')}" style="display:none">
                <i class="fas fa-shield-alt"></i> Admin
            </a>

            <!-- Notificaciones -->
            <a href="/pages/notificaciones.html" data-auth="logueado" class="relative ${linkClass('/pages/notificaciones.html')}" style="display:none">
                <i class="fas fa-bell"></i>
                <span data-notificacion="count" class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-yellow-400 text-gray-900 text-[10px] font-bold rounded-full flex items-center justify-center" style="display:none">0</span>
            </a>
            <!-- Favoritos -->
            <a href="/pages/favoritos.html" data-auth="logueado" class="${linkClass('/pages/favoritos.html')}" style="display:none">
                <i class="fas fa-heart"></i>
            </a>

            <!-- No logueado -->
            <a href="/pages/login.html" data-auth="no-logueado" class="flex items-center gap-1.5 px-3 py-2 bg-white/20 text-white font-medium text-sm rounded-lg hover:bg-white/30 transition-colors">
                <i class="fas fa-sign-in-alt"></i> Entrar
            </a>

            <!-- Logueado - Dropdown -->
            <div class="relative" data-auth="logueado" style="display:none">
                <button class="flex items-center gap-2 px-3 py-2 text-white rounded-lg hover:bg-white/15 transition-colors" id="userMenuBtn">
                    <span class="w-8 h-8 rounded-full bg-white text-queplan-orange flex items-center justify-center font-bold text-sm" data-usuario="iniciales">U</span>
                    <span class="text-sm font-medium hidden lg:inline" data-usuario="nombre">Usuario</span>
                    <i class="fas fa-chevron-down text-xs transition-transform"></i>
                </button>
                <div class="absolute top-full right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 opacity-0 invisible -translate-y-2 transition-all duration-200 z-[1002]" id="userDropdown">
                    <a href="/pages/perfil.html" class="flex items-center gap-2.5 px-3 py-2.5 text-gray-700 text-sm rounded-lg hover:bg-queplan-cream hover:text-queplan-orange transition-colors">
                        <i class="fas fa-user w-4 text-center"></i> Mi Perfil
                    </a>
                    <a href="/pages/favoritos.html" class="flex items-center gap-2.5 px-3 py-2.5 text-gray-700 text-sm rounded-lg hover:bg-queplan-cream hover:text-queplan-orange transition-colors">
                        <i class="fas fa-heart w-4 text-center"></i> Mis Favoritos
                    </a>
                    <div class="h-px bg-gray-100 my-1"></div>
                    <button data-action="logout" class="w-full flex items-center gap-2.5 px-3 py-2.5 text-red-500 text-sm rounded-lg hover:bg-red-50 transition-colors">
                        <i class="fas fa-sign-out-alt w-4 text-center"></i> Cerrar Sesión
                    </button>
                </div>
            </div>
        </div>

        <!-- Mobile Toggle -->
        <button class="md:hidden flex items-center justify-center w-10 h-10 text-white text-xl rounded-lg hover:bg-white/15 transition-colors" id="mobileMenuBtn">
            <i class="fas fa-bars"></i>
        </button>
    </nav>

    <!-- Mobile Menu -->
    <div class="hidden fixed top-16 left-0 right-0 bg-gradient-to-b from-queplan-orange to-queplan-gold p-4 shadow-xl z-[1000] md:hidden flex-col gap-2 animate-fade-in-down" id="mobileMenu">
        <a href="/" class="${mobileLinkClass('/')}">
            <i class="fas fa-map-marked-alt"></i> Mapa
        </a>
        <a href="/pages/eventos.html" class="${mobileLinkClass('/pages/eventos.html')}">
            <i class="fas fa-calendar-alt"></i> Eventos
        </a>
        <a href="/pages/ruleta.html" class="${mobileLinkClass('/pages/ruleta.html')}">
            <i class="fas fa-random"></i> Ruleta
        </a>
        <a href="/pages/mis-ubicaciones.html" data-auth="vendedor" class="${mobileLinkClass('/pages/mis-ubicaciones.html')}" style="display:none">
            <i class="fas fa-store"></i> Mis Lugares
        </a>
        <a href="/pages/admin.html" data-auth="admin" class="${mobileLinkClass('/pages/admin.html')}" style="display:none">
            <i class="fas fa-shield-alt"></i> Admin
        </a>
        <a href="/pages/notificaciones.html" data-auth="logueado" class="${mobileLinkClass('/pages/notificaciones.html')}" style="display:none">
            <i class="fas fa-bell"></i> Notificaciones
        </a>
        <a href="/pages/favoritos.html" data-auth="logueado" class="${mobileLinkClass('/pages/favoritos.html')}" style="display:none">
            <i class="fas fa-heart"></i> Favoritos
        </a>
        <a href="/pages/perfil.html" data-auth="logueado" class="${mobileLinkClass('/pages/perfil.html')}" style="display:none">
            <i class="fas fa-user"></i> Mi Perfil
        </a>
        <a href="/pages/login.html" data-auth="no-logueado" class="flex items-center gap-2.5 px-4 py-3 text-white font-medium rounded-xl bg-white/20">
            <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
        </a>
        <button data-action="logout" data-auth="logueado" class="flex items-center gap-2.5 px-4 py-3 text-red-200 font-medium rounded-xl hover:bg-white/10" style="display:none">
            <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
        </button>
    </div>
    `;

    // Insertar al inicio del body
    document.body.insertAdjacentHTML('afterbegin', navbarHTML);
})();
