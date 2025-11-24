const Cart = require('../models/Cart');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.calculateCheckout = catchAsync(async (req, res, next) => {
  const { couponCode, shippingAddressId } = req.body;

  // Get user cart
  const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
  if (!cart || cart.items.length === 0) {
    return next(new AppError('Cart is empty', 400));
  }

  // Get shipping address
  const user = await User.findById(req.user.id);
  let shippingAddress;
  
  if (shippingAddressId) {
    shippingAddress = user.addresses.id(shippingAddressId);
  } else {
    shippingAddress = user.addresses.find(addr => addr.isDefault);
  }

  if (!shippingAddress) {
    return next(new AppError('No shipping address found', 400));
  }

  // Calculate subtotal
  const subtotal = cart.totalPrice;

  // Calculate shipping
  const shippingCost = this.calculateShipping(subtotal, shippingAddress);

  // Calculate tax (assuming 18% GST for India)
  const taxRate = 0.18;
  const taxAmount = subtotal * taxRate;

  // Apply coupon if provided
  let discountAmount = 0;
  let coupon = null;

  if (couponCode) {
    coupon = await Coupon.findOne({ code: couponCode, isActive: true });
    
    if (coupon && coupon.isValid()) {
      if (subtotal >= coupon.minimumAmount) {
        discountAmount = coupon.calculateDiscount(subtotal);
        // Increment coupon usage
        coupon.usedCount += 1;
        await coupon.save();
      }
    }
  }

  // Calculate total
  const total = subtotal + shippingCost + taxAmount - discountAmount;

  res.status(200).json({
    status: 'success',
    data: {
      checkoutSummary: {
        subtotal,
        shipping: shippingCost,
        tax: taxAmount,
        discount: discountAmount,
        total
      },
      shippingAddress,
      cartItems: cart.items,
      appliedCoupon: coupon ? {
        code: coupon.code,
        discount: discountAmount
      } : null
    }
  });
});

exports.calculateShipping = (subtotal, address) => {
  // Free shipping for orders above ₹999
  if (subtotal > 999) {
    return 0;
  }

  // Standard shipping charges based on location
  const standardShipping = 50;
  
  // Additional charges for remote areas
  const remoteStates = ['Andaman and Nicobar Islands', 'Lakshadweep', 'Mizoram', 'Nagaland'];
  if (remoteStates.includes(address.state)) {
    return standardShipping + 100;
  }

  return standardShipping;
};