const { promisePool } = require('../config/database');

class Config {
    // Criar tabela de configurações
    static async createTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS config (
                id INT PRIMARY KEY AUTO_INCREMENT,
                config_key VARCHAR(100) UNIQUE NOT NULL,
                config_value TEXT,
                config_type VARCHAR(50) DEFAULT 'string',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_key (config_key)
            )
        `;
        await promisePool.query(sql);
        console.log('✅ Tabela config criada/verificada');
        
        // Inserir configurações padrão
        await this.initDefaults();
    }

    // Inicializar configurações padrão
    static async initDefaults() {
        const defaults = {
            store_name: 'Smart Delivery',
            store_address: 'Rua Exemplo, 123 - Centro',
            store_phone: '5511999999999',
            delivery_fee: '3.00',
            open_time: '09:00',
            close_time: '22:00',
            is_open: 'true',
            banner_image: '',
            logo_image: ''
        };

        for (const [key, value] of Object.entries(defaults)) {
            await this.set(key, value);
        }
    }

    // Obter configuração
    static async get(key) {
        const [rows] = await promisePool.query('SELECT config_value FROM config WHERE config_key = ?', [key]);
        return rows[0] ? rows[0].config_value : null;
    }

    // Definir configuração
    static async set(key, value) {
        const [existing] = await promisePool.query('SELECT id FROM config WHERE config_key = ?', [key]);
        if (existing.length > 0) {
            await promisePool.query('UPDATE config SET config_value = ? WHERE config_key = ?', [value, key]);
        } else {
            await promisePool.query('INSERT INTO config (config_key, config_value) VALUES (?, ?)', [key, value]);
        }
    }

    // Obter todas as configurações
    static async getAll() {
        const [rows] = await promisePool.query('SELECT config_key, config_value FROM config');
        const config = {};
        rows.forEach(row => {
            config[row.config_key] = row.config_value;
        });
        return config;
    }
}

module.exports = Config;