const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    trim: true,
    maxlength: 100
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  images: [{
    url: String,
    altText: String
  }],
  helpful: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  helpfulCount: {
    type: Number,
    default: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  adminResponse: {
    comment: String,
    respondedAt: Date,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

// Ensure one review per product per user per order
reviewSchema.index({ user: 1, product: 1, order: 1 }, { unique: true });

// Update product rating when review is saved
reviewSchema.post('save', async function() {
  const Review = mongoose.model('Review');
  
  const stats = await Review.aggregate([
    {
      $match: { product: this.product, isApproved: true }
    },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
        numberOfReviews: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    const Product = mongoose.model('Product');
    await Product.findByIdAndUpdate(this.product, {
      'rating.average': Math.round(stats[0].averageRating * 10) / 10,
      'rating.count': stats[0].numberOfReviews
    });
  }
});

module.exports = mongoose.model('Review', reviewSchema);