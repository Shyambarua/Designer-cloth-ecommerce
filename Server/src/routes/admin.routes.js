/**
 * Routes for admin-only operations.
 */

const express = require('express');
const router = express.Router();

const {
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
} = require('../controllers/admin.controller');

const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { 
  createProductValidation, 
  updateProductValidation,
  createCategoryValidation,
  paginationValidation,
  mongoIdValidation
} = require('../middlewares/validation.middleware');
const { uploadProductImages, handleUploadError } = require('../middlewares/upload.middleware');

// All routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

// Dashboard
router.get('/dashboard', getDashboardStats);

// Product management
router.get('/products', paginationValidation, getAllProducts);
router.post('/products', createProductValidation, createProduct);
router.put('/products/:id', updateProductValidation, updateProduct);
router.delete('/products/:id', mongoIdValidation, deleteProduct);

// Product image upload
router.post('/products/:id/images', mongoIdValidation, uploadProductImages, handleUploadError, async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'Please upload at least one image' });
  }
  
  const imageUrls = req.files.map((file, index) => ({
    url: `/uploads/products/${file.filename}`,
    alt: `Product image ${index + 1}`,
    isPrimary: index === 0
  }));
  
  res.status(200).json({
    success: true,
    message: 'Images uploaded successfully',
    data: { images: imageUrls }
  });
});

// Category management
router.post('/categories', createCategoryValidation, createCategory);
router.put('/categories/:id', mongoIdValidation, updateCategory);
router.delete('/categories/:id', mongoIdValidation, deleteCategory);

// Order management
router.get('/orders', paginationValidation, getAllOrders);
router.get('/orders/:id', mongoIdValidation, getOrderById);
router.put('/orders/:id/status', mongoIdValidation, updateOrderStatus);
router.put('/orders/:id/payment', mongoIdValidation, updatePaymentStatus);

// User management
router.get('/users', paginationValidation, getAllUsers);
router.get('/users/:id', mongoIdValidation, getUserById);
router.put('/users/:id/status', mongoIdValidation, updateUserStatus);
router.put('/users/:id/role', mongoIdValidation, updateUserRole);

module.exports = router;
