import { Request, Response } from "express";
import * as lecturerService from "../services/lecturerService.js";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
} from "../utils/apiResponse.js";
import { getErrorMessage } from "../utils/typeGuards.js";
import { getIdParam, getActiveRole } from "../utils/requestHelpers.js";

/**
 * @swagger
 * /api/lecturers/{id}/dashboard:
 *   get:
 *     summary: "[LECTURER] Get lecturer dashboard stats"
 *     description: |
 *       Returns a rich, at-a-glance dashboard for a lecturer. Includes today's councils,
 *       upcoming schedules, defenses that still need availability registration, semester-scoped
 *       stats, and recent supervised topics with defense outcomes.
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
 *         description: Dashboard data retrieved successfully
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
 *                     currentSemester:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: integer
 *                         name:
 *                           type: string
 *                         semesterCode:
 *                           type: string
 *                     todayCouncils:
 *                       type: array
 *                       description: Council boards the lecturer is assigned to today
 *                       items:
 *                         type: object
 *                         properties:
 *                           boardCode:
 *                             type: string
 *                           name:
 *                             type: string
 *                           role:
 *                             type: string
 *                             enum: [President, Secretary, Member]
 *                           defenseName:
 *                             type: string
 *                             nullable: true
 *                           dayDate:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           slots:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 startTime:
 *                                   type: string
 *                                 endTime:
 *                                   type: string
 *                                 topicCode:
 *                                   type: string
 *                                   nullable: true
 *                                 topicTitle:
 *                                   type: string
 *                                   nullable: true
 *                     upcomingCouncils:
 *                       type: array
 *                       description: Next 5 upcoming council assignments
 *                       items:
 *                         $ref: '#/components/schemas/CouncilBoard'
 *                     pendingAvailability:
 *                       type: array
 *                       description: Defenses where the lecturer has not yet registered all availability days
 *                       items:
 *                         type: object
 *                         properties:
 *                           defenseId:
 *                             type: integer
 *                           defenseCode:
 *                             type: string
 *                           defenseName:
 *                             type: string
 *                             nullable: true
 *                           availabilityEndDate:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           daysLeft:
 *                             type: integer
 *                             nullable: true
 *                           unregisteredDays:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 defenseDayId:
 *                                   type: integer
 *                                 dayDate:
 *                                   type: string
 *                                   format: date-time
 *                     stats:
 *                       type: object
 *                       description: Statistics scoped to the current semester
 *                       properties:
 *                         totalSupervisedTopicsThisSemester:
 *                           type: integer
 *                         totalCouncilBoardsThisSemester:
 *                           type: integer
 *                         topicResultSummary:
 *                           type: object
 *                           properties:
 *                             pending:
 *                               type: integer
 *                             passed:
 *                               type: integer
 *                             failed:
 *                               type: integer
 *                     recentSupervisedTopics:
 *                       type: array
 *                       description: Last 5 supervised topics in current semester with latest defense result
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           topicCode:
 *                             type: string
 *                           title:
 *                             type: string
 *                             nullable: true
 *                           topicType:
 *                             type: string
 *                             nullable: true
 *                           latestDefenseResult:
 *                             type: string
 *                             nullable: true
 *       403:
 *         description: Forbidden - Lecturers can only access their own dashboard
 *       404:
 *         description: Lecturer not found
 *       500:
 *         description: Server Error
 */
export const getLecturerDashboard = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const id = getIdParam(req);

    // Authorization: Lecturers can only access their own dashboard
    const user = req.user;
    const activeRole = getActiveRole(req);

    if (user && activeRole !== "admin") {
      if (user.app_metadata?.lecturerId !== id) {
        return errorResponse(
          res,
          "Forbidden: You can only access your own dashboard",
          403,
        );
      }
    }

    const stats = await lecturerService.getLecturerDashboard(id);
    return successResponse(
      res,
      stats,
      "Lecturer dashboard retrieved successfully",
    );
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
 *     summary: "[ADMIN, LECTURER] Get topics supervised by lecturer"
 *     description: |
 *       Returns the topics supervised by the lecturer, including the latest defense record
 *       and any council assignment created for that defense. This is the primary endpoint
 *       for lecturer-facing "which council will judge my topic" screens.
 *     tags: [Lecturers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lecturer ID
 *       - in: query
 *         name: semesterId
 *         schema:
 *           type: integer
 *         description: Optional semester ID to filter the topics.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of supervised topics with defense/council details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LecturerSupervisedTopicsResponse'
 *       404:
 *         description: Lecturer not found
 *       403:
 *         description: Forbidden - Lecturers can only access their own supervised topics
 *       500:
 *         description: Server Error
 */
export const getSupervisedTopics = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const id = getIdParam(req);

    // Authorization: Lecturers can only access their own supervised topics
    const user = req.user;
    const activeRole = getActiveRole(req);

    if (user && activeRole !== "admin") {
      if (user.app_metadata?.lecturerId !== id) {
        return errorResponse(
          res,
          "Forbidden: You can only access your own supervised topics",
          403,
        );
      }
    }

    const semesterId = req.query.semesterId
      ? parseInt(req.query.semesterId as string)
      : undefined;
    const topics = await lecturerService.getSupervisedTopics(id, {
      semesterId,
    });
    return successResponse(
      res,
      topics,
      "Supervised topics retrieved successfully",
    );
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) return notFoundResponse(res, message);
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/lecturers/{id}/schedule:
 *   get:
 *     summary: "[ADMIN, LECTURER] Get lecturer's defense schedule"
 *     description: Returns a detailed list of all defense councils the lecturer is assigned to, including dates, rooms, and topics.
 *     tags: [Lecturers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lecturer ID
 *       - in: query
 *         name: semesterId
 *         schema:
 *           type: integer
 *         description: Optional semester ID to filter the schedule.
 *     responses:
 *       200:
 *         description: Defense schedule retrieved successfully
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
export const getSchedule = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const id = getIdParam(req);

    // Authorization: Lecturers can only access their own schedule
    const user = req.user;
    const activeRole = getActiveRole(req);

    if (user && activeRole !== "admin") {
      if (user.app_metadata?.lecturerId !== id) {
        return errorResponse(
          res,
          "Forbidden: You can only access your own schedule",
          403,
        );
      }
    }

    const semesterId = req.query.semesterId
      ? parseInt(req.query.semesterId as string)
      : undefined;

    const schedule = await lecturerService.getPersonalSchedule(id, {
      semesterId,
    });
    return successResponse(
      res,
      schedule,
      "Lecturer defense schedule retrieved successfully",
    );
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) return notFoundResponse(res, message);
    return errorResponse(res, message, 500);
  }
};
