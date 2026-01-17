/**
 * Routes for user profile and address management.
 */

const express = require('express');
const router = express.Router();

const {
  getProfile,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} = require('../controllers/user.controller');

const { protect } = require('../middlewares/auth.middleware');
const { uploadAvatar, handleUploadError } = require('../middlewares/upload.middleware');

// All routes require authentication
router.use(protect);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Avatar upload
router.post('/avatar', uploadAvatar, handleUploadError, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload a file' });
  }
  
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  
  res.status(200).json({
    success: true,
    message: 'Avatar uploaded successfully',
    data: { avatarUrl }
  });
});

// Address routes
router.get('/addresses', getAddresses);
router.post('/addresses', addAddress);
router.put('/addresses/:addressId', updateAddress);
router.delete('/addresses/:addressId', deleteAddress);
router.put('/addresses/:addressId/default', setDefaultAddress);

module.exports = router;
