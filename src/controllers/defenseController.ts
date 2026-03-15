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
  getActiveRole,
} from "../utils/requestHelpers.js";
import { formatDefense } from "../utils/formatters.js";
import type { CreateDefenseInput, UpdateDefenseInput } from "../types/index.js";

/**
 * @swagger
 * /api/defenses:
 *   post:
 *     summary: "[ADMIN] Create a new defense with defense days"
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
      message.includes("đã tồn tại") ||
      message.includes("required") ||
      message.includes("not found") ||
      message.includes("Không tìm thấy") ||
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
 *     summary: "[ADMIN, LECTURER] Get all defenses"
 *     description: |
 *       Returns a list of defenses.
 *       **Visibility Note:** For non-admin roles, `defenseDays` list will be empty if `isAvailabilityPublished` is false.
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
 *       - in: query
 *         name: maxCouncilsPerDay
 *         schema:
 *           type: integer
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

    // Filter defenseDays for non-admins if not published
    const activeRole = getActiveRole(req);
    const isActingAsAdmin = activeRole === "admin";

    const formattedData = result.data.map((defense: any) => {
      const formatted = formatDefense(defense);
      if (!isActingAsAdmin && !formatted.isAvailabilityPublished) {
        formatted.defenseDays = [];
      }
      return formatted;
    });

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
 *     summary: "[ADMIN, LECTURER] Get defense by ID"
 *     description: |
 *       Returns details of a specific defense.
 *       **Visibility Note:** For non-admin roles, `defenseDays` list will be empty if `isAvailabilityPublished` is false.
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
    const formattedDefense = formatDefense(defense);

    // Filter defenseDays for non-admins if not published
    const activeRole = getActiveRole(req);
    const isActingAsAdmin = activeRole === "admin";

    if (!isActingAsAdmin && !formattedDefense.isAvailabilityPublished) {
      formattedDefense.defenseDays = [];
    }

    return successResponse(
      res,
      formattedDefense,
      "Defense retrieved successfully",
    );
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found") || message.includes("Không tìm thấy")) {
      return notFoundResponse(res, message);
    }
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/defenses/{id}:
 *   patch:
 *     summary: "[ADMIN] Update defense details and defense days"
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
    if (message.includes("not found") || message.includes("Không tìm thấy")) {
      return notFoundResponse(res, message);
    }
    if (
      message.includes("already exists") ||
      message.includes("đã tồn tại") ||
      message.includes("must be")
    ) {
      return validationErrorResponse(res, { message });
    }
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/defenses/{id}:
 *   delete:
 *     summary: "[ADMIN] Delete defense"
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
    if (message.includes("not found") || message.includes("Không tìm thấy")) {
      return notFoundResponse(res, message);
    }
    if (
      message.includes("Cannot delete") ||
      message.includes("Không thể xóa")
    ) {
      return validationErrorResponse(res, { message });
    }
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/defenses/{id}/publish-availability:
 *   post:
 *     summary: "[ADMIN] Publish defense days so lecturers can register availability"
 *     description: |
 *       Publishes the availability for a specific defense. 
 *       You can optionally provide a registration window (start and end dates).
 *     tags: [Defenses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Defense ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PublishAvailabilityInput'
 *     responses:
 *       200:
 *         description: Availability published successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DefenseResponse'
 *       400:
 *         description: Already published or invalid dates
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
export const publishAvailability = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const id = getIdParam(req);
    const { availabilityStartDate, availabilityEndDate } = req.body;
    const defense = await defenseService.publishAvailability(
      id,
      availabilityStartDate,
      availabilityEndDate,
    );
    return successResponse(
      res,
      formatDefense(defense),
      "Availability published successfully",
    );
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found") || message.includes("Không tìm thấy")) {
      return notFoundResponse(res, message);
    }
    if (
      message.includes("already published") ||
      message.includes("đã được công bố") ||
      message.includes("cannot be after")
    ) {
      return validationErrorResponse(res, { message });
    }
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/defenses/{id}/import-failed-topics:
 *   post:
 *     summary: "[ADMIN] Auto-transfer failed topics from the Main defense into a Resit defense"
 *     tags: [Defenses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Resit Defense ID
 *     responses:
 *       200:
 *         description: Topics imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad Request (Target is not a Resit defense, or Main defense not found)
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
export const importFailedTopics = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const id = getIdParam(req);
    const result = await defenseService.importFailedTopics(id);
    return successResponse(res, result, "Failed topics imported successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found") || message.includes("Không tìm thấy")) {
      return notFoundResponse(res, message);
    }
    if (
      message.includes("must be a Resit defense") ||
      message.includes("không thuộc") ||
      message.includes("does not have") || 
      message.includes("already imported") ||
      message.includes("chưa có")
    ) {
      return validationErrorResponse(res, { message });
    }
    return errorResponse(res, message, 500);
  }
};
