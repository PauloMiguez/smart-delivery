const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');

// Controllers
const productController = require('../controllers/productController');
const categoryController = require('../controllers/categoryController');
const orderController = require('../controllers/orderController');
const configController = require('../controllers/configController');
const userController = require('../controllers/userController');

// ========== Rotas Públicas ==========
// Produtos
router.get('/products', productController.list);
router.get('/products/categories', productController.getCategories);
router.get('/products/category/:category', productController.getByCategory);
router.get('/products/:id', productController.getOne);

// Configurações públicas
router.get('/config', configController.get);

// Pedidos (criação)
router.post('/orders', orderController.create);

// ========== Rotas Administrativas (requer autenticação) ==========
router.use(authenticate);

// Produtos (admin)
router.post('/products', isAdmin, productController.create);
router.put('/products/:id', isAdmin, productController.update);
router.delete('/products/:id', isAdmin, productController.delete);

// Categorias (admin)
router.get('/categories', isAdmin, categoryController.list);
router.post('/categories', isAdmin, categoryController.create);
router.put('/categories/:id', isAdmin, categoryController.update);
router.delete('/categories/:id', isAdmin, categoryController.delete);

// Pedidos (admin)
router.get('/orders', isAdmin, orderController.list);
router.get('/orders/:id', isAdmin, orderController.getOne);
router.put('/orders/:id/status', isAdmin, orderController.updateStatus);
router.get('/stats/orders', isAdmin, orderController.getStats);

// Configurações (admin)
router.put('/config', isAdmin, configController.update);
router.get('/config/:key', isAdmin, configController.getOne);

// Usuário
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/profile/password', userController.updatePassword);

// Login (público)
router.post('/login', userController.login);

module.exports = router;