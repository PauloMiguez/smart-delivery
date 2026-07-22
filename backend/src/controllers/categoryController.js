const Category = require('../models/Category');

// Listar categorias
exports.list = async (req, res) => {
    try {
        const categories = await Category.findAll();
        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Criar categoria
exports.create = async (req, res) => {
    try {
        const { name, display_order } = req.body;
        const existing = await Category.findByName(name);
        if (existing) {
            return res.status(400).json({ success: false, message: 'Categoria já existe' });
        }
        const id = await Category.create({ name, display_order });
        const category = await Category.findById(id);
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Atualizar categoria
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, display_order } = req.body;
        const updated = await Category.update(id, { name, display_order });
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
        }
        const category = await Category.findById(id);
        res.json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Deletar categoria
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Category.delete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
        }
        res.json({ success: true, message: 'Categoria removida com sucesso' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};