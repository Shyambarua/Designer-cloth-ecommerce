/**
 * Routes for order management (user side).
 */

const express = require('express');
const router = express.Router();

const {
  createOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
  trackOrder,
  reorder
} = require('../controllers/order.controller');

const { protect } = require('../middlewares/auth.middleware');
const { createOrderValidation, paginationValidation } = require('../middlewares/validation.middleware');

// All routes require authentication
router.use(protect);

// Order routes
router.post('/', createOrderValidation, createOrder);
router.get('/', paginationValidation, getMyOrders);
router.get('/:id', getOrder);
router.put('/:id/cancel', cancelOrder);
router.get('/:id/track', trackOrder);
router.post('/:id/reorder', reorder);

module.exports = router;
