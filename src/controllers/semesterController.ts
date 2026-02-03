import { Request, Response } from "express";
import * as semesterService from "../services/semesterService.js";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  createdResponse, // Keep createdResponse for createSemester
  validationErrorResponse, // Keep validationErrorResponse for createSemester
  paginatedResponse, // Keep paginatedResponse for getAllSemesters
} from "../utils/apiResponse.js";
import { getErrorMessage } from "../utils/typeGuards.js";
import {
  getIdParam,
  getPaginationParams,
  getIncludeOptions,
  getSemesterFilters,
} from "../utils/requestHelpers.js";
import type {
  CreateSemesterInput,
  UpdateSemesterInput,
} from "../types/index.js";

/**
 * @swagger
 * /api/semesters:
 *   post:
 *     summary: Create a new semester
 *     tags: [Semesters]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSemesterInput'
 *     responses:
 *       201:
 *         description: Semester created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SemesterResponse'
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
export const createSemester = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    // Extract input data
    const data: CreateSemesterInput = req.body;

    // Process
    const semester = await semesterService.createSemester(data);
    return createdResponse(res, semester, "Semester created successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("already exists") || message.includes("required")) {
      return validationErrorResponse(res, { message });
    }
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/semesters:
 *   get:
 *     summary: Get all semesters
 *     tags: [Semesters]
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
 *         name: semesterCode
 *         schema:
 *           type: string
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of semesters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SemesterListResponse'
 *       500:
 *         description: Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getAllSemesters = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    // Extract input data
    const { page, limit } = getPaginationParams(req);
    const filters = getSemesterFilters(req);

    // Process
    const result = await semesterService.getAllSemesters(page, limit, filters);
    return paginatedResponse(
      res,
      result.data,
      page,
      limit,
      result.total,
      "Semesters retrieved successfully",
    );
  } catch (error: unknown) {
    return errorResponse(res, getErrorMessage(error), 500);
  }
};

/**
 * @swagger
 * /api/semesters/{id}:
 *   get:
 *     summary: Get semester by ID
 *     tags: [Semesters]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Semester details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SemesterResponse'
 *       404:
 *         description: Semester not found
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
export const getSemesterById = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    // Extract input data
    const id = getIdParam(req);
    const include = getIncludeOptions(req);

    // Process
    const semester = await semesterService.getSemesterById(id, include);
    return successResponse(res, semester, "Semester retrieved successfully");
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
 * /api/semesters/{id}:
 *   patch:
 *     summary: Update semester
 *     tags: [Semesters]
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
 *             $ref: '#/components/schemas/UpdateSemesterInput'
 *     responses:
 *       200:
 *         description: Semester updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SemesterResponse'
 *       404:
 *         description: Semester not found
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
export const updateSemester = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    // Extract input data
    const id = getIdParam(req);
    const data: UpdateSemesterInput = req.body;

    // Process
    const semester = await semesterService.updateSemester(id, data);
    return successResponse(res, semester, "Semester updated successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) {
      return notFoundResponse(res, message);
    }
    if (message.includes("already exists") || message.includes("conflict")) {
      return validationErrorResponse(res, { message });
    }
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/semesters/{id}:
 *   delete:
 *     summary: Delete semester
 *     tags: [Semesters]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Semester deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Semester not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Cannot delete semester (e.g., has active sessions)
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
export const deleteSemester = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    // Extract input data
    const id = getIdParam(req);

    // Process
    await semesterService.deleteSemester(id);
    return successResponse(res, {}, "Semester deleted successfully");
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
