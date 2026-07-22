require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
//  CONFIGURAÇÃO DO BANCO DE DADOS
// ============================================================
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

// ============================================================
//  CONFIGURAÇÃO CLOUDINARY
// ============================================================
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('✅ Cloudinary configurado com sucesso!');


// ============================================================
//  FUNÇÃO PARA CRIAR TABELAS (SEM DADOS MOCKADOS)
// ============================================================
async function initDatabase() {
    try {
        await promisePool.query('SELECT 1');
        console.log('✅ Conectado ao TiDB Cloud com sucesso!');

        // Tabela de produtos
        await promisePool.query(`
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
        `);
        console.log('✅ Tabela products criada/verificada');

        // Tabela de categorias
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL UNIQUE,
                display_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_order (display_order)
            )
        `);
        console.log('✅ Tabela categories criada/verificada');

        // Tabela de pedidos
        await promisePool.query(`
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
        `);
        console.log('✅ Tabela orders criada/verificada');

        // Tabela de configurações
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS config (
                id INT PRIMARY KEY AUTO_INCREMENT,
                config_key VARCHAR(100) UNIQUE NOT NULL,
                config_value TEXT,
                config_type VARCHAR(50) DEFAULT 'string',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_key (config_key)
            )
        `);
        console.log('✅ Tabela config criada/verificada');

        // Inserir configurações padrão APENAS se não existirem
        const defaults = {
            store_name: 'Smart Delivery',
            store_address: '',
            store_phone: '',
            delivery_fee: '3.00',
            open_time: '09:00',
            close_time: '22:00',
            is_open: 'true',
            banner_image: '',
            logo_image: ''
        };

        for (const [key, value] of Object.entries(defaults)) {
            const [rows] = await promisePool.query('SELECT id FROM config WHERE config_key = ?', [key]);
            if (rows.length === 0) {
                await promisePool.query('INSERT INTO config (config_key, config_value) VALUES (?, ?)', [key, value]);
            }
        }
        console.log('✅ Configurações padrão inseridas');

        console.log('✅ Banco de dados inicializado com sucesso!');
        console.log('⚠️ Nenhum dado mockado foi inserido. O sistema está vazio.');
        return true;
    } catch (error) {
        console.error('❌ Erro ao inicializar banco:', error);
        return false;
    }
}

// ============================================================
//  MIDDLEWARES
// ============================================================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use('/admin', express.static(path.join(__dirname, '../frontend/admin')));

// ============================================================
//  ROTAS - PRODUTOS
// ============================================================
app.get('/api/products', async (req, res) => {
    try {
        const { active_only } = req.query;
        let sql = 'SELECT * FROM products';
        const params = [];
        if (active_only === 'true') {
            sql += ' WHERE active = 1';
        }
        sql += ' ORDER BY id DESC';
        const [rows] = await promisePool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/products/categories', async (req, res) => {
    try {
        const [rows] = await promisePool.query('SELECT DISTINCT category FROM products WHERE active = 1 ORDER BY category');
        const categories = rows.map(row => row.category);
        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const [rows] = await promisePool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Produto não encontrado' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const { name, description, price, category, active, image_url } = req.body;
        const sql = 'INSERT INTO products (name, description, price, category, active, image_url) VALUES (?, ?, ?, ?, ?, ?)';
        const [result] = await promisePool.query(sql, [name, description, price, category, active !== undefined ? active : true, image_url || null]);
        const [rows] = await promisePool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        const { name, description, price, category, active, image_url } = req.body;
        const sql = 'UPDATE products SET name = ?, description = ?, price = ?, category = ?, active = ?, image_url = ? WHERE id = ?';
        const [result] = await promisePool.query(sql, [name, description, price, category, active !== undefined ? active : true, image_url || null, req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Produto não encontrado' });
        }
        const [rows] = await promisePool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const [result] = await promisePool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Produto não encontrado' });
        }
        res.json({ success: true, message: 'Produto removido com sucesso' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
//  ROTAS - CATEGORIAS
// ============================================================
app.get('/api/categories', async (req, res) => {
    try {
        const [rows] = await promisePool.query('SELECT * FROM categories ORDER BY display_order ASC, name ASC');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/categories', async (req, res) => {
    try {
        const { name, display_order } = req.body;
        const [existing] = await promisePool.query('SELECT id FROM categories WHERE name = ?', [name]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Categoria já existe' });
        }
        const sql = 'INSERT INTO categories (name, display_order) VALUES (?, ?)';
        const [result] = await promisePool.query(sql, [name, display_order || 0]);
        const [rows] = await promisePool.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/categories/:id', async (req, res) => {
    try {
        const { name, display_order } = req.body;
        const [existing] = await promisePool.query('SELECT id FROM categories WHERE name = ? AND id != ?', [name, req.params.id]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Categoria já existe' });
        }
        const sql = 'UPDATE categories SET name = ?, display_order = ? WHERE id = ?';
        const [result] = await promisePool.query(sql, [name, display_order || 0, req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
        }
        const [rows] = await promisePool.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/categories/:id', async (req, res) => {
    try {
        const [result] = await promisePool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
        }
        res.json({ success: true, message: 'Categoria removida com sucesso' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
//  ROTAS - PEDIDOS
// ============================================================
app.get('/api/orders', async (req, res) => {
    try {
        const [rows] = await promisePool.query('SELECT * FROM orders ORDER BY created_at DESC');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/orders/:id', async (req, res) => {
    try {
        const [rows] = await promisePool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        const orderNumber = '#' + Date.now().toString().slice(-6);

        const sql = `
            INSERT INTO orders (
                order_number, customer_name, customer_email, customer_phone, customer_address,
                items, subtotal, delivery_fee, discount, total, payment_method,
                delivery_type, scheduled_time, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await promisePool.query(sql, [
            orderNumber,
            orderData.customer_name || 'Cliente',
            orderData.customer_email || '',
            orderData.customer_phone || '',
            orderData.customer_address || '',
            JSON.stringify(orderData.items || []),
            orderData.subtotal || 0,
            orderData.delivery_fee || 0,
            orderData.discount || 0,
            orderData.total || 0,
            orderData.payment_method || 'Dinheiro',
            orderData.delivery_type || 'delivery',
            orderData.scheduled_time || null,
            'pending',
            orderData.notes || ''
        ]);

        const [order] = await promisePool.query('SELECT * FROM orders WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: order[0] });
    } catch (error) {
        console.error('Erro ao criar pedido:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const [result] = await promisePool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
        }
        const [rows] = await promisePool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
//  ROTAS - CONFIGURAÇÕES
// ============================================================
app.get('/api/config', async (req, res) => {
    try {
        const [rows] = await promisePool.query('SELECT config_key, config_value FROM config');
        const config = {};
        rows.forEach(row => config[row.config_key] = row.config_value);
        res.json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/config', async (req, res) => {
    try {
        const updates = req.body;
        
        // Salvar as configurações normalmente
        for (const [key, value] of Object.entries(updates)) {
            if (key === 'banner_image' || key === 'logo_image') {
                // URLs das imagens já vêm do Cloudinary
                await promisePool.query(
                    'INSERT INTO config (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = ?',
                    [key, value, value]
                );
            } else {
                await promisePool.query(
                    'INSERT INTO config (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = ?',
                    [key, value, value]
                );
            }
        }
        
        // Buscar configurações atualizadas
        const [rows] = await promisePool.query('SELECT config_key, config_value FROM config');
        const config = {};
        rows.forEach(row => config[row.config_key] = row.config_value);
        
        res.json({ success: true, data: config });
    } catch (error) {
        console.error('Erro ao salvar config:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/config/:key', async (req, res) => {
    try {
        const [rows] = await promisePool.query('SELECT config_value FROM config WHERE config_key = ?', [req.params.key]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Configuração não encontrada' });
        }
        res.json({ success: true, data: { [req.params.key]: rows[0].config_value } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
//  ROTAS - ESTATÍSTICAS
// ============================================================
app.get('/api/stats/orders', async (req, res) => {
    try {
        const [totalResult] = await promisePool.query('SELECT COUNT(*) as total FROM orders');
        const [todayResult] = await promisePool.query(`
            SELECT COALESCE(SUM(total), 0) as revenue, COUNT(*) as count
            FROM orders 
            WHERE DATE(created_at) = CURDATE()
        `);
        const [pendingResult] = await promisePool.query('SELECT COUNT(*) as pending FROM orders WHERE status = "pending"');
        
        const [avgResult] = await promisePool.query('SELECT COALESCE(AVG(total), 0) as avg_ticket FROM orders');
        
        res.json({
            success: true,
            data: {
                total: totalResult[0].total || 0,
                todayRevenue: parseFloat(todayResult[0].revenue) || 0,
                todayOrders: todayResult[0].count || 0,
                pending: pendingResult[0].pending || 0,
                avgTicket: parseFloat(avgResult[0].avg_ticket) || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
//  ROTAS PRINCIPAIS
// ============================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin/index.html'));
});

// ============================================================
//  CONFIGURAÇÃO CLOUDINARY
// ============================================================
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configuração do Multer para upload de arquivos em memória
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// ============================================================
//  ROTA DE UPLOAD - CLOUDINARY
// ============================================================
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Nenhuma imagem enviada' });
        }

        const folder = req.body.folder || 'smart-delivery';
        const transformation = req.body.type === 'logo' 
            ? { width: 200, height: 200, crop: 'limit', quality: 'auto' }
            : { width: 1200, crop: 'limit', quality: 'auto' };

        const result = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, {
            folder: folder,
            transformation: transformation,
            format: 'webp'
        });

        res.json({
            success: true,
            url: result.secure_url,
            public_id: result.public_id
        });
    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Rota para deletar imagem do Cloudinary
app.delete('/api/upload/:public_id', async (req, res) => {
    try {
        const { public_id } = req.params;
        await cloudinary.uploader.destroy(public_id);
        res.json({ success: true, message: 'Imagem removida' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
//  INICIAR SERVIDOR
// ============================================================
async function startServer() {
    const initialized = await initDatabase();
    if (!initialized) {
        console.error('❌ Falha ao inicializar banco de dados');
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log('🚀 Servidor rodando em http://localhost:' + PORT);
        console.log('📱 Cliente: http://localhost:' + PORT);
        console.log('🔐 Admin: http://localhost:' + PORT + '/admin');
        console.log('📦 Conectado ao TiDB Cloud');
        console.log('⚠️ Sistema vazio - sem dados mockados');
    });
}

startServer();