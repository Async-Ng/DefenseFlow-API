import { Request, Response } from "express";
import * as lecturerService from "../services/lecturerService.js";
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse, createdResponse, paginatedResponse } from "../utils/apiResponse.js";
import { getErrorMessage } from "../utils/typeGuards.js";
import { getIdParam, getPaginationParams, getLecturerFilters } from "../utils/requestHelpers.js";
import type {
  IdParam,
  UpdateLecturerQualificationsInput,
  CreateLecturerInput,
  UpdateLecturerInput,
} from "../types/index.js";

/**
 * @swagger
 * /api/lecturers/{id}:
 *   get:
 *     summary: "[ADMIN, LECTURER] Get lecturer by ID"
 *     tags: [Lecturers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lecturer ID
 *     responses:
 *       200:
 *         description: Lecturer details with qualifications
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LecturerResponse'
 *       404:
 *         description: Lecturer not found
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
export const getLecturerById = async (
  req: Request<IdParam>,
  res: Response,
): Promise<Response> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return errorResponse(res, "Invalid lecturer ID", 400);
    }

    const lecturer = await lecturerService.getLecturerById(id);
    return successResponse(res, lecturer, "Lecturer retrieved successfully");
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
 * /api/lecturers:
 *   post:
 *     summary: "[ADMIN] Create a new lecturer"
 *     tags: [Lecturers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateLecturerInput'
 *     responses:
 *       201:
 *         description: Lecturer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LecturerResponse'
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
export const createLecturer = async (req: Request, res: Response): Promise<Response> => {
  try {
    const data: CreateLecturerInput = req.body;
    if (!data.lecturerCode) {
      return validationErrorResponse(res, { message: "lecturerCode is required" });
    }
    
    const lecturer = await lecturerService.createLecturer(data);
    return createdResponse(res, lecturer, "Lecturer created successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("already exists")) {
       return validationErrorResponse(res, { message });
    }
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/lecturers/{id}:
 *   patch:
 *     summary: "[ADMIN, LECTURER] Update basic lecturer information"
 *     tags: [Lecturers]
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
 *             $ref: '#/components/schemas/UpdateLecturerInput'
 *     responses:
 *       200:
 *         description: Lecturer updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LecturerResponse'
 *       404:
 *         description: Lecturer not found
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
export const updateLecturer = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = getIdParam(req);
    const data: UpdateLecturerInput = req.body;
    
    const lecturer = await lecturerService.updateLecturer(id, data);
    return successResponse(res, lecturer, "Lecturer updated successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) return notFoundResponse(res, message);
    if (message.includes("already exists")) return validationErrorResponse(res, { message });
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/lecturers/{id}:
 *   delete:
 *     summary: "[ADMIN] Delete a lecturer"
 *     tags: [Lecturers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lecturer deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Lecturer not found
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
export const deleteLecturer = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = getIdParam(req);
    
    await lecturerService.deleteLecturer(id);
    return successResponse(res, null, "Lecturer deleted successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) return notFoundResponse(res, message);
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/lecturers:
 *   get:
 *     summary: "[ADMIN, LECTURER] Get all lecturers with pagination"
 *     tags: [Lecturers]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: lecturerCode
 *         schema:
 *           type: string
 *         description: Filter by lecturer code (partial match)
 *       - in: query
 *         name: fullName
 *         schema:
 *           type: string
 *         description: Filter by full name (partial match)
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filter by email (partial match)
 *     responses:
 *       200:
 *         description: Paginated list of lecturers
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LecturerListResponse'
 *       500:
 *         description: Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getAllLecturers = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { page, limit } = getPaginationParams(req);
    const filters = getLecturerFilters(req);

    const result = await lecturerService.getAllLecturers(page, limit, filters);

    return paginatedResponse(
      res,
      result.data,
      page,
      limit,
      result.total,
      "Lecturers retrieved successfully",
    );
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/lecturers/{id}/qualifications:
 *   patch:
 *     summary: "[ADMIN] Update lecturer qualification scores"
 *     tags: [Lecturers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lecturer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               qualifications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     qualificationId:
 *                       type: integer
 *                     score:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 5
 *     responses:
 *       200:
 *         description: Qualifications updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LecturerResponse'
 *       404:
 *         description: Lecturer or qualification not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation error (invalid score range)
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
export const updateLecturerQualifications = async (
  req: Request<IdParam, {}, UpdateLecturerQualificationsInput>,
  res: Response,
): Promise<Response> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return errorResponse(res, "Invalid lecturer ID", 400);
    }

    const lecturer = await lecturerService.updateLecturerQualifications(
      id,
      req.body,
    );
    return successResponse(
      res,
      lecturer,
      "Lecturer qualifications updated successfully",
    );
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) {
      return errorResponse(res, message, 404);
    }
    if (message.includes("Invalid qualification score")) {
      return errorResponse(res, message, 422);
    }
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/lecturers/{id}/qualifications:
 *   post:
 *     summary: "[ADMIN] Add qualifications to lecturer"
 *     description: Add one or more qualifications to a lecturer with scores. If a qualification already exists, its score will be updated.
 *     tags: [Lecturers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: Lecturer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateLecturerQualificationsInput'
 *     responses:
 *       201:
 *         description: Qualifications added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LecturerResponse'
 *       400:
 *         description: Invalid input (ID or body)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Lecturer or Qualification not found
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
export const addLecturerQualifications = async (
  req: Request<IdParam, {}, UpdateLecturerQualificationsInput>,
  res: Response,
): Promise<Response> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return errorResponse(res, "Invalid lecturer ID", 400);
    }

    // We reuse UpdateLecturerQualificationsInput as structure is same { qualifications: [...] }
    const lecturer = await lecturerService.addLecturerQualifications(
      id,
      req.body.qualifications,
    );
    return successResponse(
      res,
      lecturer,
      "Lecturer qualifications added successfully",
      201
    );
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) {
      return errorResponse(res, message, 404);
    }
    return errorResponse(res, message, 500);
  }
};



/**
 * @swagger
 * /api/lecturers/{id}/qualifications/{qualificationId}:
 *   delete:
 *     summary: "[ADMIN] Remove qualification from lecturer"
 *     description: Remove the association between a lecturer and a qualification.
 *     tags: [Lecturers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: Lecturer ID
 *       - in: path
 *         name: qualificationId
 *         required: true
 *         schema: { type: integer }
 *         description: Qualification ID
 *     responses:
 *       200:
 *         description: Qualification removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid ID(s)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Qualification not found or not assigned
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
export const deleteLecturerQualification = async (
  req: Request<IdParam & { qualificationId: string }>,
  res: Response,
): Promise<Response> => {
  try {
     const id = parseInt(req.params.id);
    const qualificationId = parseInt(req.params.qualificationId);
    
    if (isNaN(id) || isNaN(qualificationId)) {
      return errorResponse(res, "Invalid ID(s)", 400);
    }

    await lecturerService.deleteLecturerQualification(id, qualificationId);
    return successResponse(res, null, "Qualification removed successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found") || message.includes("not assigned")) {
        return errorResponse(res, message, 404);
    }
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/lecturers/{id}/reset-password:
 *   post:
 *     summary: "[ADMIN] Reset lecturer password to default"
 *     description: Resets the specified lecturer's password to their `lecturerCode` (padded to 6 characters if shorter). **No old password required.**
 *     tags: [Lecturers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lecturer ID to reset password for.
 *     responses:
 *       200:
 *         description: Password reset successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Lecturer not found or has no Auth account.
 *       500:
 *         description: Internal server error.
 */
export const resetPassword = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = getIdParam(req);
    await lecturerService.resetLecturerPassword(id);
    return successResponse(res, null, "Đã reset mật khẩu về mặc định thành công.");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found") || message.includes("chưa có tài khoản")) {
      return notFoundResponse(res, message);
    }
    return errorResponse(res, message, 500);
  }
};
