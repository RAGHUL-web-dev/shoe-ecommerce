// routes/admin.js
const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

// Dashboard stats
router.get('/dashboard', adminController.getDashboardStats);
router.get('/analytics/sales', adminController.getSalesAnalytics);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserDetails);
router.patch('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Product management
router.get('/products', adminController.getAllProductsAdmin);
router.get('/products/:id', adminController.getProductDetails);
router.post('/products', adminController.createProduct);
router.patch('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

// Order management
router.get('/orders', adminController.getAllOrdersAdmin);
router.get('/orders/:id', adminController.getOrderDetails);
router.patch('/orders/:id/status', adminController.updateOrderStatus);

// Inventory management
router.get('/inventory', adminController.getInventory);
router.patch('/inventory/:id', adminController.updateInventory);

// Category management
router.get('/categories', adminController.getAllCategories); // Add this
router.post('/categories', adminController.createCategory);
router.patch('/categories/:id', adminController.updateCategory);

module.exports = router;