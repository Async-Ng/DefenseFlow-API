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
import type {
  CreateSemesterInput,
  UpdateSemesterInput,
  SemesterFilters,
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
    const data: CreateSemesterInput = req.body;
    const semester = await semesterService.createSemester(data);
    return createdResponse(res, semester, "Semester created successfully");
  } catch (error: any) {
    if (
      error.message.includes("already exists") ||
      error.message.includes("required")
    ) {
      return validationErrorResponse(res, { message: error.message });
    }
    return errorResponse(res, error.message, 500);
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const filters: SemesterFilters = {
      semesterCode: req.query.semesterCode as string,
      name: req.query.name as string,
    };

    const result = await semesterService.getAllSemesters(page, limit, filters);
    return paginatedResponse(
      res,
      result.data,
      page,
      limit,
      result.total,
      "Semesters retrieved successfully",
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
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
    const include: any = {};
    if (req.query.include) {
      const includes = (req.query.include as string).split(",");
      includes.forEach((inc) => {
        include[inc.trim()] = true;
      });
    }

    const semester = await semesterService.getSemesterById(
      parseInt(req.params.id),
      include,
    );
    return successResponse(res, semester, "Semester retrieved successfully");
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return notFoundResponse(res, error.message);
    }
    return errorResponse(res, error.message, 500);
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
    const data: UpdateSemesterInput = req.body;
    const semester = await semesterService.updateSemester(
      parseInt(req.params.id),
      data,
    );
    return successResponse(res, semester, "Semester updated successfully");
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return notFoundResponse(res, error.message);
    }
    if (
      error.message.includes("already exists") ||
      error.message.includes("conflict")
    ) {
      return validationErrorResponse(res, { message: error.message });
    }
    return errorResponse(res, error.message, 500);
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
    await semesterService.deleteSemester(parseInt(req.params.id));
    return successResponse(res, null, "Semester deleted successfully");
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return notFoundResponse(res, error.message);
    }
    if (error.message.includes("Cannot delete")) {
      return validationErrorResponse(res, { message: error.message });
    }
    return errorResponse(res, error.message, 500);
  }
};
