/**
 * Session Controller
 * HTTP request handlers for Session endpoints (Functional TypeScript)
 */

import { Request, Response } from "express";
import * as sessionService from "@services/sessionService.js";
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  validationErrorResponse,
  paginatedResponse,
  errorResponse,
} from "@utils/apiResponse.js";
import { getErrorMessage } from "@utils/typeGuards.js";
import {
  getIdParam,
  getPaginationParams,
  getIncludeOptions,
  getSessionFilters,
} from "@utils/requestHelpers.js";
import type { CreateSessionInput, UpdateSessionInput } from "../types/index.js";

/**
 * @swagger
 * /api/sessions:
 *   post:
 *     summary: Create a new session with session days
 *     tags: [Sessions]
 */
export const createSession = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    // Extract input data
    const data: CreateSessionInput = req.body;

    // Process
    const session = await sessionService.createSession(data);
    return createdResponse(res, session, "Session created successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (
      message.includes("already exists") ||
      message.includes("required") ||
      message.includes("not found") ||
      message.includes("validation failed") ||
      message.includes("fall within")
    ) {
      return validationErrorResponse(res, { message });
    }
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/sessions:
 *   get:
 *     summary: Get all sessions
 *     tags: [Sessions]
 */
export const getAllSessions = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    // Extract input data
    const { page, limit } = getPaginationParams(req);
    const filters = getSessionFilters(req);

    // Process
    const result = await sessionService.getAllSessions(page, limit, filters);
    return paginatedResponse(
      res,
      result.data,
      page,
      limit,
      result.total,
      "Sessions retrieved successfully",
    );
  } catch (error: unknown) {
    return errorResponse(res, getErrorMessage(error), 500);
  }
};

/**
 * @swagger
 * /api/sessions/{id}:
 *   get:
 *     summary: Get session by ID
 *     tags: [Sessions]
 */
export const getSessionById = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    // Extract input data
    const id = getIdParam(req);
    const include = getIncludeOptions(req);

    // Process
    const session = await sessionService.getSessionById(id, include);
    return successResponse(res, session, "Session retrieved successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) {
      return notFoundResponse(res, message);
    }
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/sessions/{id}:
 *   put:
 *     summary: Update session
 *     tags: [Sessions]
 */
export const updateSession = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    // Extract input data
    const id = getIdParam(req);
    const data: UpdateSessionInput = req.body;

    // Process
    const session = await sessionService.updateSession(id, data);
    return successResponse(res, session, "Session updated successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) {
      return notFoundResponse(res, message);
    }
    if (message.includes("already exists") || message.includes("must be")) {
      return validationErrorResponse(res, { message });
    }
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/sessions/{id}:
 *   delete:
 *     summary: Delete session
 *     tags: [Sessions]
 */
export const deleteSession = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    // Extract input data
    const id = getIdParam(req);

    // Process
    await sessionService.deleteSession(id);
    return successResponse(res, {}, "Session deleted successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) {
      return notFoundResponse(res, message);
    }
    if (message.includes("Cannot delete")) {
      return validationErrorResponse(res, { message });
    }
    return errorResponse(res, message, 500);
  }
};
