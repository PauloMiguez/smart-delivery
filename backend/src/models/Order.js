const { promisePool } = require('../config/database');

class Order {
    // Criar tabela de pedidos
    static async createTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS orders (
                id INT PRIMARY KEY AUTO_INCREMENT,
                order_number VARCHAR(50) UNIQUE NOT NULL,
                customer_name VARCHAR(255) NOT NULL,
                customer_email VARCHAR(255),
                customer_phone VARCHAR(50),
                customer_address TEXT,
                items JSON NOT NULL,
                subtotal DECIMAL(10,2) NOT NULL,
                delivery_fee DECIMAL(10,2) DEFAULT 0,
                discount DECIMAL(10,2) DEFAULT 0,
                total DECIMAL(10,2) NOT NULL,
                payment_method VARCHAR(50),
                delivery_type VARCHAR(50) DEFAULT 'delivery',
                scheduled_time DATETIME,
                status VARCHAR(50) DEFAULT 'pending',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_created (created_at),
                INDEX idx_order_number (order_number)
            )
        `;
        await promisePool.query(sql);
        console.log('✅ Tabela orders criada/verificada');
    }

    // Criar pedido
    static async create(orderData) {
        const {
            order_number, customer_name, customer_email, customer_phone, customer_address,
            items, subtotal, delivery_fee, discount, total, payment_method,
            delivery_type, scheduled_time, status = 'pending', notes
        } = orderData;

        const sql = `
            INSERT INTO orders (
                order_number, customer_name, customer_email, customer_phone, customer_address,
                items, subtotal, delivery_fee, discount, total, payment_method,
                delivery_type, scheduled_time, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await promisePool.query(sql, [
            order_number, customer_name, customer_email, customer_phone, customer_address,
            JSON.stringify(items), subtotal, delivery_fee, discount, total, payment_method,
            delivery_type, scheduled_time, status, notes
        ]);
        return result.insertId;
    }

    // Buscar todos os pedidos
    static async findAll() {
        const [rows] = await promisePool.query('SELECT * FROM orders ORDER BY created_at DESC');
        return rows;
    }

    // Buscar por ID
    static async findById(id) {
        const [rows] = await promisePool.query('SELECT * FROM orders WHERE id = ?', [id]);
        if (rows[0]) {
            rows[0].items = JSON.parse(rows[0].items);
        }
        return rows[0] || null;
    }

    // Buscar por número do pedido
    static async findByOrderNumber(orderNumber) {
        const [rows] = await promisePool.query('SELECT * FROM orders WHERE order_number = ?', [orderNumber]);
        if (rows[0]) {
            rows[0].items = JSON.parse(rows[0].items);
        }
        return rows[0] || null;
    }

    // Atualizar status
    static async updateStatus(id, status) {
        const [result] = await promisePool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
        return result.affectedRows > 0;
    }

    // Atualizar pedido completo
    static async update(id, orderData) {
        const {
            customer_name, customer_email, customer_phone, customer_address,
            items, subtotal, delivery_fee, discount, total, payment_method,
            delivery_type, scheduled_time, status, notes
        } = orderData;

        const sql = `
            UPDATE orders SET
                customer_name = ?, customer_email = ?, customer_phone = ?, customer_address = ?,
                items = ?, subtotal = ?, delivery_fee = ?, discount = ?, total = ?,
                payment_method = ?, delivery_type = ?, scheduled_time = ?, status = ?, notes = ?
            WHERE id = ?
        `;

        const [result] = await promisePool.query(sql, [
            customer_name, customer_email, customer_phone, customer_address,
            JSON.stringify(items), subtotal, delivery_fee, discount, total,
            payment_method, delivery_type, scheduled_time, status, notes, id
        ]);
        return result.affectedRows > 0;
    }

    // Estatísticas
    static async getStats() {
        const [total] = await promisePool.query('SELECT COUNT(*) as total FROM orders');
        const [today] = await promisePool.query(`
            SELECT COALESCE(SUM(total), 0) as revenue, COUNT(*) as count
            FROM orders 
            WHERE DATE(created_at) = CURDATE()
        `);
        const [pending] = await promisePool.query('SELECT COUNT(*) as pending FROM orders WHERE status = "pending"');
        
        return {
            total: total[0].total,
            todayRevenue: parseFloat(today[0].revenue),
            todayOrders: today[0].count,
            pending: pending[0].pending
        };
    }
}

module.exports = Order;