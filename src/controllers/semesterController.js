/**
 * Semester Controller
 * HTTP request handlers for Semester endpoints
 */

import semesterService from "../services/semesterService.js";
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  validationErrorResponse,
  paginatedResponse,
  errorResponse,
} from "../utils/apiResponse.js";

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
 *             type: object
 *             required:
 *               - semesterCode
 *               - name
 *             properties:
 *               semesterCode:
 *                 type: string
 *               name:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Semester created successfully
 *       422:
 *         description: Validation error
 */
export const createSemester = async (req, res) => {
  try {
    const semester = await semesterService.createSemester(req.body);
    return createdResponse(res, semester, "Semester created successfully");
  } catch (error) {
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
 */
export const getAllSemesters = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filters = {
      semesterCode: req.query.semesterCode,
      name: req.query.name,
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
  } catch (error) {
    return errorResponse(res, error.message, 500);
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
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *           enum: [sessions, topics, councils]
 *     responses:
 *       200:
 *         description: Semester details
 *       404:
 *         description: Semester not found
 */
export const getSemesterById = async (req, res) => {
  try {
    const include = {};
    if (req.query.include) {
      const includes = req.query.include.split(",");
      includes.forEach((inc) => {
        include[inc.trim()] = true;
      });
    }

    const semester = await semesterService.getSemesterById(
      req.params.id,
      include,
    );
    return successResponse(res, semester, "Semester retrieved successfully");
  } catch (error) {
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
 *               semesterCode:
 *                 type: string
 *               name:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Semester updated successfully
 *       404:
 *         description: Semester not found
 *       422:
 *         description: Validation error
 */
export const updateSemester = async (req, res) => {
  try {
    const semester = await semesterService.updateSemester(
      req.params.id,
      req.body,
    );
    return successResponse(res, semester, "Semester updated successfully");
  } catch (error) {
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Semester deleted successfully
 *       404:
 *         description: Semester not found
 *       422:
 *         description: Cannot delete semester with dependencies
 */
export const deleteSemester = async (req, res) => {
  try {
    await semesterService.deleteSemester(req.params.id);
    return successResponse(res, null, "Semester deleted successfully");
  } catch (error) {
    if (error.message.includes("not found")) {
      return notFoundResponse(res, error.message);
    }
    if (error.message.includes("Cannot delete")) {
      return validationErrorResponse(res, { message: error.message });
    }
    return errorResponse(res, error.message, 500);
  }
};
