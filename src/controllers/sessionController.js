/**
 * Session Controller
 * HTTP request handlers for Session endpoints
 */

import sessionService from "../services/sessionService.js";
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  validationErrorResponse,
  paginatedResponse,
  errorResponse,
} from "../utils/apiResponse.js";

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
 *             type: object
 *             required:
 *               - sessionCode
 *               - semesterId
 *               - name
 *             properties:
 *               sessionCode:
 *                 type: string
 *               semesterId:
 *                 type: integer
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [Main, Resit]
 *               timePerTopic:
 *                 type: integer
 *               workStartTime:
 *                 type: string
 *                 format: time
 *               sessionDays:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - sessionDayCode
 *                     - dayDate
 *                   properties:
 *                     sessionDayCode:
 *                       type: string
 *                     dayDate:
 *                       type: string
 *                       format: date
 *                     note:
 *                       type: string
 *     responses:
 *       201:
 *         description: Session created successfully
 *       422:
 *         description: Validation error
 */
export const createSession = async (req, res) => {
  try {
    const session = await sessionService.createSession(req.body);
    return createdResponse(res, session, "Session created successfully");
  } catch (error) {
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
 *         name: semesterId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sessionCode
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [Main, Resit]
 *     responses:
 *       200:
 *         description: List of sessions
 */
export const getAllSessions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filters = {
      semesterId: req.query.semesterId,
      sessionCode: req.query.sessionCode,
      type: req.query.type,
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
  } catch (error) {
    return errorResponse(res, error.message, 500);
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
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *           enum: [sessionDays, councils]
 *     responses:
 *       200:
 *         description: Session details
 *       404:
 *         description: Session not found
 */
export const getSessionById = async (req, res) => {
  try {
    const include = {};
    if (req.query.include) {
      const includes = req.query.include.split(",");
      includes.forEach((inc) => {
        include[inc.trim()] = true;
      });
    }

    const session = await sessionService.getSessionById(req.params.id, include);
    return successResponse(res, session, "Session retrieved successfully");
  } catch (error) {
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
 *             type: object
 *             properties:
 *               sessionCode:
 *                 type: string
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [Main, Resit]
 *               timePerTopic:
 *                 type: integer
 *               workStartTime:
 *                 type: string
 *                 format: time
 *     responses:
 *       200:
 *         description: Session updated successfully
 *       404:
 *         description: Session not found
 *       422:
 *         description: Validation error
 */
export const updateSession = async (req, res) => {
  try {
    const session = await sessionService.updateSession(req.params.id, req.body);
    return successResponse(res, session, "Session updated successfully");
  } catch (error) {
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Session deleted successfully
 *       404:
 *         description: Session not found
 *       422:
 *         description: Cannot delete session with dependencies
 */
export const deleteSession = async (req, res) => {
  try {
    await sessionService.deleteSession(req.params.id);
    return successResponse(res, null, "Session deleted successfully");
  } catch (error) {
    if (error.message.includes("not found")) {
      return notFoundResponse(res, error.message);
    }
    if (error.message.includes("Cannot delete")) {
      return validationErrorResponse(res, { message: error.message });
    }
    return errorResponse(res, error.message, 500);
  }
};
