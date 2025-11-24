const User = require('../models/User');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.getProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

exports.updateProfile = catchAsync(async (req, res, next) => {
  const { firstName, lastName, phone, dateOfBirth } = req.body;
  
  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      profile: {
        firstName,
        lastName,
        phone,
        dateOfBirth
      }
    },
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

exports.addAddress = catchAsync(async (req, res, next) => {
  const { fullName, street, city, state, zipCode, country, phone, isDefault } = req.body;
  
  const user = await User.findById(req.user.id);
  
  const newAddress = {
    fullName,
    street,
    city,
    state,
    zipCode,
    country: country || 'India',
    phone,
    isDefault: isDefault || false
  };

  if (isDefault) {
    user.addresses.forEach(address => {
      address.isDefault = false;
    });
  }

  user.addresses.push(newAddress);
  await user.save();

  res.status(201).json({
    status: 'success',
    data: {
      addresses: user.addresses
    }
  });
});

exports.updateAddress = catchAsync(async (req, res, next) => {
  const { addressId } = req.params;
  const updateData = req.body;

  const user = await User.findById(req.user.id);
  const address = user.addresses.id(addressId);

  if (!address) {
    return next(new AppError('Address not found', 404));
  }

  if (updateData.isDefault) {
    user.addresses.forEach(addr => {
      addr.isDefault = false;
    });
  }

  Object.assign(address, updateData);
  await user.save();

  res.status(200).json({
    status: 'success',
    data: {
      addresses: user.addresses
    }
  });
});

exports.deleteAddress = catchAsync(async (req, res, next) => {
  const { addressId } = req.params;

  const user = await User.findById(req.user.id);
  user.addresses.pull(addressId);
  await user.save();

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getAddresses = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('addresses');
  
  res.status(200).json({
    status: 'success',
    data: {
      addresses: user.addresses
    }
  });
});