/**
 * Routes for shopping cart management.
 */

const express = require('express');
const router = express.Router();

const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyCoupon,
  removeCoupon
} = require('../controllers/cart.controller');

const { protect } = require('../middlewares/auth.middleware');
const { addToCartValidation, updateCartItemValidation } = require('../middlewares/validation.middleware');

// All routes require authentication
router.use(protect);

// Cart routes
router.get('/', getCart);
router.post('/items', addToCartValidation, addToCart);
router.put('/items/:itemId', updateCartItemValidation, updateCartItem);
router.delete('/items/:itemId', removeFromCart);
router.delete('/', clearCart);

// Coupon routes
router.post('/apply-coupon', applyCoupon);
router.delete('/coupon', removeCoupon);

module.exports = router;
