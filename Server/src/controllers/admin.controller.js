/**
 * Handles admin-only operations including
 * product management, order management, and
 * user management.
 */

const User = require('../models/User.model');
const Product = require('../models/Product.model');
const Category = require('../models/Category.model');
const Order = require('../models/Order.model');
const { sendSuccess, sendCreated, sendNotFound, sendError, sendPaginated } = require('../utils/response');
const { parsePaginationParams, calculatePagination } = require('../utils/pagination');

// Dashboard

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/admin/dashboard
 * @access  Admin
 */
const getDashboardStats = async (req, res, next) => {
  try {
    // Get counts
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      orderStats,
      recentOrders
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Product.countDocuments({ status: 'active' }),
      Order.countDocuments(),
      Order.getStats(),
      Order.find()
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    return sendSuccess(res, 200, 'Dashboard stats retrieved', {
      stats: {
        totalUsers,
        totalProducts,
        totalOrders,
        ...orderStats
      },
      ordersByStatus: ordersByStatus.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      recentOrders
    });
  } catch (error) {
    next(error);
  }
};

// Product Management

/**
 * @desc    Create product
 * @route   POST /api/admin/products
 * @access  Admin
 */
const createProduct = async (req, res, next) => {
  try {
    const productData = {
      ...req.body,
      createdBy: req.user._id
    };

    const product = await Product.create(productData);

    await product.populate('category', 'name slug');

    return sendCreated(res, 'Product created successfully', { product });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update product
 * @route   PUT /api/admin/products/:id
 * @access  Admin
 */
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    ).populate('category', 'name slug');

    if (!product) {
      return sendNotFound(res, 'Product');
    }

    return sendSuccess(res, 200, 'Product updated', { product });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete product
 * @route   DELETE /api/admin/products/:id
 * @access  Admin
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndUpdate(
      id,
      { status: 'archived' },
      { new: true }
    );

    if (!product) {
      return sendNotFound(res, 'Product');
    }

    return sendSuccess(res, 200, 'Product deleted');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all products (including drafts)
 * @route   GET /api/admin/products
 * @access  Admin
 */
const getAllProducts = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const { status, category } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const totalItems = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .populate('category', 'name slug')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const pagination = calculatePagination(totalItems, page, limit);

    return sendPaginated(res, 'Products retrieved', products, pagination);
  } catch (error) {
    next(error);
  }
};

// Category Management

/**
 * @desc    Create category
 * @route   POST /api/admin/categories
 * @access  Admin
 */
const createCategory = async (req, res, next) => {
  try {
    const category = await Category.create(req.body);

    return sendCreated(res, 'Category created successfully', { category });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update category
 * @route   PUT /api/admin/categories/:id
 * @access  Admin
 */
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return sendNotFound(res, 'Category');
    }

    return sendSuccess(res, 200, 'Category updated', { category });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete category
 * @route   DELETE /api/admin/categories/:id
 * @access  Admin
 */
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if category has products
    const productCount = await Product.countDocuments({ category: id });
    if (productCount > 0) {
      return sendError(res, 400, `Cannot delete category with ${productCount} products`);
    }

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return sendNotFound(res, 'Category');
    }

    return sendSuccess(res, 200, 'Category deleted');
  } catch (error) {
    next(error);
  }
};

// Order Management

/**
 * @desc    Get all orders
 * @route   GET /api/admin/orders
 * @access  Admin
 */
const getAllOrders = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const { status, paymentStatus } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (paymentStatus) filter['payment.status'] = paymentStatus;

    const totalItems = await Order.countDocuments(filter);

    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const pagination = calculatePagination(totalItems, page, limit);

    return sendPaginated(res, 'Orders retrieved', orders, pagination);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single order
 * @route   GET /api/admin/orders/:id
 * @access  Admin
 */
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('user', 'name email phone')
      .populate('items.product', 'name slug images');

    if (!order) {
      return sendNotFound(res, 'Order');
    }

    return sendSuccess(res, 200, 'Order retrieved', { order });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update order status
 * @route   PUT /api/admin/orders/:id/status
 * @access  Admin
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note, trackingNumber, carrier } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return sendNotFound(res, 'Order');
    }

    // Update status
    order.updateStatus(status, note);

    // Update shipping details if provided
    if (trackingNumber) order.shipping.trackingNumber = trackingNumber;
    if (carrier) order.shipping.carrier = carrier;

    await order.save();

    return sendSuccess(res, 200, 'Order status updated', { order });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update payment status
 * @route   PUT /api/admin/orders/:id/payment
 * @access  Admin
 */
const updatePaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, transactionId } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return sendNotFound(res, 'Order');
    }

    order.payment.status = status;
    if (transactionId) order.payment.transactionId = transactionId;
    if (status === 'completed') order.payment.paidAt = new Date();

    await order.save();

    return sendSuccess(res, 200, 'Payment status updated', { order });
  } catch (error) {
    next(error);
  }
};

// User Management

/**
 * @desc    Get all users
 * @route   GET /api/admin/users
 * @access  Admin
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const { role, isActive } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const totalItems = await User.countDocuments(filter);

    const users = await User.find(filter)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const pagination = calculatePagination(totalItems, page, limit);

    return sendPaginated(res, 'Users retrieved', users, pagination);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user by ID
 * @route   GET /api/admin/users/:id
 * @access  Admin
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');

    if (!user) {
      return sendNotFound(res, 'User');
    }

    // Get user's order count
    const orderCount = await Order.countDocuments({ user: id });

    return sendSuccess(res, 200, 'User retrieved', { 
      user,
      orderCount 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user status
 * @route   PUT /api/admin/users/:id/status
 * @access  Admin
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return sendNotFound(res, 'User');
    }

    return sendSuccess(res, 200, `User ${isActive ? 'activated' : 'deactivated'}`, { user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user role
 * @route   PUT /api/admin/users/:id/role
 * @access  Admin
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Prevent changing own role
    if (id === req.user._id.toString()) {
      return sendError(res, 400, 'You cannot change your own role');
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return sendNotFound(res, 'User');
    }

    return sendSuccess(res, 200, 'User role updated', { user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole
};
