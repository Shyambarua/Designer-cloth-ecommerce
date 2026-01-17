/**
 * Middleware for protecting routes with JWT authentication
 * and role-based access control.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { AppError } = require('../utils/errors');

/**
 * Protect routes - Verify JWT token
 * Attaches user to request object if valid
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Check for token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }
    // 2. Check for token in cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // 3. If no token found, return unauthorized
    if (!token) {
      return next(
        new AppError('You are not logged in. Please log in to access.', 401)
      );
    }

    // 4. Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return next(new AppError('Invalid token. Please log in again.', 401));
      }
      if (error.name === 'TokenExpiredError') {
        return next(new AppError('Your session has expired. Please log in again.', 401));
      }
      throw error;
    }

    // 5. Check if user still exists
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return next(
        new AppError('The user belonging to this token no longer exists.', 401)
      );
    }

    // 6. Check if user is active
    if (!user.isActive) {
      return next(
        new AppError('Your account has been deactivated. Please contact support.', 401)
      );
    }

    // 7. Attach user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Restrict access to specific roles
 * @param  {...string} roles - Allowed roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if user role is in allowed roles
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403)
      );
    }
    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 * Attaches user to request if token is valid
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Token invalid, but don't fail - just continue without user
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  protect,
  restrictTo,
  optionalAuth
};
