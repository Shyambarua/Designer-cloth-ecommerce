/**
 * Public routes for browsing categories.
 */

const express = require('express');
const router = express.Router();

const {
  getAllCategories,
  getCategoryTree,
  getCategory,
  getChildCategories
} = require('../controllers/category.controller');

// Category routes
router.get('/', getAllCategories);
router.get('/tree', getCategoryTree);
router.get('/:slug', getCategory);
router.get('/:slug/children', getChildCategories);

module.exports = router;
