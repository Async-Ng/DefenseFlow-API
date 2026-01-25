import { errorResponse, notFoundResponse } from "../utils/apiResponse.js";

export const errorHandler = (err, req, res, next) => {
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

export const notFound = (req, res, next) => {
  return notFoundResponse(res, `Route not found - ${req.originalUrl}`);
};
