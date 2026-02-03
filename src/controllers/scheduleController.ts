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
