const express = require('express');
const { protect } = require('../middleware/auth');
const { calculateCheckout } = require('../controllers/checkoutController');

const router = express.Router();

router.use(protect);

router.post('/calculate', calculateCheckout);

module.exports = router;