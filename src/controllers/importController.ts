import { Request, Response } from "express";
import importService from "../services/importService.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import { getErrorMessage } from "../utils/typeGuards.js";

/**
 * @swagger
 * /api/import/topics:
 *   post:
 *     summary: Import topics from Excel file
 *     tags: [Import]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               semesterId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Import successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     successCount:
 *                       type: integer
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           row:
 *                             type: integer
 *                           message:
 *                             type: string
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Server Error
 */
export const importTopics = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.file) {
      return errorResponse(res, "No file uploaded", 400);
    }

    // Assume semesterId is passed in body, default to something or require it
    // The previous plan mentioned "Semester ID will be passed as a form-field semesterId"
    const semesterId = parseInt(req.body.semesterId);
    if (isNaN(semesterId)) {
      return errorResponse(res, "Invalid or missing semesterId", 400);
    }

    const buffer = req.file.buffer;
    const result = await importService.processTopics(buffer, semesterId);

    return successResponse(res, result, "Topics import processed");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/import/lecturers:
 *   post:
 *     summary: Import lecturers from Excel file
 *     tags: [Import]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Import successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     successCount:
 *                       type: integer
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           row:
 *                             type: integer
 *                           message:
 *                             type: string
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Server Error
 */
export const importLecturers = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.file) {
      return errorResponse(res, "No file uploaded", 400);
    }

    const buffer = req.file.buffer;
    const result = await importService.processLecturers(buffer);

    return successResponse(res, result, "Lecturers import processed");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/import/topics/template:
 *   get:
 *     summary: Download topic import template
 *     tags: [Import]
 *     responses:
 *       200:
 *         description: Excel template file
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Server Error
 */
export const downloadTopicTemplate = async (
  _req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const buffer = await importService.getTopicTemplate();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=topics-template.xlsx",
    );
    res.send(buffer);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/import/lecturers/template:
 *   get:
 *     summary: Download lecturer import template
 *     tags: [Import]
 *     responses:
 *       200:
 *         description: Excel template file
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Server Error
 */
export const downloadLecturerTemplate = async (
  _req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const buffer = await importService.getLecturerTemplate();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=lecturers-template.xlsx",
    );
    res.send(buffer);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return errorResponse(res, message, 500);
  }
};
