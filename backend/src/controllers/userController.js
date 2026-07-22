const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
        }
        
        const validPassword = await User.verifyPassword(user, password);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
        }
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Obter perfil
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Atualizar perfil
exports.updateProfile = async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;
        const updated = await User.update(req.userId, { name, email, phone, address });
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        }
        const user = await User.findById(req.userId);
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Atualizar senha
exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findByEmail(req.userEmail);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        }
        
        const validPassword = await User.verifyPassword(user, currentPassword);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Senha atual incorreta' });
        }
        
        await User.updatePassword(req.userId, newPassword);
        res.json({ success: true, message: 'Senha atualizada com sucesso' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};