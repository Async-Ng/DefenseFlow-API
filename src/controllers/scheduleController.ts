import { Request, Response, NextFunction } from "express";
import * as scheduleService from "../services/scheduleService.js";
import { successResponse } from "../utils/apiResponse.js";
import { AppError } from "../middleware/errorHandler.js";
import { z } from "zod";

/**
 * @swagger
 * /api/schedule/generate:
 *   post:
 *     summary: Generate schedule for a session
 *     tags: [Schedule]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: integer
 *                 description: Session ID to generate schedule for
 *                 example: 1
 *     responses:
 *       201:
 *         description: Schedule generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScheduleResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const generateSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schema = z.object({
      sessionId: z.number({ required_error: "Session ID is required" }).int(),
    });

    const validation = schema.safeParse(req.body);

    if (!validation.success) {
      throw new AppError(400, validation.error.errors[0].message);
    }

    const { sessionId } = validation.data;

    const result = await scheduleService.generateSchedule(sessionId);

    return successResponse(res, result, "Schedule generated successfully", 201);
  } catch (error) {
    return next(error);
  }
};

/**
 * @swagger
 * /api/schedule/{sessionId}:
 *   get:
 *     summary: Get schedule for a session
 *     tags: [Schedule]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Session ID to get schedule for
 *     responses:
 *       200:
 *         description: Schedule retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScheduleResponse'
 *       400:
 *         description: Invalid session ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Schedule not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sessionId = parseInt(req.params.sessionId as string);

    if (isNaN(sessionId)) {
      throw new AppError(400, "Invalid session ID");
    }

    const result = await scheduleService.getSchedule(sessionId);

    return successResponse(res, result, "Schedule retrieved successfully");
  } catch (error) {
    return next(error);
  }
};

/**
 * @swagger
 * /api/schedule/publish:
 *   post:
 *     summary: Publish the schedule for a session (making it visible to lecturers)
 *     tags: [Schedule]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Schedule published successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       404:
 *         description: Session not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const publishSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schema = z.object({
      sessionId: z.number({ required_error: "Session ID is required" }).int(),
    });

    const validation = schema.safeParse(req.body);

    if (!validation.success) {
      throw new AppError(400, validation.error.errors[0].message);
    }

    const { sessionId } = validation.data;

    await scheduleService.publishSchedule(sessionId);

    return successResponse(res, null, "Schedule published successfully");
  } catch (error) {
    return next(error);
  }
};

/**
 * @swagger
 * /api/schedule/matches/{matchId}:
 *   put:
 *     summary: Update a defense match (Manual Scheduling)
 *     tags: [Schedule]
 *     parameters:
 *       - in: path
 *         name: matchId
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
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               councilId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Match updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       404:
 *         description: Match not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const updateMatch = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const matchId = parseInt(req.params.matchId as string);
    if (isNaN(matchId)) throw new AppError(400, "Invalid match ID");

    const schema = z.object({
      startTime: z.string().datetime().optional(),
      endTime: z.string().datetime().optional(),
      councilId: z.number().int().optional(),
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, validation.error.errors[0].message);
    }

    const data = {
      startTime: validation.data.startTime ? new Date(validation.data.startTime) : undefined,
      endTime: validation.data.endTime ? new Date(validation.data.endTime) : undefined,
      councilId: validation.data.councilId,
    };

    const result = await scheduleService.updateMatch(matchId, data);
    return successResponse(res, result, "Match updated successfully");
  } catch (error) {
    return next(error);
  }
};

/**
 * @swagger
 * /api/schedule/councils/{councilId}:
 *   put:
 *     summary: Update a council (Manual Scheduling)
 *     tags: [Schedule]
 *     parameters:
 *       - in: path
 *         name: councilId
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
 *               presidentId:
 *                 type: integer
 *               secretaryId:
 *                 type: integer
 *               memberIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Council updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       404:
 *         description: Council not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const updateCouncil = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const councilId = parseInt(req.params.councilId as string);
    if (isNaN(councilId)) throw new AppError(400, "Invalid council ID");

    const schema = z.object({
      presidentId: z.number().int().optional(),
      secretaryId: z.number().int().optional(),
      memberIds: z.array(z.number().int()).optional(),
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, validation.error.errors[0].message);
    }

    const result = await scheduleService.updateCouncil(councilId, validation.data);
    return successResponse(res, result, "Council updated successfully");
  } catch (error) {
    return next(error);
  }
};
