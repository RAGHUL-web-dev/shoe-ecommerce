const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.getCart = catchAsync(async (req, res, next) => {
  let cart = await Cart.findOne({ user: req.user.id })
    .populate('items.product', 'name images variants');

  if (!cart) {
    cart = await Cart.create({ user: req.user.id, items: [] });
  }

  res.status(200).json({
    status: 'success',
    data: {
      cart
    }
  });
});

exports.addToCart = catchAsync(async (req, res, next) => {
  const { productId, variant, quantity = 1 } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  // Check inventory
  const inventory = await Inventory.findOne({
    product: productId,
    'variant.sku': variant.sku
  });

  if (!inventory || inventory.quantity < quantity) {
    return next(new AppError('Insufficient stock', 400));
  }

  let cart = await Cart.findOne({ user: req.user.id });

  if (!cart) {
    cart = await Cart.create({ user: req.user.id, items: [] });
  }

  const existingItemIndex = cart.items.findIndex(
    item => item.product.toString() === productId && item.variant.sku === variant.sku
  );

  if (existingItemIndex > -1) {
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;
    
    if (inventory.quantity < newQuantity) {
      return next(new AppError('Insufficient stock for requested quantity', 400));
    }
    
    cart.items[existingItemIndex].quantity = newQuantity;
  } else {
    // Find variant price
    const productVariant = product.variants.find(v => v.sku === variant.sku);
    if (!productVariant) {
      return next(new AppError('Variant not found', 404));
    }

    cart.items.push({
      product: productId,
      variant,
      quantity,
      price: productVariant.price
    });
  }

  await cart.save();
  await cart.populate('items.product', 'name images');

  res.status(200).json({
    status: 'success',
    data: {
      cart
    }
  });
});

exports.updateCartItem = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return next(new AppError('Cart not found', 404));
  }

  const item = cart.items.id(itemId);
  if (!item) {
    return next(new AppError('Item not found in cart', 404));
  }

  // Check inventory
  const inventory = await Inventory.findOne({
    product: item.product,
    'variant.sku': item.variant.sku
  });

  if (!inventory || inventory.quantity < quantity) {
    return next(new AppError('Insufficient stock', 400));
  }

  if (quantity === 0) {
    cart.items.pull(itemId);
  } else {
    item.quantity = quantity;
  }

  await cart.save();
  await cart.populate('items.product', 'name images');

  res.status(200).json({
    status: 'success',
    data: {
      cart
    }
  });
});

exports.removeFromCart = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return next(new AppError('Cart not found', 404));
  }

  cart.items.pull(itemId);
  await cart.save();

  res.status(200).json({
    status: 'success',
    data: {
      cart
    }
  });
});

exports.clearCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return next(new AppError('Cart not found', 404));
  }

  cart.items = [];
  await cart.save();

  res.status(200).json({
    status: 'success',
    data: {
      cart
    }
  });
});