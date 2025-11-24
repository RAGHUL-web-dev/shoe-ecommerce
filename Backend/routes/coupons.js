const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');
const {
  createCoupon,
  getAllCoupons,
  validateCoupon,
  updateCoupon,
  deleteCoupon
} = require('../controllers/couponController');

const router = express.Router();

// Public route for coupon validation
router.post('/validate', validateCoupon);

// Protected routes (Admin only)
router.use(protect, restrictTo('admin'));

router.get('/', getAllCoupons);
router.post('/', createCoupon);
router.patch('/:id', updateCoupon);
router.delete('/:id', deleteCoupon);

module.exports = router;