// test-connection.js
const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: true
    }
});

connection.connect((err) => {
    if (err) {
        console.error('❌ Erro ao conectar ao TiDB:', err);
        return;
    }
    console.log('✅ Conectado ao TiDB Cloud com sucesso!');
    
    // Testar query
    connection.query('SELECT 1 as test', (err, results) => {
        if (err) {
            console.error('❌ Erro na query:', err);
        } else {
            console.log('✅ Query executada com sucesso:', results);
        }
        connection.end();
    });
});