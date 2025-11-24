const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');
const {
  createReview,
  getProductReviews,
  markHelpful,
  getUserReviews,
  moderateReview,
  getPendingReviews
} = require('../controllers/reviewController');

const router = express.Router();

// Public routes
router.get('/product/:productId', getProductReviews);

// User routes
router.use(protect);

router.get('/my-reviews', getUserReviews);
router.post('/', createReview);
router.patch('/:reviewId/helpful', markHelpful);

// Admin routes
router.get('/admin/pending', restrictTo('admin'), getPendingReviews);
router.patch('/admin/:reviewId/moderate', restrictTo('admin'), moderateReview);

module.exports = router;