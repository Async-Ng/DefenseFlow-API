import { Request, Response, NextFunction } from "express";
import * as scheduleService from "../services/scheduleService.js";
import { successResponse } from "../utils/apiResponse.js";
import { AppError } from "../middleware/errorHandler.js";
import { z } from "zod";

/**
 * @swagger
 * /api/schedule/generate:
 *   post:
 *     summary: Generate schedule for a defense
 *     tags: [Schedule]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - defenseId
 *             properties:
 *               defenseId:
 *                 type: integer
 *                 description: Defense ID to generate schedule for
 *                 example: 1
 *     responses:
 *       201:
 *         description: Schedule generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Schedule generated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "success"
 *                     metrics:
 *                       type: object
 *                       properties:
 *                         totalTopics:
 *                           type: integer
 *                           example: 10
 *                         scheduled:
 *                           type: integer
 *                           example: 8
 *                         unscheduled:
 *                           type: integer
 *                           example: 2
 *                     unscheduledTopics:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["TOPIC_001", "TOPIC_002"]
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
      defenseId: z.number({ required_error: "Defense ID is required" }).int(),
    });

    const validation = schema.safeParse(req.body);

    if (!validation.success) {
      throw new AppError(400, validation.error.errors[0].message);
    }

    const { defenseId } = validation.data;

    const result = await scheduleService.generateSchedule(defenseId);

    return successResponse(res, result, "Schedule generated successfully", 201);
  } catch (error) {
    return next(error);
  }
};

/**
 * @swagger
 * /api/schedule/{defenseId}:
 *   get:
 *     summary: Get schedule for a defense
 *     tags: [Schedule]
 *     parameters:
 *       - in: path
 *         name: defenseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Defense ID to get schedule for
 *     responses:
 *       200:
 *         description: Schedule retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScheduleResponse'
 *       400:
 *         description: Invalid defense ID
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
    const defenseId = parseInt(req.params.defenseId as string);

    if (isNaN(defenseId)) {
      throw new AppError(400, "Invalid defense ID");
    }

    const result = await scheduleService.getSchedule(defenseId);

    return successResponse(res, result, "Schedule retrieved successfully");
  } catch (error) {
    return next(error);
  }
};

/**
 * @swagger
 * /api/schedule/publish:
 *   post:
 *     summary: Publish the schedule for a defense (making it visible to lecturers)
 *     tags: [Schedule]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - defenseId
 *             properties:
 *               defenseId:
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
 *         description: Defense not found
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
      defenseId: z.number({ required_error: "Defense ID is required" }).int(),
    });

    const validation = schema.safeParse(req.body);

    if (!validation.success) {
      throw new AppError(400, validation.error.errors[0].message);
    }

    const { defenseId } = validation.data;

    await scheduleService.publishSchedule(defenseId);

    return successResponse(res, null, "Schedule published successfully");
  } catch (error) {
    return next(error);
  }
};

/**
 * @swagger
 * /api/schedule/defense-councils/{defenseCouncilId}:
 *   put:
 *     summary: Update a defense council (Manual Scheduling)
 *     tags: [Schedule]
 *     parameters:
 *       - in: path
 *         name: defenseCouncilId
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
 *               councilBoardId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Defense Council updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DefenseCouncilResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       404:
 *         description: Defense Council not found
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
export const updateDefenseCouncil = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const defenseCouncilId = parseInt(req.params.defenseCouncilId as string);
    if (isNaN(defenseCouncilId)) throw new AppError(400, "Invalid defense council ID");

    const schema = z.object({
      startTime: z.string().datetime().optional(),
      endTime: z.string().datetime().optional(),
      councilBoardId: z.number().int().optional(),
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, validation.error.errors[0].message);
    }

    const data = {
      startTime: validation.data.startTime ? new Date(validation.data.startTime) : undefined,
      endTime: validation.data.endTime ? new Date(validation.data.endTime) : undefined,
      councilBoardId: validation.data.councilBoardId,
    };

    const result = await scheduleService.updateDefenseCouncil(defenseCouncilId, data);
    return successResponse(res, result, "Defense Council updated successfully");
  } catch (error) {
    return next(error);
  }
};

/**
 * @swagger
 * /api/schedule/council-boards/{councilBoardId}:
 *   put:
 *     summary: Update a council board (Manual Scheduling)
 *     tags: [Schedule]
 *     parameters:
 *       - in: path
 *         name: councilBoardId
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
 *         description: Council Board updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CouncilBoardResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       404:
 *         description: Council Board not found
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
export const updateCouncilBoard = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const councilBoardId = parseInt(req.params.councilBoardId as string);
    if (isNaN(councilBoardId)) throw new AppError(400, "Invalid council board ID");

    const schema = z.object({
      presidentId: z.number().int().optional(),
      secretaryId: z.number().int().optional(),
      memberIds: z.array(z.number().int()).optional(),
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, validation.error.errors[0].message);
    }

    const result = await scheduleService.updateCouncilBoard(councilBoardId, validation.data);
    return successResponse(res, result, "Council Board updated successfully");
  } catch (error) {
    return next(error);
  }
};
