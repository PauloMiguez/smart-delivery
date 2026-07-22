const Order = require('../models/Order');

// Listar pedidos
exports.list = async (req, res) => {
    try {
        const orders = await Order.findAll();
        res.json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Buscar um pedido
exports.getOne = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
        }
        res.json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Criar pedido
exports.create = async (req, res) => {
    try {
        const orderData = req.body;
        // Gerar número do pedido
        orderData.order_number = `#${Date.now().toString().slice(-6)}`;
        const id = await Order.create(orderData);
        const order = await Order.findById(id);
        res.status(201).json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Atualizar status
exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const updated = await Order.updateStatus(id, status);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
        }
        const order = await Order.findById(id);
        res.json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Estatísticas
exports.getStats = async (req, res) => {
    try {
        const stats = await Order.getStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};