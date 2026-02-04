import { Request, Response } from "express";
import * as qualificationService from "../services/qualificationService.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import { CreateQualificationInput, UpdateQualificationInput } from "../types/index.js";

/**
 * @swagger
 * /api/qualifications:
 *   post:
 *     summary: Create a new qualification
 *     tags: [Qualifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateQualificationInput'
 *     responses:
 *       201:
 *         description: Qualification created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QualificationResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       409:
 *         description: Qualification already exists
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
export const createQualification = async (req: Request, res: Response) => {
  try {
    const input: CreateQualificationInput = req.body;

    // validation
    if (!input.qualificationCode || !input.name) {
      return errorResponse(
        res,
        "Missing required fields: qualificationCode, name",
        400,
      );
    }

    const qualification = await qualificationService.createQualification(input);
    return successResponse(res, qualification, "Qualification created successfully", 201);
  } catch (error: any) {
    if (error.message.includes("already exists")) {
      return errorResponse(res, error.message, 409);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @swagger
 * /api/qualifications:
 *   get:
 *     summary: Get all qualifications
 *     tags: [Qualifications]
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
 *         name: qualificationCode
 *         schema:
 *           type: string
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of qualifications
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QualificationListResponse'
 *       500:
 *         description: Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getQualifications = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Helper to allow single string or take first if array
    const getString = (param: any): string | undefined => {
      if (!param) return undefined;
      return Array.isArray(param) ? (param[0] as string) : (param as string);
    };

    const filters = {
      qualificationCode: getString(req.query.qualificationCode),
      name: getString(req.query.name),
    };

    const result = await qualificationService.getAllQualifications({ page, limit }, filters);
    return successResponse(res, result, "Qualifications retrieved successfully");
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @swagger
 * /api/qualifications/{id}:
 *   get:
 *     summary: Get qualification by ID
 *     tags: [Qualifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Qualification details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QualificationResponse'
 *       404:
 *         description: Qualification not found
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
export const getQualification = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return errorResponse(res, "Invalid ID", 400);
    }

    const qualification = await qualificationService.getQualificationById(id);
    if (!qualification) {
      return errorResponse(res, "Qualification not found", 404);
    }

    return successResponse(res, qualification, "Qualification retrieved successfully");
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @swagger
 * /api/qualifications/{id}:
 *   put:
 *     summary: Update qualification
 *     tags: [Qualifications]
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
 *             $ref: '#/components/schemas/UpdateQualificationInput'
 *     responses:
 *       200:
 *         description: Qualification updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QualificationResponse'
 *       404:
 *         description: Qualification not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Qualification code already exists
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
export const updateQualification = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return errorResponse(res, "Invalid ID", 400);
    }

    const input: UpdateQualificationInput = req.body;
    const qualification = await qualificationService.updateQualification(id, input);
    return successResponse(res, qualification, "Qualification updated successfully");
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    if (error.message.includes("already exists")) {
      return errorResponse(res, error.message, 409);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @swagger
 * /api/qualifications/{id}:
 *   delete:
 *     summary: Delete qualification
 *     tags: [Qualifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Qualification deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Qualification not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Cannot delete qualification (used in other records)
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
export const deleteQualification = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return errorResponse(res, "Invalid ID", 400);
    }

    await qualificationService.deleteQualification(id);
    return successResponse(res, null, "Qualification deleted successfully");
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    // Check foreign key constraint error from Prisma (roughly)
    if (error.code === "P2003") {
      return errorResponse(
        res,
        "Cannot delete qualification because it is being used",
        400,
      );
    }
    return errorResponse(res, error.message, 500);
  }
};
