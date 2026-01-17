/**
 * Express-validator based validation schemas
 * for request body, query, and params validation.
 */

const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('../utils/errors');

/**
 * Handle validation errors from express-validator
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => ({
      field: err.path,
      message: err.msg
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  
  next();
};
// Auth Validation Rules
const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/\d/).withMessage('Password must contain a number'),
  
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  
  handleValidationErrors
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  handleValidationErrors
];
// Product Validation Rules
const createProductValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ max: 200 }).withMessage('Name cannot exceed 200 characters'),
  
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  
  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  
  body('category')
    .notEmpty().withMessage('Category is required')
    .isMongoId().withMessage('Invalid category ID'),
  
  body('salePrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Sale price must be a positive number'),
  
  body('variants')
    .optional()
    .isArray().withMessage('Variants must be an array'),
  
  body('variants.*.size')
    .optional()
    .isIn(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Free Size'])
    .withMessage('Invalid size'),
  
  body('variants.*.color')
    .optional()
    .notEmpty().withMessage('Color is required for variants'),
  
  body('variants.*.stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  
  handleValidationErrors
];

const updateProductValidation = [
  param('id')
    .isMongoId().withMessage('Invalid product ID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Name cannot exceed 200 characters'),
  
  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  
  body('category')
    .optional()
    .isMongoId().withMessage('Invalid category ID'),
  
  handleValidationErrors
];
// Cart Validation Rules
const addToCartValidation = [
  body('productId')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Invalid product ID'),
  
  body('quantity')
    .optional()
    .isInt({ min: 1, max: 10 }).withMessage('Quantity must be between 1 and 10'),
  
  body('variant.size')
    .notEmpty().withMessage('Size is required'),
  
  body('variant.color')
    .notEmpty().withMessage('Color is required'),
  
  handleValidationErrors
];

const updateCartItemValidation = [
  param('itemId')
    .isMongoId().withMessage('Invalid item ID'),
  
  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isInt({ min: 0, max: 10 }).withMessage('Quantity must be between 0 and 10'),
  
  handleValidationErrors
];
// Order Validation Rules
const createOrderValidation = [
  body('shippingAddress.name')
    .trim()
    .notEmpty().withMessage('Recipient name is required'),
  
  body('shippingAddress.phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9]{10}$/).withMessage('Please provide a valid 10-digit phone number'),
  
  body('shippingAddress.street')
    .trim()
    .notEmpty().withMessage('Street address is required'),
  
  body('shippingAddress.city')
    .trim()
    .notEmpty().withMessage('City is required'),
  
  body('shippingAddress.state')
    .trim()
    .notEmpty().withMessage('State is required'),
  
  body('shippingAddress.zipCode')
    .trim()
    .notEmpty().withMessage('ZIP code is required')
    .matches(/^[0-9]{6}$/).withMessage('Please provide a valid 6-digit PIN code'),
  
  body('paymentMethod')
    .notEmpty().withMessage('Payment method is required')
    .isIn(['cod', 'card', 'upi', 'netbanking', 'wallet'])
    .withMessage('Invalid payment method'),
  
  handleValidationErrors
];
// Category Validation Rules
const createCategoryValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Category name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  
  body('parent')
    .optional()
    .isMongoId().withMessage('Invalid parent category ID'),
  
  handleValidationErrors
];
// Common Validation Rules
const mongoIdValidation = [
  param('id')
    .isMongoId().withMessage('Invalid ID format'),
  
  handleValidationErrors
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  query('sort')
    .optional()
    .isString().withMessage('Sort must be a string'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  registerValidation,
  loginValidation,
  createProductValidation,
  updateProductValidation,
  addToCartValidation,
  updateCartItemValidation,
  createOrderValidation,
  createCategoryValidation,
  mongoIdValidation,
  paginationValidation
};
