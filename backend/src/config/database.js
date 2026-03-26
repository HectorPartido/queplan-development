// ============================================================
// CONFIGURACIÓN DE BASE DE DATOS
// ============================================================
// Este archivo maneja la conexión a MySQL
// Usamos mysql2 con soporte para Promises (async/await)
// ============================================================

// Importamos mysql2 con soporte para promesas
// Las promesas nos permiten usar async/await en lugar de callbacks
const mysql = require('mysql2/promise');

// Importamos las variables de entorno
// process.env contiene todas las variables definidas en .env
require('dotenv').config();


const pool = mysql.createPool({
    // Host: dónde está el servidor MySQL
    // localhost = tu propia computadora
    host: process.env.DB_HOST || 'localhost',
    
    // Puerto de MySQL (3306 es el estándar)
    port: process.env.DB_PORT || 3306,
    
    // Nombre de la base de datos a usar
    database: process.env.DB_NAME || 'queplan',
    
    // Usuario de MySQL
    user: process.env.DB_USER || 'root',
    
    // Contraseña de MySQL
    password: process.env.DB_PASSWORD || '',
    
    // ============================================================
    // CONFIGURACIÓN DEL POOL
    // ============================================================
    
    // Máximo de conexiones simultáneas
    // 10 es suficiente para desarrollo, en producción podría ser más
    connectionLimit: 10,
    
    // Tiempo máximo de espera para obtener una conexión (ms)
    // Si todas las conexiones están ocupadas, espera máximo 10 segundos
    waitForConnections: true,
    queueLimit: 0
});

// ============================================================
// FUNCIÓN PARA PROBAR LA CONEXIÓN
// ============================================================
// Útil para verificar que la BD está disponible al iniciar el servidor

async function testConnection() {
    try {
        // Intentamos obtener una conexión del pool
        const connection = await pool.getConnection();
        
        console.log('✅ Conexión a MySQL establecida correctamente');
        console.log(`   📁 Base de datos: ${process.env.DB_NAME}`);
        console.log(`   🖥️  Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
        
        // Liberamos la conexión de vuelta al pool
        connection.release();
        
        return true;
    } catch (error) {
        console.error('❌ Error conectando a MySQL:', error.message);
        console.error('   Verifica que:');
        console.error('   1. MySQL está corriendo');
        console.error('   2. Las credenciales en .env son correctas');
        console.error('   3. La base de datos "queplan" existe');
        
        return false;
    }
}

// ============================================================
// EXPORTAMOS EL POOL Y LA FUNCIÓN DE PRUEBA
// ============================================================
// module.exports hace que podamos usar esto en otros archivos con require()

module.exports = {
    pool,
    testConnection
};
