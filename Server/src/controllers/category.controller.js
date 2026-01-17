/**
  * Handles category operations for public access.
 */

const Category = require('../models/Category.model');
const { sendSuccess, sendNotFound } = require('../utils/response');

/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Public
 */
const getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate('productCount')
      .sort({ sortOrder: 1, name: 1 });

    return sendSuccess(res, 200, 'Categories retrieved successfully', { categories });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get category tree (hierarchical)
 * @route   GET /api/categories/tree
 * @access  Public
 */
const getCategoryTree = async (req, res, next) => {
  try {
    const tree = await Category.getTree();

    return sendSuccess(res, 200, 'Category tree retrieved', { categories: tree });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single category by slug
 * @route   GET /api/categories/:slug
 * @access  Public
 */
const getCategory = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({ slug, isActive: true })
      .populate('children')
      .populate('productCount');

    if (!category) {
      return sendNotFound(res, 'Category');
    }

    // Get ancestors for breadcrumb
    const ancestors = await Category.getWithAncestors(category._id);

    return sendSuccess(res, 200, 'Category retrieved', { 
      category,
      breadcrumbs: ancestors.map(c => ({ name: c.name, slug: c.slug }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get child categories
 * @route   GET /api/categories/:slug/children
 * @access  Public
 */
const getChildCategories = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const parentCategory = await Category.findOne({ slug, isActive: true });
    if (!parentCategory) {
      return sendNotFound(res, 'Category');
    }

    const children = await Category.find({ 
      parent: parentCategory._id,
      isActive: true 
    })
      .populate('productCount')
      .sort({ sortOrder: 1 });

    return sendSuccess(res, 200, 'Child categories retrieved', { categories: children });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCategories,
  getCategoryTree,
  getCategory,
  getChildCategories
};
