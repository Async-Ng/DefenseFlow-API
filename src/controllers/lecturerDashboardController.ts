;import { Request, Response } from "express";
import * as lecturerService from "../services/lecturerService.js";
import { successResponse, errorResponse, notFoundResponse } from "../utils/apiResponse.js";
import { getErrorMessage } from "../utils/typeGuards.js";
import { getIdParam, getActiveRole } from "../utils/requestHelpers.js";

/**
 * @swagger
 * /api/lecturers/{id}/dashboard:
 *   get:
 *     summary: "[LECTURER] Get lecturer dashboard stats"
 *     description: Returns a summary of stats for a lecturer, including total supervised topics, total council boards, and lists of recent/upcoming items.
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
 *         description: Dashboard stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalSupervisedTopics:
 *                       type: integer
 *                       example: 5
 *                     totalCouncilBoards:
 *                       type: integer
 *                       example: 2
 *                     upcomingCouncils:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CouncilBoard'
 *                     supervisedTopics:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Topic'
 *       404:
 *         description: Lecturer not found
 *       500:
 *         description: Server Error
 */
export const getLecturerDashboard = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = getIdParam(req);

    // Authorization: Lecturers can only access their own dashboard
    const user = req.user;
    const activeRole = getActiveRole(req);
    
    if (user && activeRole !== "admin") {
      if (user.app_metadata?.lecturerId !== id) {
        return errorResponse(res, "Forbidden: You can only access your own dashboard", 403);
      }
    }

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
 *     description: Returns a full list of topics where the specified lecturer is a supervisor.
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
 *         description: List of supervised topics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Topic'
 *       404:
 *         description: Lecturer not found
 *       500:
 *         description: Server Error
 */
export const getSupervisedTopics = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = getIdParam(req);

    // Authorization: Lecturers can only access their own supervised topics
    const user = req.user;
    const activeRole = getActiveRole(req);
    
    if (user && activeRole !== "admin") {
      if (user.app_metadata?.lecturerId !== id) {
        return errorResponse(res, "Forbidden: You can only access your own supervised topics", 403);
      }
    }

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
 *     description: Returns a full list of council boards where the specified lecturer is a member, ordered chronologically.
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
 *         description: List of assigned council boards
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CouncilBoard'
 *       404:
 *         description: Lecturer not found
 *       500:
 *         description: Server Error
 */
export const getAssignedCouncilBoards = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = getIdParam(req);

    // Authorization: Lecturers can only access their own council boards
    const user = req.user;
    const activeRole = getActiveRole(req);
    
    if (user && activeRole !== "admin") {
      if (user.app_metadata?.lecturerId !== id) {
        return errorResponse(res, "Forbidden: You can only access your own assigned council boards", 403);
      }
    }

    const boards = await lecturerService.getAssignedCouncilBoards(id);
    return successResponse(res, boards, "Council boards retrieved successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) return notFoundResponse(res, message);
    return errorResponse(res, message, 500);
  }
};
