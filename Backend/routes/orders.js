const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');
const {
  createOrder,
  getUserOrders,
  getOrder,
  cancelOrder,
  requestReturn,
  downloadInvoice,
  updateOrderStatus
} = require('../controllers/orderController');

const router = express.Router();

router.use(protect);

router.get('/', getUserOrders);
router.get('/:id', getOrder);
router.post('/', createOrder);
router.patch('/:id/cancel', cancelOrder);
router.patch('/:id/return', requestReturn);
router.get('/:id/invoice', downloadInvoice);

// Admin routes
router.patch('/:id/status', restrictTo('admin'), updateOrderStatus);

module.exports = router;