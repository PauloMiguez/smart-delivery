const Product = require('../models/Product');

// Listar produtos
exports.list = async (req, res) => {
    try {
        const { active_only } = req.query;
        const products = await Product.findAll(active_only === 'true');
        res.json({ success: true, data: products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Buscar por categoria
exports.getByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const products = await Product.findByCategory(category);
        res.json({ success: true, data: products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Buscar categorias
exports.getCategories = async (req, res) => {
    try {
        const categories = await Product.getCategories();
        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Buscar um produto
exports.getOne = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Produto não encontrado' });
        }
        res.json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Criar produto
exports.create = async (req, res) => {
    try {
        const { name, description, price, category, active, image_url } = req.body;
        const id = await Product.create({ name, description, price, category, active, image_url });
        const product = await Product.findById(id);
        res.status(201).json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Atualizar produto
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, category, active, image_url } = req.body;
        const updated = await Product.update(id, { name, description, price, category, active, image_url });
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Produto não encontrado' });
        }
        const product = await Product.findById(id);
        res.json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Deletar produto
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Product.delete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Produto não encontrado' });
        }
        res.json({ success: true, message: 'Produto removido com sucesso' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};