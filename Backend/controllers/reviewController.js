const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.createReview = catchAsync(async (req, res, next) => {
  const { productId, orderId, rating, title, comment } = req.body;

  // Verify that user has purchased the product
  const order = await Order.findOne({
    _id: orderId,
    user: req.user.id,
    status: 'delivered'
  });

  if (!order) {
    return next(new AppError('Order not found or not delivered', 400));
  }

  // Check if product exists in the order
  const orderItem = order.items.find(item => 
    item.product.toString() === productId
  );

  if (!orderItem) {
    return next(new AppError('Product not found in this order', 400));
  }

  // Check if review already exists
  const existingReview = await Review.findOne({
    user: req.user.id,
    product: productId,
    order: orderId
  });

  if (existingReview) {
    return next(new AppError('You have already reviewed this product for this order', 400));
  }

  const review = await Review.create({
    user: req.user.id,
    product: productId,
    order: orderId,
    rating,
    title,
    comment,
    isVerified: true
  });

  await review.populate('user', 'username profile');

  res.status(201).json({
    status: 'success',
    data: {
      review
    }
  });
});

exports.getProductReviews = catchAsync(async (req, res, next) => {
  const { productId } = req.params;
  const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

  const query = { 
    product: productId, 
    isApproved: true 
  };

  const reviews = await Review.find(query)
    .populate('user', 'username profile')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Review.countDocuments(query);

  // Calculate rating summary
  const ratingSummary = await Review.aggregate([
    {
      $match: { product: mongoose.Types.ObjectId(productId), isApproved: true }
    },
    {
      $group: {
        _id: '$product',
        average: { $avg: '$rating' },
        count: { $sum: 1 },
        '1': { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        '2': { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        '3': { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        '4': { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        '5': { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      reviews,
      ratingSummary: ratingSummary[0] || { average: 0, count: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total
      }
    }
  });
});

exports.markHelpful = catchAsync(async (req, res, next) => {
  const { reviewId } = req.params;

  const review = await Review.findById(reviewId);
  if (!review) {
    return next(new AppError('Review not found', 404));
  }

  // Check if user already marked helpful
  const alreadyHelpful = review.helpful.includes(req.user.id);
  
  if (alreadyHelpful) {
    // Remove helpful mark
    review.helpful.pull(req.user.id);
    review.helpfulCount = Math.max(0, review.helpfulCount - 1);
  } else {
    // Add helpful mark
    review.helpful.push(req.user.id);
    review.helpfulCount += 1;
  }

  await review.save();

  res.status(200).json({
    status: 'success',
    data: {
      review,
      action: alreadyHelpful ? 'removed' : 'added'
    }
  });
});

exports.getUserReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find({ user: req.user.id })
    .populate('product', 'name images')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews
    }
  });
});

// Admin functions
exports.moderateReview = catchAsync(async (req, res, next) => {
  const { reviewId } = req.params;
  const { action, response } = req.body; // action: 'approve', 'reject'

  const review = await Review.findById(reviewId);
  if (!review) {
    return next(new AppError('Review not found', 404));
  }

  if (action === 'approve') {
    review.isApproved = true;
  } else if (action === 'reject') {
    review.isApproved = false;
  }

  if (response) {
    review.adminResponse = {
      comment: response,
      respondedAt: new Date(),
      respondedBy: req.user.id
    };
  }

  await review.save();

  res.status(200).json({
    status: 'success',
    data: {
      review
    }
  });
});

exports.getPendingReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find({ isApproved: false })
    .populate('user', 'username')
    .populate('product', 'name')
    .sort('createdAt');

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews
    }
  });
});