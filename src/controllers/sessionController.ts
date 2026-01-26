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
import type {
  CreateSessionInput,
  UpdateSessionInput,
  SessionFilters,
} from "../types/index.js";

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
    const data: CreateSessionInput = req.body;
    const session = await sessionService.createSession(data);
    return createdResponse(res, session, "Session created successfully");
  } catch (error: any) {
    if (
      error.message.includes("already exists") ||
      error.message.includes("required") ||
      error.message.includes("not found") ||
      error.message.includes("validation failed") ||
      error.message.includes("fall within")
    ) {
      return validationErrorResponse(res, { message: error.message });
    }
    return errorResponse(res, error.message, 500);
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const filters: SessionFilters = {
      semesterId: req.query.semesterId
        ? parseInt(req.query.semesterId as string)
        : undefined,
      sessionCode: req.query.sessionCode as string,
      type: req.query.type as "Main" | "Resit",
    };

    const result = await sessionService.getAllSessions(page, limit, filters);
    return paginatedResponse(
      res,
      result.data,
      page,
      limit,
      result.total,
      "Sessions retrieved successfully",
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
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
    const include: any = {};
    if (req.query.include) {
      const includes = (req.query.include as string).split(",");
      includes.forEach((inc) => {
        include[inc.trim()] = true;
      });
    }

    const session = await sessionService.getSessionById(
      parseInt(req.params.id),
      include,
    );
    return successResponse(res, session, "Session retrieved successfully");
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return notFoundResponse(res, error.message);
    }
    return errorResponse(res, error.message, 500);
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
    const data: UpdateSessionInput = req.body;
    const session = await sessionService.updateSession(
      parseInt(req.params.id),
      data,
    );
    return successResponse(res, session, "Session updated successfully");
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return notFoundResponse(res, error.message);
    }
    if (
      error.message.includes("already exists") ||
      error.message.includes("must be")
    ) {
      return validationErrorResponse(res, { message: error.message });
    }
    return errorResponse(res, error.message, 500);
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
    await sessionService.deleteSession(parseInt(req.params.id));
    return successResponse(res, null, "Session deleted successfully");
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return notFoundResponse(res, error.message);
    }
    if (error.message.includes("Cannot delete")) {
      return validationErrorResponse(res, { message: error.message });
    }
    return errorResponse(res, error.message, 500);
  }
};
