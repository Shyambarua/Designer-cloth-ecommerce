/**
 * Public routes for browsing products.
 */

const express = require('express');
const router = express.Router();

const {
  getAllProducts,
  getProduct,
  searchProducts,
  getFeaturedProducts,
  getNewArrivals,
  getBestSellers,
  getRelatedProducts,
  getProductsByCategory
} = require('../controllers/product.controller');

const { paginationValidation } = require('../middlewares/validation.middleware');

// Special routes (must be before :id route)
router.get('/search', paginationValidation, searchProducts);
router.get('/featured', getFeaturedProducts);
router.get('/new-arrivals', getNewArrivals);
router.get('/best-sellers', getBestSellers);
router.get('/category/:slug', paginationValidation, getProductsByCategory);

// Product routes
router.get('/', paginationValidation, getAllProducts);
router.get('/:id', getProduct);
router.get('/:id/related', getRelatedProducts);

module.exports = router;
