import { Request, Response } from "express";
import * as lecturerService from "../services/lecturerService.js";
import { successResponse, errorResponse, notFoundResponse } from "../utils/apiResponse.js";
import { getErrorMessage } from "../utils/typeGuards.js";
import { getIdParam } from "../utils/requestHelpers.js";

/**
 * @swagger
 * /api/lecturers/{id}/dashboard:
 *   get:
 *     summary: "[LECTURER] Get lecturer dashboard stats"
 *     tags: [Lecturers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved successfully
 */
export const getLecturerDashboard = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = getIdParam(req);
    const stats = await lecturerService.getLecturerDashboard(id);
    return successResponse(res, stats, "Lecturer dashboard retrieved successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) return notFoundResponse(res, message);
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/lecturers/{id}/supervised-topics:
 *   get:
 *     summary: "[LECTURER] Get topics supervised by lecturer"
 *     tags: [Lecturers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 */
export const getSupervisedTopics = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = getIdParam(req);
    const topics = await lecturerService.getSupervisedTopics(id);
    return successResponse(res, topics, "Supervised topics retrieved successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) return notFoundResponse(res, message);
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/lecturers/{id}/council-boards:
 *   get:
 *     summary: "[LECTURER] Get council boards assigned to lecturer"
 *     tags: [Lecturers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 */
export const getAssignedCouncilBoards = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = getIdParam(req);
    const boards = await lecturerService.getAssignedCouncilBoards(id);
    return successResponse(res, boards, "Council boards retrieved successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) return notFoundResponse(res, message);
    return errorResponse(res, message, 500);
  }
};
