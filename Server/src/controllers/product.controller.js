/**
 * Handles product CRUD operations, search,
 * and filtering.
 */

const Product = require('../models/Product.model');
const Category = require('../models/Category.model');
const { sendSuccess, sendCreated, sendNotFound, sendPaginated } = require('../utils/response');
const { parsePaginationParams, parseSortParams, calculatePagination } = require('../utils/pagination');

/**
 * @desc    Get all products with filtering, sorting, and pagination
 * @route   GET /api/products
 * @access  Public
 */
const getAllProducts = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const sort = parseSortParams(req.query.sort, {
      price: true,
      name: true,
      createdAt: true,
      rating: true
    });

    // Build filter query
    const filter = { status: 'active' };

    // Category filter
    if (req.query.category) {
      const category = await Category.findOne({ slug: req.query.category });
      if (category) {
        filter.category = category._id;
      }
    }

    // Price range filter
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = parseFloat(req.query.maxPrice);
    }

    // On sale filter
    if (req.query.onSale === 'true') {
      filter.salePrice = { $exists: true, $gt: 0 };
    }

    // Featured filter
    if (req.query.featured === 'true') {
      filter.isFeatured = true;
    }

    // New arrivals filter
    if (req.query.newArrivals === 'true') {
      filter.isNewArrival = true;
    }

    // Brand filter
    if (req.query.brand) {
      filter.brand = { $regex: req.query.brand, $options: 'i' };
    }

    // Size filter
    if (req.query.size) {
      filter['variants.size'] = req.query.size;
    }

    // Color filter
    if (req.query.color) {
      filter['variants.color'] = { $regex: req.query.color, $options: 'i' };
    }

    // In stock filter
    if (req.query.inStock === 'true') {
      filter.totalStock = { $gt: 0 };
    }

    // Get total count
    const totalItems = await Product.countDocuments(filter);

    // Get products
    const products = await Product.find(filter)
      .populate('category', 'name slug')
      .select('-variants.sku -seo')
      .skip(skip)
      .limit(limit)
      .sort(sort)
      .lean();

    const pagination = calculatePagination(totalItems, page, limit);

    return sendPaginated(res, 'Products retrieved successfully', products, pagination);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product by ID or slug
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Try to find by ID first, then by slug
    let product;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(id).populate('category', 'name slug');
    } else {
      product = await Product.findOne({ slug: id }).populate('category', 'name slug');
    }

    if (!product || product.status !== 'active') {
      return sendNotFound(res, 'Product');
    }

    return sendSuccess(res, 200, 'Product retrieved successfully', { product });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search products
 * @route   GET /api/products/search
 * @access  Public
 */
const searchProducts = async (req, res, next) => {
  try {
    const { q } = req.query;
    const { page, limit, skip } = parsePaginationParams(req.query);

    if (!q || q.trim().length < 2) {
      return sendSuccess(res, 200, 'Search results', { products: [], pagination: {} });
    }

    // Text search
    const filter = {
      $text: { $search: q },
      status: 'active'
    };

    const totalItems = await Product.countDocuments(filter);

    const products = await Product.find(filter, { score: { $meta: 'textScore' } })
      .populate('category', 'name slug')
      .select('-variants.sku -seo')
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit)
      .lean();

    const pagination = calculatePagination(totalItems, page, limit);

    return sendPaginated(res, 'Search results', products, pagination);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get featured products
 * @route   GET /api/products/featured
 * @access  Public
 */
const getFeaturedProducts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

    const products = await Product.getFeatured(limit);

    return sendSuccess(res, 200, 'Featured products retrieved', { products });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get new arrivals
 * @route   GET /api/products/new-arrivals
 * @access  Public
 */
const getNewArrivals = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

    const products = await Product.find({ 
      isNewArrival: true, 
      status: 'active' 
    })
      .populate('category', 'name slug')
      .limit(limit)
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'New arrivals retrieved', { products });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get best sellers
 * @route   GET /api/products/best-sellers
 * @access  Public
 */
const getBestSellers = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

    const products = await Product.find({ 
      isBestSeller: true, 
      status: 'active' 
    })
      .populate('category', 'name slug')
      .limit(limit)
      .sort({ numReviews: -1 });

    return sendSuccess(res, 200, 'Best sellers retrieved', { products });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get related products
 * @route   GET /api/products/:id/related
 * @access  Public
 */
const getRelatedProducts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 4;

    const product = await Product.findById(id);
    if (!product) {
      return sendNotFound(res, 'Product');
    }

    // Find products in same category, excluding current product
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: id },
      status: 'active'
    })
      .populate('category', 'name slug')
      .limit(limit)
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Related products retrieved', { products: relatedProducts });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get products by category
 * @route   GET /api/products/category/:slug
 * @access  Public
 */
const getProductsByCategory = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { page, limit, skip } = parsePaginationParams(req.query);
    const sort = parseSortParams(req.query.sort);

    const category = await Category.findOne({ slug });
    if (!category) {
      return sendNotFound(res, 'Category');
    }

    const filter = {
      category: category._id,
      status: 'active'
    };

    const totalItems = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .populate('category', 'name slug')
      .skip(skip)
      .limit(limit)
      .sort(sort)
      .lean();

    const pagination = calculatePagination(totalItems, page, limit);

    return sendPaginated(res, `Products in ${category.name}`, products, pagination);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProduct,
  searchProducts,
  getFeaturedProducts,
  getNewArrivals,
  getBestSellers,
  getRelatedProducts,
  getProductsByCategory
};
