/**
 * API Response Utilities (TypeScript)
 */

import { Response } from "express";

// Response type definitions
interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

interface ApiErrorResponse {
  success: boolean;
  message: string;
  errors?: Record<string, unknown>;
}

/**
 * Success response format
 */
export const successResponse = <T = unknown>(
  res: Response,
  data: T | null = null,
  message: string = "Success",
  statusCode: number = 200,
  meta: Record<string, unknown> | null = null,
): Response => {
  const response: ApiResponse<T | null> = {
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
 */
export const errorResponse = (
  res: Response,
  message: string = "Error occurred",
  statusCode: number = 400,
  errors: Record<string, unknown> | null = null,
): Response => {
  const response: ApiErrorResponse = {
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
 */
export const paginatedResponse = <T = unknown>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  message: string = "Success",
): Response => {
  const totalPages = Math.ceil(total / limit);

  return successResponse<T[]>(res, data, message, 200, {
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
 */
export const createdResponse = <T = unknown>(
  res: Response,
  data: T,
  message: string = "Resource created successfully",
): Response => {
  return successResponse<T>(res, data, message, 201);
};

/**
 * No content response (204)
 */
export const noContentResponse = (res: Response): Response => {
  return res.status(204).send();
};

/**
 * Not found response (404)
 */
export const notFoundResponse = (
  res: Response,
  message: string = "Resource not found",
): Response => {
  return errorResponse(res, message, 404);
};

/**
 * Validation error response (422)
 */
export const validationErrorResponse = (
  res: Response,
  errors: Record<string, unknown>,
  message: string = "Validation failed",
): Response => {
  return errorResponse(res, message, 422, errors);
};

/**
 * Unauthorized response (401)
 */
export const unauthorizedResponse = (
  res: Response,
  message: string = "Unauthorized access",
): Response => {
  return errorResponse(res, message, 401);
};

/**
 * Forbidden response (403)
 */
export const forbiddenResponse = (
  res: Response,
  message: string = "Forbidden access",
): Response => {
  return errorResponse(res, message, 403);
};

/**
 * Internal server error response (500)
 */
export const internalErrorResponse = (
  res: Response,
  message: string = "Internal server error",
): Response => {
  return errorResponse(res, message, 500);
};
