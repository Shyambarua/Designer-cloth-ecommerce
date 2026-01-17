/**
 * Handles user registration, login, logout,
 * and password management.
 */

const User = require('../models/User.model');
const { generateUserToken, setTokenCookie, clearTokenCookie } = require('../utils/jwt');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');
const { AppError } = require('../utils/errors');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return sendError(res, 400, 'An account with this email already exists');
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password
    });

    // Generate JWT token
    const token = generateUserToken(user);

    // Set token cookie
    setTokenCookie(res, token);

    // Send response
    return sendCreated(res, 'Registration successful', {
      user: user.toPublicProfile(),
      token
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email (include password for comparison)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return sendError(res, 401, 'Invalid email or password');
    }

    // Check if account is active
    if (!user.isActive) {
      return sendError(res, 401, 'Your account has been deactivated. Please contact support.');
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return sendError(res, 401, 'Invalid email or password');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate JWT token
    const token = generateUserToken(user);

    // Set token cookie
    setTokenCookie(res, token);

    // Send response
    return sendSuccess(res, 200, 'Login successful', {
      user: user.toPublicProfile(),
      token
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res, next) => {
  try {
    // Clear token cookie
    clearTokenCookie(res);

    return sendSuccess(res, 200, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    return sendSuccess(res, 200, 'User profile retrieved', {
      user: user.toPublicProfile()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update password
 * @route   PUT /api/auth/update-password
 * @access  Private
 */
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return sendError(res, 401, 'Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new token
    const token = generateUserToken(user);
    setTokenCookie(res, token);

    return sendSuccess(res, 200, 'Password updated successfully', { token });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh token
 * @route   POST /api/auth/refresh-token
 * @access  Private
 */
const refreshToken = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user || !user.isActive) {
      return sendError(res, 401, 'User not found or inactive');
    }

    // Generate new token
    const token = generateUserToken(user);
    setTokenCookie(res, token);

    return sendSuccess(res, 200, 'Token refreshed', { token });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  updatePassword,
  refreshToken
};
