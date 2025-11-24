const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const User = require('../models/User');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.createPaymentIntent = catchAsync(async (req, res, next) => {
  const { checkoutData } = req.body;

  // Validate checkout data
  if (!checkoutData || !checkoutData.total || !checkoutData.shippingAddress) {
    return next(new AppError('Invalid checkout data', 400));
  }

  // Convert amount to paise (Stripe expects smallest currency unit)
  const amount = Math.round(checkoutData.total * 100);

  // Create payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'inr',
    metadata: {
      userId: req.user.id.toString(),
      checkoutData: JSON.stringify(checkoutData)
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    }
  });
});

exports.handlePaymentSuccess = catchAsync(async (req, res, next) => {
  const { paymentIntentId } = req.body;

  // Retrieve payment intent from Stripe
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== 'succeeded') {
    return next(new AppError('Payment not successful', 400));
  }

  const checkoutData = JSON.parse(paymentIntent.metadata.checkoutData);
  const userId = paymentIntent.metadata.userId;

  // Get user cart
  const cart = await Cart.findOne({ user: userId }).populate('items.product');
  if (!cart) {
    return next(new AppError('Cart not found', 404));
  }

  // Create order
  const order = await Order.create({
    user: userId,
    items: cart.items.map(item => ({
      product: item.product._id,
      variant: item.variant,
      quantity: item.quantity,
      price: item.price
    })),
    totalAmount: checkoutData.total,
    subtotal: checkoutData.subtotal,
    shipping: checkoutData.shipping,
    tax: checkoutData.tax,
    discount: checkoutData.discount,
    shippingAddress: checkoutData.shippingAddress,
    payment: {
      method: 'card',
      paymentIntentId: paymentIntent.id,
      status: 'completed',
      amount: checkoutData.total
    },
    status: 'confirmed'
  });

  // Clear user's cart
  cart.items = [];
  await cart.save();

  // Populate order for response
  await order.populate('items.product', 'name images');

  res.status(200).json({
    status: 'success',
    data: {
      order,
      message: 'Payment successful and order created'
    }
  });
});

exports.handlePaymentFailure = catchAsync(async (req, res, next) => {
  const { paymentIntentId, error } = req.body;

  // Update order status if order was created
  const order = await Order.findOne({ 'payment.paymentIntentId': paymentIntentId });
  
  if (order) {
    order.payment.status = 'failed';
    order.status = 'payment_failed';
    await order.save();
  }

  res.status(400).json({
    status: 'fail',
    message: error.message || 'Payment failed'
  });
});

exports.getPaymentMethods = catchAsync(async (req, res, next) => {
  const paymentMethods = [
    {
      id: 'card',
      name: 'Credit/Debit Card',
      description: 'Pay with Visa, MasterCard, or Rupay',
      supportedCards: ['visa', 'mastercard', 'rupay']
    },
    {
      id: 'upi',
      name: 'UPI',
      description: 'Pay using any UPI app',
      supportedApps: ['gpay', 'phonepe', 'paytm', 'bhim']
    },
    {
      id: 'netbanking',
      name: 'Net Banking',
      description: 'Pay using your bank account'
    }
  ];

  res.status(200).json({
    status: 'success',
    data: {
      paymentMethods
    }
  });
});