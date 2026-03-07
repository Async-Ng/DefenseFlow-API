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
 * /api/lecturers/my-schedule:
 *   get:
 *     summary: "[LECTURER] Get personal defense schedule"
 *     description: Returns a detailed list of all defense councils the authenticated lecturer is assigned to, including dates, rooms, and topics. Requires 'lecturer' role.
 *     tags: [Lecturers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: semesterId
 *         schema:
 *           type: integer
 *         description: Optional semester ID to filter the schedule.
 *     responses:
 *       200:
 *         description: Personal schedule retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       role:
 *                         type: string
 *                         enum: [President, Secretary, Member]
 *                       councilBoard:
 *                         type: object
 *                         properties:
 *                           boardCode:
 *                             type: string
 *                           name:
 *                             type: string
 *                           defenseDay:
 *                             type: object
 *                             properties:
 *                               dayDate:
 *                                 type: string
 *                                 format: date-time
 *                               defense:
 *                                 type: object
 *                                 properties:
 *                                   name:
 *                                     type: string
 *                           semester:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                           councilBoardMembers:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 role:
 *                                   type: string
 *                                 lecturer:
 *                                   type: object
 *                                   properties:
 *                                     fullName:
 *                                       type: string
 *                           defenseCouncils:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 startTime:
 *                                   type: string
 *                                 endTime:
 *                                   type: string
 *                                 topicDefense:
 *                                   type: object
 *                                   properties:
 *                                     topic:
 *                                       type: object
 *                                       properties:
 *                                         topicCode:
 *                                           type: string
 *                                         title:
 *                                           type: string
 *                                         topicSupervisors:
 *                                           type: array
 *                                           items:
 *                                             type: object
 *                                             properties:
 *                                               lecturer:
 *                                                 type: object
 *                                                 properties:
 *                                                   fullName:
 *                                                     type: string
 *       401:
 *         description: Unauthorized - Token missing or invalid
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Server Error
 */
export const getMySchedule = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = req.user;
    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const lecturerId = user.app_metadata?.lecturerId;
    if (!lecturerId) {
       return errorResponse(res, "Lecturer ID not found in user metadata", 403);
    }

    const semesterId = req.query.semesterId ? parseInt(req.query.semesterId as string) : undefined;

    const schedule = await lecturerService.getPersonalSchedule(lecturerId, { semesterId });
    return successResponse(res, schedule, "Personal defense schedule retrieved successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return errorResponse(res, message, 500);
  }
};
