const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.createOrder = catchAsync(async (req, res, next) => {
  const orderData = req.body;
  orderData.user = req.user.id;

  const order = await Order.create(orderData);

  // Update inventory for each item
  for (const item of order.items) {
    await Inventory.findOneAndUpdate(
      {
        product: item.product,
        'variant.sku': item.variant.sku
      },
      {
        $inc: { quantity: -item.quantity }
      }
    );
  }

  await order.populate('items.product', 'name images');

  res.status(201).json({
    status: 'success',
    data: {
      order
    }
  });
});

exports.getUserOrders = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, status } = req.query;
  
  const query = { user: req.user.id };
  if (status) query.status = status;

  const orders = await Order.find(query)
    .populate('items.product', 'name images')
    .sort('-createdAt')
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

exports.getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({
    _id: req.params.id,
    user: req.user.id
  }).populate('items.product', 'name images brand category');

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

exports.cancelOrder = catchAsync(async (req, res, next) => {
  const { reason } = req.body;

  const order = await Order.findOne({
    _id: req.params.id,
    user: req.user.id
  });

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  // Only allow cancellation for pending or confirmed orders
  if (!['pending', 'confirmed'].includes(order.status)) {
    return next(new AppError('Order cannot be cancelled at this stage', 400));
  }

  order.status = 'cancelled';
  order.cancellationReason = reason;
  await order.save();

  // Restore inventory
  for (const item of order.items) {
    await Inventory.findOneAndUpdate(
      {
        product: item.product,
        'variant.sku': item.variant.sku
      },
      {
        $inc: { quantity: item.quantity }
      }
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      order
    }
  });
});

exports.requestReturn = catchAsync(async (req, res, next) => {
  const { reason, items } = req.body;

  const order = await Order.findOne({
    _id: req.params.id,
    user: req.user.id
  });

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  // Only allow returns for delivered orders within 7 days
  if (order.status !== 'delivered') {
    return next(new AppError('Only delivered orders can be returned', 400));
  }

  const deliveryDate = new Date(order.updatedAt);
  const returnDeadline = new Date(deliveryDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (new Date() > returnDeadline) {
    return next(new AppError('Return period (7 days) has expired', 400));
  }

  order.status = 'return_requested';
  order.returnReason = reason;
  await order.save();

  res.status(200).json({
    status: 'success',
    data: {
      order,
      message: 'Return request submitted successfully'
    }
  });
});

exports.downloadInvoice = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({
    _id: req.params.id,
    user: req.user.id
  }).populate('items.product', 'name');

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  // Simple invoice generation (in real app, use a proper PDF library)
  const invoice = {
    orderNumber: order.orderNumber,
    date: order.createdAt,
    customer: req.user.username,
    shippingAddress: order.shippingAddress,
    items: order.items.map(item => ({
      product: item.product.name,
      variant: item.variant,
      quantity: item.quantity,
      price: item.price,
      total: item.total
    })),
    subtotal: order.subtotal,
    shipping: order.shipping,
    tax: order.tax,
    discount: order.discount,
    total: order.totalAmount
  };

  res.status(200).json({
    status: 'success',
    data: {
      invoice
    }
  });
});

exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status, note } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  order.status = status;
  if (note) {
    order.statusHistory.push({
      status,
      note
    });
  }

  await order.save();

  res.status(200).json({
    status: 'success',
    data: {
      order
    }
  });
});