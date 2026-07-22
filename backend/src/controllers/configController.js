const Config = require('../models/Config');

// Obter configurações
exports.get = async (req, res) => {
    try {
        const config = await Config.getAll();
        res.json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Atualizar configurações
exports.update = async (req, res) => {
    try {
        const updates = req.body;
        for (const [key, value] of Object.entries(updates)) {
            await Config.set(key, value);
        }
        const config = await Config.getAll();
        res.json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Obter uma configuração específica
exports.getOne = async (req, res) => {
    try {
        const { key } = req.params;
        const value = await Config.get(key);
        if (value === null) {
            return res.status(404).json({ success: false, message: 'Configuração não encontrada' });
        }
        res.json({ success: true, data: { [key]: value } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};