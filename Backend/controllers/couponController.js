const Coupon = require('../models/Coupon');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.createCoupon = catchAsync(async (req, res, next) => {
  const coupon = await Coupon.create(req.body);
  
  res.status(201).json({
    status: 'success',
    data: {
      coupon
    }
  });
});

exports.getAllCoupons = catchAsync(async (req, res, next) => {
  const coupons = await Coupon.find({ isActive: true });
  
  res.status(200).json({
    status: 'success',
    results: coupons.length,
    data: {
      coupons
    }
  });
});

exports.validateCoupon = catchAsync(async (req, res, next) => {
  const { code, totalAmount } = req.body;

  const coupon = await Coupon.findOne({ code, isActive: true });
  
  if (!coupon) {
    return next(new AppError('Invalid coupon code', 400));
  }

  if (!coupon.isValid()) {
    return next(new AppError('Coupon is expired or no longer valid', 400));
  }

  if (totalAmount < coupon.minimumAmount) {
    return next(new AppError(`Minimum order amount of ${coupon.minimumAmount} required`, 400));
  }

  const discount = coupon.calculateDiscount(totalAmount);

  res.status(200).json({
    status: 'success',
    data: {
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: discount,
        minimumAmount: coupon.minimumAmount
      }
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

exports.deleteCoupon = catchAsync(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!coupon) {
    return next(new AppError('Coupon not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});