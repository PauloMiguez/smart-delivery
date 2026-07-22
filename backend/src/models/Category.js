const { promisePool } = require('../config/database');

class Category {
    // Criar tabela de categorias
    static async createTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS categories (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL UNIQUE,
                display_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_order (display_order)
            )
        `;
        await promisePool.query(sql);
        console.log('✅ Tabela categories criada/verificada');
    }

    // Criar categoria
    static async create(categoryData) {
        const { name, display_order = 0 } = categoryData;
        const sql = 'INSERT INTO categories (name, display_order) VALUES (?, ?)';
        const [result] = await promisePool.query(sql, [name, display_order]);
        return result.insertId;
    }

    // Buscar todas as categorias
    static async findAll() {
        const [rows] = await promisePool.query('SELECT * FROM categories ORDER BY display_order ASC, name ASC');
        return rows;
    }

    // Buscar por ID
    static async findById(id) {
        const [rows] = await promisePool.query('SELECT * FROM categories WHERE id = ?', [id]);
        return rows[0] || null;
    }

    // Buscar por nome
    static async findByName(name) {
        const [rows] = await promisePool.query('SELECT * FROM categories WHERE name = ?', [name]);
        return rows[0] || null;
    }

    // Atualizar categoria
    static async update(id, categoryData) {
        const { name, display_order } = categoryData;
        const sql = 'UPDATE categories SET name = ?, display_order = ? WHERE id = ?';
        const [result] = await promisePool.query(sql, [name, display_order, id]);
        return result.affectedRows > 0;
    }

    // Deletar categoria
    static async delete(id) {
        const [result] = await promisePool.query('DELETE FROM categories WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
}

module.exports = Category;