/**
 * Semester Controller
 * HTTP request handlers for Semester endpoints (Functional TypeScript)
 */

import { Request, Response } from "express";
import * as semesterService from "@services/semesterService.js";
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  validationErrorResponse,
  paginatedResponse,
  errorResponse,
} from "@utils/apiResponse.js";
import { getErrorMessage } from "@utils/typeGuards.js";
import {
  getIdParam,
  getPaginationParams,
  getIncludeOptions,
  getSemesterFilters,
} from "@utils/requestHelpers.js";
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
 *   put:
 *     summary: Update semester
 *     tags: [Semesters]
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
