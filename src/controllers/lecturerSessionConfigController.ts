import { Request, Response } from "express";
import * as lecturerSessionConfigService from "../services/lecturerSessionConfigService.js";
import { successResponse, errorResponse, paginatedResponse } from "../utils/apiResponse.js";
import { LecturerSessionConfigInput } from "../types/index.js";

/**
 * @swagger
 * /api/lecturer-configs:
 *   post:
 *     summary: Create lecturer session configuration
 *     tags: [Lecturer Configs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lecturerId
 *               - sessionId
 *             properties:
 *               lecturerId:
 *                 type: integer
 *               sessionId:
 *                 type: integer
 *               minTopics:
 *                 type: integer
 *                 default: 5
 *               maxTopics:
 *                 type: integer
 *                 default: 20
 *     responses:
 *       201:
 *         description: Configuration created successfully
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
 *                   example: "Configuration created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/LecturerSessionConfig'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Configuration already exists
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
export const createConfig = async (req: Request, res: Response) => {
  try {
    const input: LecturerSessionConfigInput = req.body;

    if (!input.lecturerId || !input.sessionId) {
      return errorResponse(res, "Missing required fields: lecturerId, sessionId", 400);
    }

    const config = await lecturerSessionConfigService.createLecturerSessionConfig(input);
    return successResponse(res, config, "Configuration created successfully", 201);
  } catch (error: any) {
    if (error.message.includes("already exists")) {
        return errorResponse(res, error.message, 409);
    }
    if (error.message.includes("cannot be negative") || error.message.includes("cannot be greater than")) {
        return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @swagger
 * /api/lecturer-configs/{id}:
 *   put:
 *     summary: Update lecturer session configuration
 *     tags: [Lecturer Configs]
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
 *               minTopics:
 *                 type: integer
 *               maxTopics:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Configuration updated successfully
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
 *                   example: "Configuration updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/LecturerSessionConfig'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Configuration not found
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
export const updateConfig = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
        return errorResponse(res, "Invalid ID", 400);
    }

    const input = req.body;
    const config = await lecturerSessionConfigService.updateLecturerSessionConfig(id, input);
    return successResponse(res, config, "Configuration updated successfully");
  } catch (error: any) {
    if (error.message.includes("not found")) {
        return errorResponse(res, error.message, 404);
    }
    if (error.message.includes("cannot be negative") || error.message.includes("cannot be greater than")) {
        return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @swagger
 * /api/lecturer-configs:
 *   get:
 *     summary: Get all lecturer session configurations
 *     tags: [Lecturer Configs]
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
 *         name: lecturerId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of configurations
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getConfigs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const lecturerId = req.query.lecturerId ? parseInt(req.query.lecturerId as string) : undefined;
    const sessionId = req.query.sessionId ? parseInt(req.query.sessionId as string) : undefined;

    const { data, total } = await lecturerSessionConfigService.getAllLecturerSessionConfigs(
      { page, limit },
      { lecturerId, sessionId }
    );
    return paginatedResponse(res, data, page, limit, total, "Configurations retrieved successfully");
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};
