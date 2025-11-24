const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: false, // Allow frontend JavaScript to access
    secure: process.env.NODE_ENV === 'production', // HTTPS in production
    sameSite: 'lax',
    path: '/',
    domain: 'localhost' // Add domain for local development
  };

  console.log('🔐 Setting cookie with options:', cookieOptions);

  // Set cookie
  res.cookie('token', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token, // Also send token in response for fallback
    data: {
      user
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const { username, password, profile } = req.body;

  console.log('📝 Signup attempt for:', username);

  // Check if user already exists
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return next(new AppError('Username already exists', 400));
  }

  const newUser = await User.create({
    username,
    password,
    profile
  });

  console.log('✅ User created:', newUser.username);
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;

  console.log('🔐 Login attempt for:', username);
  console.log('📋 Request body:', { username, password: '***' });

  if (!username || !password) {
    return next(new AppError('Please provide username and password!', 400));
  }

  const user = await User.findOne({ username }).select('+password');

  if (!user) {
    console.log('❌ User not found:', username);
    return next(new AppError('Incorrect username or password', 401));
  }

  console.log('✅ User found, checking password...');

  const isPasswordCorrect = await user.correctPassword(password, user.password);
  
  if (!isPasswordCorrect) {
    console.log('❌ Incorrect password for user:', username);
    return next(new AppError('Incorrect username or password', 401));
  }

  console.log('✅ Login successful for:', user.username);
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  console.log('🚪 Logout request');
  
  const cookieOptions = {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: false,
    secure: false,
    sameSite: 'lax',
    path: '/',
    domain: 'localhost'
  };
  
  res.cookie('token', 'loggedout', cookieOptions);
  res.status(200).json({ 
    status: 'success',
    message: 'Logged out successfully'
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  let token;

  console.log('🔐 Protect middleware - Checking authentication');
  console.log('📋 Cookies:', req.cookies);
  console.log('📋 Headers:', req.headers);

  // 1) Check for token in cookies (primary)
  if (req.cookies && req.cookies.token && req.cookies.token !== 'loggedout') {
    token = req.cookies.token;
    console.log('✅ Token found in cookies');
  }

  // 2) Check for token in authorization header (fallback)
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    console.log('✅ Token found in authorization header');
  }

  if (!token) {
    console.log('❌ No token found');
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verified for user:', decoded.id);

    // Check if user still exists
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

// Optional: Check if user is authenticated without throwing error
exports.isAuthenticated = catchAsync(async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.token && req.cookies.token !== 'loggedout') {
    token = req.cookies.token;
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);
    req.user = currentUser;
  } catch (error) {
    req.user = null;
  }

  next();
});