/**
 * Helper functions for generating and verifying
 * JSON Web Tokens.
 */

const jwt = require('jsonwebtoken');

/**
 * Generate JWT access token
 * @param {Object} payload - Data to encode in token
 * @returns {string} JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

/**
 * Generate JWT for a user
 * @param {Object} user - User document
 * @returns {string} JWT token
 */
const generateUserToken = (user) => {
  return generateToken({
    id: user._id,
    email: user.email,
    role: user.role
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Decode JWT token without verification
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded payload or null
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Set JWT token as HTTP-only cookie
 * @param {Object} res - Express response object
 * @param {string} token - JWT token
 */
const setTokenCookie = (res, token) => {
  const cookieOptions = {
    expires: new Date(
      Date.now() +
        (parseInt(process.env.JWT_COOKIE_EXPIRES_IN) || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // Prevents XSS attacks
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax' // CSRF protection
  };

  res.cookie('token', token, cookieOptions);
};

/**
 * Clear JWT cookie
 * @param {Object} res - Express response object
 */
const clearTokenCookie = (res) => {
  res.cookie('token', '', {
    expires: new Date(0),
    httpOnly: true
  });
};

module.exports = {
  generateToken,
  generateUserToken,
  verifyToken,
  decodeToken,
  setTokenCookie,
  clearTokenCookie
};
