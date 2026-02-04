import { Request, Response } from "express";
import * as defenseService from "../services/defenseService.js";
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
  getDefenseFilters,
} from "../utils/requestHelpers.js";
import { formatDefense } from "../utils/formatters.js";
import type { CreateDefenseInput, UpdateDefenseInput } from "../types/index.js";

/**
 * @swagger
 * /api/defenses:
 *   post:
 *     summary: Create a new defense with defense days
 *     tags: [Defenses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDefenseInput'
 *     responses:
 *       201:
 *         description: Defense created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DefenseResponse'
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
export const createDefense = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    // Extract input data
    const data: CreateDefenseInput = req.body;

    // Process
    const defense = await defenseService.createDefense(data);
    return createdResponse(
      res,
      formatDefense(defense),
      "Defense created successfully",
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
 * /api/defenses:
 *   get:
 *     summary: Get all defenses
 *     tags: [Defenses]
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
 *         name: defenseCode
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
 *         description: List of defenses
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DefenseListResponse'
 *       500:
 *         description: Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getAllDefenses = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    // Extract input data
    const { page, limit } = getPaginationParams(req);
    const filters = getDefenseFilters(req);
    const include = getIncludeOptions(req);

    // Process
    const result = await defenseService.getAllDefenses(
      page,
      limit,
      filters,
      include,
    );
    const formattedData = result.data.map(formatDefense);
    return paginatedResponse(
      res,
      formattedData,
      page,
      limit,
      result.total,
      "Defenses retrieved successfully",
    );
  } catch (error: unknown) {
    return errorResponse(res, getErrorMessage(error), 500);
  }
};

/**
 * @swagger
 * /api/defenses/{id}:
 *   get:
 *     summary: Get defense by ID
 *     tags: [Defenses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Defense details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DefenseResponse'
 *       404:
 *         description: Defense not found
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
export const getDefenseById = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    // Extract input data
    const id = getIdParam(req);
    const include = getIncludeOptions(req);

    // Process
    const defense = await defenseService.getDefenseById(id, include);
    return successResponse(
      res,
      formatDefense(defense),
      "Defense retrieved successfully",
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
 * /api/defenses/{id}:
 *   patch:
 *     summary: Update defense details and defense days
 *     tags: [Defenses]
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
 *             $ref: '#/components/schemas/UpdateDefenseInput'
 *     responses:
 *       200:
 *         description: Defense updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DefenseResponse'
 *       404:
 *         description: Defense not found
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
export const updateDefense = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    // Extract input data
    const id = getIdParam(req);
    const data: UpdateDefenseInput = req.body;

    // Process
    const defense = await defenseService.updateDefense(id, data);
    return successResponse(
      res,
      formatDefense(defense),
      "Defense updated successfully",
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
 * /api/defenses/{id}:
 *   delete:
 *     summary: Delete defense
 *     tags: [Defenses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Defense deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Defense not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Cannot delete defense
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
export const deleteDefense = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    // Extract input data
    const id = getIdParam(req);

    // Process
    await defenseService.deleteDefense(id);
    return successResponse(res, {}, "Defense deleted successfully");
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
