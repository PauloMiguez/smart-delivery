const { promisePool } = require('../config/database');

class Product {
    // Criar tabela de produtos
    static async createTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS products (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                category VARCHAR(100) NOT NULL,
                active BOOLEAN DEFAULT TRUE,
                image_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_category (category),
                INDEX idx_active (active)
            )
        `;
        await promisePool.query(sql);
        console.log('✅ Tabela products criada/verificada');
    }

    // Criar produto
    static async create(productData) {
        const { name, description, price, category, active = true, image_url = null } = productData;
        const sql = `
            INSERT INTO products (name, description, price, category, active, image_url)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await promisePool.query(sql, [name, description, price, category, active, image_url]);
        return result.insertId;
    }

    // Buscar todos os produtos
    static async findAll(activeOnly = false) {
        let sql = 'SELECT * FROM products';
        const params = [];
        if (activeOnly) {
            sql += ' WHERE active = 1';
        }
        sql += ' ORDER BY id DESC';
        const [rows] = await promisePool.query(sql, params);
        return rows;
    }

    // Buscar por categoria
    static async findByCategory(category, activeOnly = true) {
        let sql = 'SELECT * FROM products WHERE category = ?';
        const params = [category];
        if (activeOnly) {
            sql += ' AND active = 1';
        }
        sql += ' ORDER BY id DESC';
        const [rows] = await promisePool.query(sql, params);
        return rows;
    }

    // Buscar por ID
    static async findById(id) {
        const [rows] = await promisePool.query('SELECT * FROM products WHERE id = ?', [id]);
        return rows[0] || null;
    }

    // Atualizar produto
    static async update(id, productData) {
        const { name, description, price, category, active, image_url } = productData;
        const sql = `
            UPDATE products 
            SET name = ?, description = ?, price = ?, category = ?, active = ?, image_url = ?
            WHERE id = ?
        `;
        const [result] = await promisePool.query(sql, [name, description, price, category, active, image_url, id]);
        return result.affectedRows > 0;
    }

    // Deletar produto
    static async delete(id) {
        const [result] = await promisePool.query('DELETE FROM products WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }

    // Buscar categorias distintas
    static async getCategories() {
        const [rows] = await promisePool.query('SELECT DISTINCT category FROM products WHERE active = 1 ORDER BY category');
        return rows.map(row => row.category);
    }
}

module.exports = Product;