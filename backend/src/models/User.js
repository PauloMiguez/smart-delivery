const { promisePool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    // Criar tabela de usuários
    static async createTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                address TEXT,
                role VARCHAR(50) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_role (role)
            )
        `;
        await promisePool.query(sql);
        console.log('✅ Tabela users criada/verificada');
        
        // Criar usuário admin padrão
        await this.createAdmin();
    }

    // Criar usuário admin
    static async createAdmin() {
        const admin = await this.findByEmail('admin@smart.com');
        if (!admin) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await this.create({
                name: 'Administrador',
                email: 'admin@smart.com',
                password: hashedPassword,
                role: 'admin'
            });
            console.log('✅ Usuário admin criado: admin@smart.com / admin123');
        }
    }

    // Criar usuário
    static async create(userData) {
        const { name, email, password, phone, address, role = 'user' } = userData;
        const sql = `
            INSERT INTO users (name, email, password, phone, address, role)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await promisePool.query(sql, [name, email, password, phone, address, role]);
        return result.insertId;
    }

    // Buscar por email
    static async findByEmail(email) {
        const [rows] = await promisePool.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0] || null;
    }

    // Buscar por ID
    static async findById(id) {
        const [rows] = await promisePool.query('SELECT id, name, email, phone, address, role, created_at FROM users WHERE id = ?', [id]);
        return rows[0] || null;
    }

    // Atualizar usuário
    static async update(id, userData) {
        const { name, email, phone, address } = userData;
        const sql = 'UPDATE users SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?';
        const [result] = await promisePool.query(sql, [name, email, phone, address, id]);
        return result.affectedRows > 0;
    }

    // Atualizar senha
    static async updatePassword(id, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const [result] = await promisePool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
        return result.affectedRows > 0;
    }

    // Verificar senha
    static async verifyPassword(user, password) {
        return await bcrypt.compare(password, user.password);
    }
}

module.exports = User;