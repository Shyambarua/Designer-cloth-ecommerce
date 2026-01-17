/**
 * Standardized API response format helpers
 * for consistent JSON responses.
 */

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {Object} data - Response data
 */
const sendSuccess = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send created response (201)
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Object} data - Created resource data
 */
const sendCreated = (res, message, data) => {
  return sendSuccess(res, 201, message, data);
};

/**
 * Send OK response (200)
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Object} data - Response data
 */
const sendOK = (res, message, data) => {
  return sendSuccess(res, 200, message, data);
};

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Array} items - Array of items
 * @param {Object} pagination - Pagination info
 */
const sendPaginated = (res, message, items, pagination) => {
  return res.status(200).json({
    success: true,
    message,
    data: items,
    pagination: {
      currentPage: pagination.page,
      totalPages: pagination.totalPages,
      totalItems: pagination.totalItems,
      itemsPerPage: pagination.limit,
      hasNextPage: pagination.page < pagination.totalPages,
      hasPrevPage: pagination.page > 1
    }
  });
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Object} errors - Validation errors (optional)
 */
const sendError = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    message
  };

  if (errors !== null) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send not found response (404)
 * @param {Object} res - Express response object
 * @param {string} resource - Resource name
 */
const sendNotFound = (res, resource = 'Resource') => {
  return sendError(res, 404, `${resource} not found`);
};

/**
 * Send unauthorized response (401)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const sendUnauthorized = (res, message = 'Unauthorized access') => {
  return sendError(res, 401, message);
};

/**
 * Send forbidden response (403)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const sendForbidden = (res, message = 'Access forbidden') => {
  return sendError(res, 403, message);
};

/**
 * Send bad request response (400)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} errors - Validation errors
 */
const sendBadRequest = (res, message = 'Bad request', errors = null) => {
  return sendError(res, 400, message, errors);
};

module.exports = {
  sendSuccess,
  sendCreated,
  sendOK,
  sendPaginated,
  sendError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendBadRequest
};
