/**
 * Error Handler Middleware (TypeScript)
 */

import { Request, Response, NextFunction } from "express";
import { errorResponse, notFoundResponse } from "../utils/apiResponse.js";

interface CustomError extends Error {
  statusCode?: number;
  details?: unknown;
}

export const errorHandler = (
  err: CustomError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): Response => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error(`[Error]: ${message}`);
  console.error(err.stack);

  const errors =
    process.env.NODE_ENV === "development"
      ? { stack: err.stack, details: err.details }
      : undefined;

  return errorResponse(res, message, statusCode, errors);
};

export const notFound = (
  req: Request,
  res: Response,
  _next: NextFunction,
): Response => {
  return notFoundResponse(res, `Route not found - ${req.originalUrl}`);
};
