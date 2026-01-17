/**
 * Routes for user authentication operations.
 */

const express = require('express');
const router = express.Router();

const {
  register,
  login,
  logout,
  getMe,
  updatePassword,
  refreshToken
} = require('../controllers/auth.controller');

const { protect } = require('../middlewares/auth.middleware');
const { registerValidation, loginValidation } = require('../middlewares/validation.middleware');

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected routes
router.use(protect); // All routes below require authentication

router.post('/logout', logout);
router.get('/me', getMe);
router.put('/update-password', updatePassword);
router.post('/refresh-token', refreshToken);

module.exports = router;
