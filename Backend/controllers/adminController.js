const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Coupon = require('../models/Coupon');
const Inventory = require('../models/Inventory');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Admin = require('../models/Admin');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const mongoose = require('mongoose');

// Enhanced Analytics
exports.getDashboardStats = catchAsync(async (req, res, next) => {
  const today = new Date();
  const startOfToday = new Date(today.setHours(0, 0, 0, 0));
  const startOfWeek = new Date(today.setDate(today.getDate() - 7));
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  // Total stats
  const [
    totalUsers,
    totalProducts,
    totalOrders,
    totalRevenue,
    todayOrders,
    todayRevenue,
    weeklyRevenue,
    monthlyRevenue,
    yearlyRevenue,
    lowStockProducts,
    pendingReviews
  ] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments(),
    Order.countDocuments(),
    Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]),
    Order.countDocuments({ createdAt: { $gte: startOfToday } }),
    Order.aggregate([
      { 
        $match: { 
          status: 'delivered',
          createdAt: { $gte: startOfToday }
        } 
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]),
    Order.aggregate([
      { 
        $match: { 
          status: 'delivered',
          createdAt: { $gte: startOfWeek }
        } 
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]),
    Order.aggregate([
      { 
        $match: { 
          status: 'delivered',
          createdAt: { $gte: startOfMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]),
    Order.aggregate([
      { 
        $match: { 
          status: 'delivered',
          createdAt: { $gte: startOfYear }
        } 
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]),
    Inventory.countDocuments({ isLowStock: true }),
    Review.countDocuments({ isApproved: false })
  ]);

  // Order status breakdown
  const orderStatusStats = await Order.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        revenue: { $sum: '$totalAmount' }
      }
    }
  ]);

  // Top selling products
  const topProducts = await Order.aggregate([
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        totalSold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
      }
    },
    { $sort: { totalSold: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    {
      $project: {
        name: '$product.name',
        totalSold: 1,
        totalRevenue: 1,
        image: { $arrayElemAt: ['$product.images.url', 0] }
      }
    }
  ]);

  // Recent orders
  const recentOrders = await Order.find()
    .populate('user', 'username')
    .populate('items.product', 'name')
    .sort('-createdAt')
    .limit(5);

  res.status(200).json({
    status: 'success',
    data: {
      stats: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        todayOrders,
        todayRevenue: todayRevenue[0]?.total || 0,
        weeklyRevenue: weeklyRevenue[0]?.total || 0,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        yearlyRevenue: yearlyRevenue[0]?.total || 0,
        lowStockProducts,
        pendingReviews
      },
      orderStatusStats,
      topProducts,
      recentOrders
    }
  });
});

exports.getSalesAnalytics = catchAsync(async (req, res, next) => {
  const { period = 'month', year = new Date().getFullYear() } = req.query;
  
  let groupFormat;
  let matchCondition = { status: 'delivered' };

  switch (period) {
    case 'day':
      groupFormat = '%Y-%m-%d %H:00';
      matchCondition.createdAt = { 
        $gte: new Date(new Date().setHours(0, 0, 0, 0)) 
      };
      break;
    case 'week':
      groupFormat = '%Y-%m-%d';
      matchCondition.createdAt = { 
        $gte: new Date(new Date().setDate(new Date().getDate() - 7)) 
      };
      break;
    case 'month':
      groupFormat = '%Y-%m-%d';
      matchCondition.createdAt = { 
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) 
      };
      break;
    case 'year':
      groupFormat = '%Y-%m';
      matchCondition.createdAt = { 
        $gte: new Date(year, 0, 1),
        $lt: new Date(parseInt(year) + 1, 0, 1)
      };
      break;
    default:
      groupFormat = '%Y-%m-%d';
      matchCondition.createdAt = { 
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) 
      };
  }

  const salesData = await Order.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: {
          $dateToString: {
            format: groupFormat,
            date: '$createdAt'
          }
        },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 },
        averageOrderValue: { $avg: '$totalAmount' },
        customers: { $addToSet: '$user' }
      }
    },
    {
      $project: {
        date: '$_id',
        revenue: 1,
        orders: 1,
        averageOrderValue: { $round: ['$averageOrderValue', 2] },
        uniqueCustomers: { $size: '$customers' }
      }
    },
    { $sort: { date: 1 } }
  ]);

  // Get comparison data for previous period
  let comparisonMatch = { status: 'delivered' };
  let comparisonData = [];

  if (period === 'month') {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    comparisonMatch.createdAt = {
      $gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
      $lt: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 1)
    };
    
    comparisonData = await Order.aggregate([
      { $match: comparisonMatch },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      }
    ]);
  }

  res.status(200).json({
    status: 'success',
    data: {
      period,
      salesData,
      comparison: comparisonData[0] || null
    }
  });
});

exports.getCustomerAnalytics = catchAsync(async (req, res, next) => {
  const { period = 'month' } = req.query;

  // Customer growth
  const customerGrowth = await User.aggregate([
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m',
            date: '$createdAt'
          }
        },
        newCustomers: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    { $limit: 12 }
  ]);

  // Top customers by spending
  const topCustomers = await Order.aggregate([
    { $match: { status: 'delivered' } },
    {
      $group: {
        _id: '$user',
        totalSpent: { $sum: '$totalAmount' },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { totalSpent: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        username: '$user.username',
        totalSpent: 1,
        orderCount: 1,
        joined: '$user.createdAt'
      }
    }
  ]);

  // Customer retention rate (simplified)
  const totalCustomers = await User.countDocuments();
  const repeatCustomers = await Order.aggregate([
    {
      $group: {
        _id: '$user',
        orderCount: { $sum: 1 }
      }
    },
    {
      $match: {
        orderCount: { $gt: 1 }
      }
    },
    {
      $count: 'repeatCustomers'
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      customerGrowth,
      topCustomers,
      retention: {
        totalCustomers,
        repeatCustomers: repeatCustomers[0]?.repeatCustomers || 0,
        retentionRate: totalCustomers > 0 ? 
          ((repeatCustomers[0]?.repeatCustomers || 0) / totalCustomers * 100).toFixed(2) : 0
      }
    }
  });
});

// User Management
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, search, sort = '-createdAt' } = req.query;

  const query = {};
  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { 'profile.firstName': { $regex: search, $options: 'i' } },
      { 'profile.lastName': { $regex: search, $options: 'i' } }
    ];
  }

  const users = await User.find(query)
    .select('-password')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await User.countDocuments(query);

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total
      }
    }
  });
});

exports.getUserDetails = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('addresses');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Get user's orders
  const orders = await Order.find({ user: req.params.id })
    .sort('-createdAt')
    .limit(10);

  // Get user's reviews
  const reviews = await Review.find({ user: req.params.id })
    .populate('product', 'name')
    .sort('-createdAt')
    .limit(10);

  res.status(200).json({
    status: 'success',
    data: {
      user,
      orders,
      reviews
    }
  });
});

exports.updateUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Product Management
exports.getAllProductsAdmin = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, category, brand, status, search } = req.query;

  const query = {};
  if (category) query.category = category;
  if (brand) query.brand = brand;
  if (status === 'active') query.isActive = true;
  if (status === 'inactive') query.isActive = false;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const products = await Product.find(query)
    .populate('category', 'name')
    .populate('brand', 'name')
    .sort('-createdAt')
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Product.countDocuments(query);

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total
      }
    }
  });
});

// Get all categories
exports.getAllCategories = catchAsync(async (req, res, next) => {
  const categories = await Category.find().sort('name');

  res.status(200).json({
    status: 'success',
    data: {
      categories
    }
  });
});

// Get product details
exports.getProductDetails = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name')
    .populate('brand', 'name');

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      product
    }
  });
});

exports.createProduct = catchAsync(async (req, res, next) => {
  const productData = req.body;
  
  if (req.files && req.files.length > 0) {
    productData.images = req.files.map((file, index) => ({
      url: `/uploads/${file.filename}`,
      altText: productData.name,
      isPrimary: index === 0
    }));
  }

  const product = await Product.create(productData);

  // Create inventory entries for variants
  if (product.variants && product.variants.length > 0) {
    const inventoryPromises = product.variants.map(variant => 
      Inventory.create({
        product: product._id,
        variant: {
          size: variant.size,
          color: variant.color,
          sku: variant.sku
        },
        quantity: variant.stock || 0
      })
    );
    await Promise.all(inventoryPromises);
  }

  res.status(201).json({
    status: 'success',
    data: {
      product
    }
  });
});

exports.updateProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('category', 'name')
   .populate('brand', 'name');

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      product
    }
  });
});

exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      product
    }
  });
});

// Order Management
exports.getAllOrdersAdmin = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, status, search, sort = '-createdAt' } = req.query;

  const query = {};
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { 'user.username': { $regex: search, $options: 'i' } }
    ];
  }

  const orders = await Order.find(query)
    .populate('user', 'username')
    .populate('items.product', 'name images')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Order.countDocuments(query);

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total
      }
    }
  });
});

exports.getOrderDetails = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'username profile')
    .populate('items.product', 'name images brand');

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      order
    }
  });
});

exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status, trackingNumber, shippingProvider, note } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  order.status = status;
  if (trackingNumber) order.trackingNumber = trackingNumber;
  if (shippingProvider) order.shippingProvider = shippingProvider;
  
  order.statusHistory.push({
    status,
    timestamp: new Date(),
    note: note || `Status updated to ${status}`
  });

  await order.save();

  res.status(200).json({
    status: 'success',
    data: {
      order
    }
  });
});

// Inventory Management
exports.getInventory = catchAsync(async (req, res, next) => {
  const { lowStock = false, page = 1, limit = 20 } = req.query;

  const query = {};
  if (lowStock) query.isLowStock = true;

  const inventory = await Inventory.find(query)
    .populate('product', 'name images')
    .sort('quantity')
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Inventory.countDocuments(query);

  res.status(200).json({
    status: 'success',
    results: inventory.length,
    data: {
      inventory,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total
      }
    }
  });
});

exports.updateInventory = catchAsync(async (req, res, next) => {
  const { quantity, lowStockThreshold } = req.body;

  const inventory = await Inventory.findByIdAndUpdate(
    req.params.id,
    {
      quantity,
      lowStockThreshold,
      lastRestocked: new Date()
    },
    { new: true }
  ).populate('product', 'name images');

  if (!inventory) {
    return next(new AppError('Inventory item not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      inventory
    }
  });
});

// Category Management
exports.createCategory = catchAsync(async (req, res, next) => {
  const categoryData = req.body;
  
  if (req.file) {
    categoryData.image = `/uploads/${req.file.filename}`;
  }

  const category = await Category.create(categoryData);

  res.status(201).json({
    status: 'success',
    data: {
      category
    }
  });
});

exports.updateCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      category
    }
  });
});

// Brand Management
exports.createBrand = catchAsync(async (req, res, next) => {
  const brandData = req.body;
  
  if (req.file) {
    brandData.logo = `/uploads/${req.file.filename}`;
  }

  const brand = await Brand.create(brandData);

  res.status(201).json({
    status: 'success',
    data: {
      brand
    }
  });
});

// Review Management
exports.getPendingReviews = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;

  const reviews = await Review.find({ isApproved: false })
    .populate('user', 'username')
    .populate('product', 'name')
    .sort('createdAt')
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Review.countDocuments({ isApproved: false });

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total
      }
    }
  });
});

exports.moderateReview = catchAsync(async (req, res, next) => {
  const { action, response } = req.body; // action: 'approve', 'reject'

  const review = await Review.findById(req.params.id);
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

// Coupon Management
exports.getAllCoupons = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, active } = req.query;

  const query = {};
  if (active !== undefined) query.isActive = active === 'true';

  const coupons = await Coupon.find(query)
    .sort('-createdAt')
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Coupon.countDocuments(query);

  res.status(200).json({
    status: 'success',
    results: coupons.length,
    data: {
      coupons,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total
      }
    }
  });
});

exports.createCoupon = catchAsync(async (req, res, next) => {
  const coupon = await Coupon.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      coupon
    }
  });
});

exports.updateCoupon = catchAsync(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!coupon) {
    return next(new AppError('Coupon not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      coupon
    }
  });
});

// Admin Management
exports.createAdmin = catchAsync(async (req, res, next) => {
  const admin = await Admin.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        profile: admin.profile
      }
    }
  });
});

exports.getAdmins = catchAsync(async (req, res, next) => {
  const admins = await Admin.find().select('-password');

  res.status(200).json({
    status: 'success',
    data: {
      admins
    }
  });
});