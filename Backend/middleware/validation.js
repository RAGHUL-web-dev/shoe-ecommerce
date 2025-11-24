const { body, validationResult } = require('express-validator');
const AppError = require('../utils/appError');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(new AppError(errorMessages.join(', '), 400));
  }
  next();
};

// User validation rules
const validateUserRegistration = [
  body('username')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters long'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

const validateUserLogin = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const validateProduct = [
  body('name').notEmpty().withMessage('Product name is required'),
  body('price').isFloat({ gt: 0 }).withMessage('Price must be greater than 0'),
  body('category').notEmpty().withMessage('Category is required'),
  body('brand').notEmpty().withMessage('Brand is required'),
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateProduct,
  handleValidationErrors
};