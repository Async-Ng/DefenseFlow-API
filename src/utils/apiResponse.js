/**
 * Standard API Response Utility
 * Provides consistent response structure across all endpoints
 */

/**
 * Success response format
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {String} message - Success message
 * @param {Number} statusCode - HTTP status code (default: 200)
 * @param {Object} meta - Additional metadata (pagination, etc.)
 */
export const successResponse = (
  res,
  data = null,
  message = "Success",
  statusCode = 200,
  meta = null
) => {
  const response = {
    success: true,
    message,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Error response format
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Number} statusCode - HTTP status code (default: 400)
 * @param {Object} errors - Detailed error information
 */
export const errorResponse = (
  res,
  message = "Error occurred",
  statusCode = 400,
  errors = null
) => {
  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Paginated response format
 * @param {Object} res - Express response object
 * @param {Array} data - Array of data items
 * @param {Number} page - Current page number
 * @param {Number} limit - Items per page
 * @param {Number} total - Total number of items
 * @param {String} message - Success message
 */
export const paginatedResponse = (
  res,
  data,
  page,
  limit,
  total,
  message = "Success"
) => {
  const totalPages = Math.ceil(total / limit);

  return successResponse(res, data, message, 200, {
    pagination: {
      currentPage: page,
      pageSize: limit,
      totalItems: total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  });
};

/**
 * Created response (201)
 * @param {Object} res - Express response object
 * @param {Object} data - Created resource data
 * @param {String} message - Success message
 */
export const createdResponse = (
  res,
  data,
  message = "Resource created successfully"
) => {
  return successResponse(res, data, message, 201);
};

/**
 * No content response (204)
 * @param {Object} res - Express response object
 */
export const noContentResponse = (res) => {
  return res.status(204).send();
};

/**
 * Not found response (404)
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 */
export const notFoundResponse = (res, message = "Resource not found") => {
  return errorResponse(res, message, 404);
};

/**
 * Validation error response (422)
 * @param {Object} res - Express response object
 * @param {Object} errors - Validation errors
 * @param {String} message - Error message
 */
export const validationErrorResponse = (
  res,
  errors,
  message = "Validation failed"
) => {
  return errorResponse(res, message, 422, errors);
};

/**
 * Unauthorized response (401)
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 */
export const unauthorizedResponse = (res, message = "Unauthorized access") => {
  return errorResponse(res, message, 401);
};
  
/**
 * Forbidden response (403)
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 */
export const forbiddenResponse = (res, message = "Forbidden access") => {
  return errorResponse(res, message, 403);
};

/**
 * Internal server error response (500)
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 */
export const internalErrorResponse = (
  res,
  message = "Internal server error"
) => {
  return errorResponse(res, message, 500);
};
