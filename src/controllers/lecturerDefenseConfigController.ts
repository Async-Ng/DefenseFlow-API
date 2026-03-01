import { Request, Response } from "express";
import * as lecturerDefenseConfigService from "../services/lecturerDefenseConfigService.js";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  paginatedResponse,
} from "../utils/apiResponse.js";
import { LecturerDefenseConfigInput } from "../types/index.js";

/**
 * @swagger
 * /api/lecturer-defense-configs:
 *   post:
 *     summary: "[ADMIN] Create lecturer defense configuration"
 *     tags: [Lecturer Defense Configs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lecturerId
 *               - defenseId
 *             properties:
 *               lecturerId:
 *                 type: integer
 *               defenseId:
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
 *               $ref: '#/components/schemas/LecturerDefenseConfigResponse'
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
    const input: LecturerDefenseConfigInput = req.body;

    if (!input.lecturerId || !input.defenseId) {
      return errorResponse(
        res,
        "Missing required fields: lecturerId, defenseId",
        400,
      );
    }

    const config = await lecturerDefenseConfigService.createLecturerDefenseConfig(
      input,
    );
    return successResponse(
      res,
      config,
      "Configuration created successfully",
      201,
    );
  } catch (error: any) {
    if (error.message.includes("already exists")) {
      return errorResponse(res, error.message, 409);
    }
    if (
      error.message.includes("cannot be negative") ||
      error.message.includes("cannot be greater than")
    ) {
      return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @swagger
 * /api/lecturer-defense-configs/{id}:
 *   put:
 *     summary: "[ADMIN] Update lecturer defense configuration"
 *     tags: [Lecturer Defense Configs]
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
 *               $ref: '#/components/schemas/LecturerDefenseConfigResponse'
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
    const config = await lecturerDefenseConfigService.updateLecturerDefenseConfig(
      id,
      input,
    );
    return successResponse(res, config, "Configuration updated successfully");
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    if (
      error.message.includes("cannot be negative") ||
      error.message.includes("cannot be greater than")
    ) {
      return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @swagger
 * /api/lecturer-defense-configs:
 *   get:
 *     summary: "[ADMIN, LECTURER] Get all lecturer defense configurations"
 *     tags: [Lecturer Defense Configs]
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
 *         name: defenseId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of configurations
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LecturerDefenseConfigListResponse'
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
    const lecturerId = req.query.lecturerId
      ? parseInt(req.query.lecturerId as string)
      : undefined;
    const defenseId = req.query.defenseId
      ? parseInt(req.query.defenseId as string)
      : undefined;

    const {
      data,
      total,
    } = await lecturerDefenseConfigService.getAllLecturerDefenseConfigs(
      { page, limit },
      { lecturerId, defenseId },
    );
    return paginatedResponse(
      res,
      data,
      page,
      limit,
      total,
      "Configurations retrieved successfully",
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @swagger
 * /api/lecturer-defense-configs/{id}:
 *   get:
 *     summary: "[ADMIN, LECTURER] Get lecturer defense configuration by ID"
 *     tags: [Lecturer Defense Configs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *       404:
 *         description: Configuration not found
 *       500:
 *         description: Server error
 */
export const getConfigById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return errorResponse(res, "Invalid ID", 400);

    const config = await lecturerDefenseConfigService.getLecturerDefenseConfigById(id);
    return successResponse(res, config, "Configuration retrieved successfully");
  } catch (error: any) {
    if (error.message.includes("not found")) return notFoundResponse(res, error.message);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @swagger
 * /api/lecturer-defense-configs/{id}:
 *   delete:
 *     summary: "[ADMIN] Delete lecturer defense configuration"
 *     tags: [Lecturer Defense Configs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Configuration deleted successfully
 *       404:
 *         description: Configuration not found
 *       500:
 *         description: Server error
 */
export const deleteConfig = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return errorResponse(res, "Invalid ID", 400);

    await lecturerDefenseConfigService.deleteLecturerDefenseConfig(id);
    return successResponse(res, null, "Configuration deleted successfully");
  } catch (error: any) {
    if (error.message.includes("not found")) return notFoundResponse(res, error.message);
    return errorResponse(res, error.message, 500);
  }
};
