import { Request, Response } from "express";
import * as qualificationService from "../services/qualificationService.js";
import { successResponse, errorResponse, paginatedResponse } from "../utils/apiResponse.js";
import { CreateQualificationInput, UpdateQualificationInput } from "../types/index.js";
import { getPaginationParams, getQualificationFilters } from "../utils/requestHelpers.js";
import { getErrorMessage } from "../utils/typeGuards.js";

/**
 * @swagger
 * /api/qualifications:
 *   post:
 *     summary: "[ADMIN] Create a new qualification"
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
        "Thiếu các trường bắt buộc: qualificationCode, name",
        400,
      );
    }

    const qualification = await qualificationService.createQualification(input);
    return successResponse(res, qualification, "Tạo năng lực thành công", 201);
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
 *     summary: "[ADMIN] Get all qualifications"
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
    const { page, limit } = getPaginationParams(req);
    const filters = getQualificationFilters(req);

    const result = await qualificationService.getAllQualifications({ page, limit }, filters);
    return paginatedResponse(
      res,
      result.data,
      page,
      limit,
      result.total,
      "Lấy danh sách năng lực thành công",
    );
  } catch (error: any) {
    return errorResponse(res, getErrorMessage(error), 500);
  }
};

/**
 * @swagger
 * /api/qualifications/{id}:
 *   get:
 *     summary: "[ADMIN] Get qualification by ID"
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
      return errorResponse(res, "ID không hợp lệ", 400);
    }

    const qualification = await qualificationService.getQualificationById(id);
    if (!qualification) {
      return errorResponse(res, "Không tìm thấy năng lực", 404);
    }

    return successResponse(res, qualification, "Lấy thông tin năng lực thành công");

  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @swagger
 * /api/qualifications/{id}:
 *   put:
 *     summary: "[ADMIN] Update qualification"
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
      return errorResponse(res, "ID không hợp lệ", 400);
    }

    const input: UpdateQualificationInput = req.body;
    const qualification = await qualificationService.updateQualification(id, input);
    return successResponse(res, qualification, "Cập nhật năng lực thành công");
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return errorResponse(res, "Không tìm thấy năng lực", 404);
    }
    if (error.message.includes("already exists")) {
      return errorResponse(res, "Mã năng lực đã tồn tại", 409);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @swagger
 * /api/qualifications/{id}:
 *   delete:
 *     summary: "[ADMIN] Delete qualification"
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
      return errorResponse(res, "ID không hợp lệ", 400);
    }

    await qualificationService.deleteQualification(id);
    return successResponse(res, null, "Xóa năng lực thành công");
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return errorResponse(res, "Không tìm thấy năng lực", 404);
    }
    // Check foreign key constraint error from Prisma (roughly)
    if (error.code === "P2003") {
      return errorResponse(
        res,
        "Không thể xóa năng lực này vì đang được sử dụng",
        400,
      );
    }
    return errorResponse(res, error.message, 500);
  }
};
