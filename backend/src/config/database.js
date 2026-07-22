const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        rejectUnauthorized: true
    }
});

const promisePool = pool.promise();

// Função para testar conexão
async function testConnection() {
    try {
        const [rows] = await promisePool.query('SELECT 1');
        console.log('✅ Conexão com TiDB estabelecida com sucesso!');
        return true;
    } catch (error) {
        console.error('❌ Erro ao conectar ao TiDB:', error.message);
        return false;
    }
}

module.exports = { pool, promisePool, testConnection };