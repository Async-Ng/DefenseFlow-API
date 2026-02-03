import { Request, Response } from "express";
import * as sessionService from "../services/sessionService.js";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  createdResponse,
  validationErrorResponse,
  paginatedResponse,
} from "../utils/apiResponse.js";
import { getErrorMessage } from "../utils/typeGuards.js";
import {
  getIdParam,
  getPaginationParams,
  getIncludeOptions,
  getSessionFilters,
} from "../utils/requestHelpers.js";
import { formatSession } from "../utils/formatters.js";
import type { CreateSessionInput, UpdateSessionInput } from "../types/index.js";

/**
 * @swagger
 * /api/sessions:
 *   post:
 *     summary: Create a new session with session days
 *     tags: [Sessions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSessionInput'
 *     responses:
 *       201:
 *         description: Session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessionResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
    return createdResponse(
      res,
      formatSession(session),
      "Session created successfully",
    );
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
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sessionCode
 *         schema:
 *           type: string
 *       - in: query
 *         name: semesterId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [Main, Resit]
 *     responses:
 *       200:
 *         description: List of sessions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessionListResponse'
 *       500:
 *         description: Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getAllSessions = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    // Extract input data
    const { page, limit } = getPaginationParams(req);
    const filters = getSessionFilters(req);
    const include = getIncludeOptions(req);

    // Process
    const result = await sessionService.getAllSessions(
      page,
      limit,
      filters,
      include,
    );
    const formattedData = result.data.map(formatSession);
    return paginatedResponse(
      res,
      formattedData,
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Session details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessionResponse'
 *       404:
 *         description: Session not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
    return successResponse(
      res,
      formatSession(session),
      "Session retrieved successfully",
    );
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
 *   patch:
 *     summary: Update session details and session days
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSessionInput'
 *     responses:
 *       200:
 *         description: Session updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessionResponse'
 *       404:
 *         description: Session not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       500:
 *         description: Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
    return successResponse(
      res,
      formatSession(session),
      "Session updated successfully",
    );
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Session deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Session not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Cannot delete session
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       500:
 *         description: Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
