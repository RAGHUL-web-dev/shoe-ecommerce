// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

const protect = catchAsync(async (req, res, next) => {
  let token;

  console.log('🔐 Protect middleware - Checking authentication');
  console.log('📋 Cookies:', req.cookies);
  console.log('📋 Headers:', req.headers);

  // 1) Prefer Authorization header (Bearer)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
    console.log('✅ Token found in authorization header');
  }

  // 2) Fallback: cookies
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
    console.log('✅ Token found in cookies');
  }

  // 3) Dev fallback: query string
  if (!token && req.query.token) {
    token = req.query.token;
    console.log('✅ Token found in query string');
  }

  if (!token || token === 'loggedout') {
    console.log('❌ No token found');
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verified for user:', decoded.id);

    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      console.log('❌ User no longer exists');
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    req.user = currentUser;
    console.log('✅ User authenticated:', currentUser.username);
    next();
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
    return next(new AppError('Invalid token. Please log in again.', 401));
  }
});

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

module.exports = { protect, restrictTo };
