const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createPaymentIntent,
  handlePaymentSuccess,
  handlePaymentFailure,
  getPaymentMethods
} = require('../controllers/paymentController');

const router = express.Router();

router.use(protect);

router.get('/methods', getPaymentMethods);
router.post('/create-intent', createPaymentIntent);
router.post('/success', handlePaymentSuccess);
router.post('/failure', handlePaymentFailure);

module.exports = router;