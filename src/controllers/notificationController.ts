import { Request, Response } from "express";
import * as notificationService from "../services/notificationService.js";
import { successResponse, errorResponse, notFoundResponse } from "../utils/apiResponse.js";
import { getErrorMessage } from "../utils/typeGuards.js";

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         message:
 *           type: string
 *         type:
 *           type: string
 *           enum: [SYSTEM, AVAILABILITY_PUBLISHED, SCHEDULE_PUBLISHED]
 *           nullable: true
 *         isRead:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *     NotificationListResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/ApiResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: "Get notifications for the current authenticated user"
 *     tags: [Notifications]
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
 *         name: isRead
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationListResponse'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export const getMyNotifications = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = req.user;
    if (!user || !user.id) {
       return errorResponse(res, "Unauthorized or authId not found", 401);
    }
    const authId = user.id; // Supabase UUID
    // Pass query params safely
    const qPage = req.query.page as string | undefined;
    const qLimit = req.query.limit as string | undefined;
    
    let isReadBool: boolean | undefined = undefined;
    if (req.query.isRead !== undefined) {
      isReadBool = req.query.isRead === 'true' || req.query.isRead === '1';
    }

    const query = {
        page: qPage ? Number(qPage) : undefined,
        limit: qLimit ? Number(qLimit) : undefined,
        isRead: isReadBool
    };

    const result = await notificationService.getNotifications(authId, query);
    return successResponse(res, result, "Notifications retrieved successfully");
  } catch (error: unknown) {
    return errorResponse(res, getErrorMessage(error), 500);
  }
};

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: "Mark a notification as read"
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server Error
 */
export const markNotificationAsRead = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = req.user;
    if (!user || !user.id) {
       return errorResponse(res, "Unauthorized or authId not found", 401);
    }
    
    const idParam = req.params.id as string;
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
        return errorResponse(res, "Invalid notification ID", 400);
    }

    const authId = user.id; 
    const notification = await notificationService.markAsRead(id, authId);
    
    return successResponse(res, notification, "Notification marked as read");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (typeof message === "string" && message.includes("not found")) {
      return notFoundResponse(res, message);
    }
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: "Mark all unread notifications as read for current user"
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server Error
 */
export const markAllNotificationsAsRead = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = req.user;
    if (!user || !user.id) {
       return errorResponse(res, "Unauthorized or authId not found", 401);
    }
    const authId = user.id; 
    const count = await notificationService.markAllAsRead(authId);
    
    return successResponse(res, { count }, `Marked ${count} notifications as read`);
  } catch (error: unknown) {
    return errorResponse(res, getErrorMessage(error), 500);
  }
};
