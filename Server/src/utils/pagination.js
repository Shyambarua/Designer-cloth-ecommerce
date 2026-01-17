/**
 * Helper functions for paginating database queries.
 */

/**
 * Parse pagination parameters from request query
 * @param {Object} query - Express request query object
 * @returns {Object} Pagination parameters
 */
const parsePaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Parse sort parameters from request query
 * @param {string} sortQuery - Sort query string (e.g., "-createdAt,name")
 * @param {Object} allowedFields - Object of allowed sort fields
 * @returns {Object} MongoDB sort object
 */
const parseSortParams = (sortQuery, allowedFields = {}) => {
  if (!sortQuery) {
    return { createdAt: -1 }; // Default: newest first
  }

  const sortFields = sortQuery.split(',');
  const sortObj = {};

  for (const field of sortFields) {
    const isDescending = field.startsWith('-');
    const fieldName = isDescending ? field.substring(1) : field;

    // Only allow specified fields or default fields
    if (Object.keys(allowedFields).length === 0 || allowedFields[fieldName]) {
      sortObj[fieldName] = isDescending ? -1 : 1;
    }
  }

  // Default if no valid sort fields
  if (Object.keys(sortObj).length === 0) {
    return { createdAt: -1 };
  }

  return sortObj;
};

/**
 * Calculate pagination metadata
 * @param {number} totalItems - Total number of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Pagination metadata
 */
const calculatePagination = (totalItems, page, limit) => {
  const totalPages = Math.ceil(totalItems / limit);

  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null
  };
};

/**
 * Apply pagination to a Mongoose query
 * @param {Object} query - Mongoose query object
 * @param {number} skip - Number of documents to skip
 * @param {number} limit - Number of documents to return
 * @param {Object} sort - Sort object
 * @returns {Object} Modified query
 */
const applyPagination = (query, { skip, limit, sort }) => {
  return query.skip(skip).limit(limit).sort(sort);
};

/**
 * Create paginated response data
 * @param {Array} items - Array of items
 * @param {number} totalItems - Total count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Paginated response object
 */
const createPaginatedResponse = (items, totalItems, page, limit) => {
  const pagination = calculatePagination(totalItems, page, limit);

  return {
    items,
    pagination
  };
};

module.exports = {
  parsePaginationParams,
  parseSortParams,
  calculatePagination,
  applyPagination,
  createPaginatedResponse
};
