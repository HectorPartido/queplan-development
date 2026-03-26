// ============================================================
// SERVIDOR PRINCIPAL (server.js)
// ============================================================
// Este es el punto de entrada de la aplicación
// Aquí iniciamos el servidor y la conexión a la base de datos
// ============================================================

// Cargamos las variables de entorno PRIMERO
// Esto debe ir antes de cualquier otra importación
require('dotenv').config();

// Importamos la aplicación Express configurada
const app = require('./src/app');

// Importamos la función para probar la conexión a la BD
const { testConnection } = require('./src/config/database');

// Puerto donde correrá el servidor
const PORT = process.env.PORT || 3000;

// ============================================================
// FUNCIÓN PRINCIPAL PARA INICIAR EL SERVIDOR
// ============================================================

async function startServer() {
    console.log('');
    console.log('🗺️  ═══════════════════════════════════════════');
    console.log('    QUEPLAN - Mapa Interactivo de Cancún');
    console.log('    ═══════════════════════════════════════════');
    console.log('');
    
    // 1. Probamos la conexión a la base de datos
    console.log('📦 Conectando a la base de datos...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
        console.error('');
        console.error('⚠️  No se pudo conectar a la base de datos.');
        console.error('    El servidor se iniciará pero las funciones que');
        console.error('    requieren base de datos no funcionarán.');
        console.error('');
    }
    
    // 2. Iniciamos el servidor Express
    app.listen(PORT, () => {
        console.log('');
        console.log('🚀 Servidor iniciado correctamente');
        console.log(`   🌐 URL: http://localhost:${PORT}`);
        console.log(`   📚 Documentación API: http://localhost:${PORT}/api-docs`);
        console.log('');
        console.log('   Endpoints disponibles:');
        console.log(`   • GET  http://localhost:${PORT}/api/auth`);
        console.log(`   • GET  http://localhost:${PORT}/api/moods`);
        console.log(`   • GET  http://localhost:${PORT}/api/ubicaciones`);
        console.log(`   • GET  http://localhost:${PORT}/api/eventos`);
        console.log('');
        console.log('   Presiona Ctrl+C para detener el servidor');
        console.log('');
    });
}

// ============================================================
// MANEJO DE ERRORES NO CAPTURADOS
// ============================================================
// Capturamos errores que no fueron manejados en el código

// Errores de promesas no capturadas
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada no manejada:', reason);
});

// Errores generales no capturados
process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error);
    // En producción, aquí podrías reiniciar el proceso
    process.exit(1);
});

// ============================================================
// INICIAMOS EL SERVIDOR
// ============================================================

startServer();
