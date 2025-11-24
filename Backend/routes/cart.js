const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cartController');

const router = express.Router();

router.use(protect);

router.get('/', getCart);

router.post('/add', addToCart);
router.patch('/items/:itemId', updateCartItem);
router.delete('/items/:itemId', removeFromCart);
router.delete('/clear', clearCart);

module.exports = router;