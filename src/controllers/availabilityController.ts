/**
 * Availability Controller
 * HTTP request handlers for lecturer availability operations
 */

import { Request, Response } from "express";
import * as availabilityService from "../services/availabilityService.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import { getErrorMessage } from "../utils/typeGuards.js";
import type {
  UpdateAvailabilityInput,
  BatchUpdateAvailabilityInput,
} from "../types/index.js";

/**
 * @swagger
 * /api/availability/sessions/{sessionId}/days:
 *   get:
 *     summary: Get all session days for a specific session
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session days retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Session not found
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
export const getSessionDays = async (
  req: Request<{ sessionId: string }>,
  res: Response,
): Promise<void> => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);

    if (isNaN(sessionId)) {
      errorResponse(res, "Invalid session ID", 400);
      return;
    }

    const sessionDays = await availabilityService.getSessionDays(sessionId);
    successResponse(res, sessionDays, "Session days retrieved successfully");
  } catch (error) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) {
      errorResponse(res, message, 404);
    } else {
      errorResponse(res, message, 500);
    }
  }
};

/**
 * @swagger
 * /api/availability/sessions/{sessionId}/days/with-availability:
 *   get:
 *     summary: Get session days with lecturer's availability status
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Session ID
 *       - in: query
 *         name: lecturerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lecturer ID
 *     responses:
 *       200:
 *         description: Session days with availability retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Session or lecturer not found
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
export const getSessionDaysWithAvailability = async (
  req: Request<{ sessionId: string }, {}, {}, { lecturerId?: string }>,
  res: Response,
): Promise<void> => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    const lecturerId = req.query.lecturerId
      ? parseInt(req.query.lecturerId, 10)
      : undefined;

    if (isNaN(sessionId)) {
      errorResponse(res, "Invalid session ID", 400);
      return;
    }

    if (!lecturerId || isNaN(lecturerId)) {
      errorResponse(res, "Valid lecturer ID is required", 400);
      return;
    }

    const sessionDays = await availabilityService.getSessionDaysWithAvailability(
      sessionId,
      lecturerId,
    );
    successResponse(
      res,
      sessionDays,
      "Session days with availability retrieved successfully",
    );
  } catch (error) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) {
      errorResponse(res, message, 404);
    } else {
      errorResponse(res, message, 500);
    }
  }
};

/**
 * @swagger
 * /api/availability/lecturers/{lecturerId}/status:
 *   get:
 *     summary: Get lecturer's registered status for a session
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: lecturerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lecturer ID
 *       - in: query
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Lecturer status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Lecturer or session not found
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
export const getLecturerStatus = async (
  req: Request<{ lecturerId: string }, {}, {}, { sessionId?: string }>,
  res: Response,
): Promise<void> => {
  try {
    const lecturerId = parseInt(req.params.lecturerId, 10);
    const sessionId = req.query.sessionId
      ? parseInt(req.query.sessionId, 10)
      : undefined;

    if (isNaN(lecturerId)) {
      errorResponse(res, "Invalid lecturer ID", 400);
      return;
    }

    if (!sessionId || isNaN(sessionId)) {
      errorResponse(res, "Valid session ID is required", 400);
      return;
    }

    const status = await availabilityService.getLecturerStatus(
      lecturerId,
      sessionId,
    );
    successResponse(res, status, "Lecturer status retrieved successfully");
  } catch (error) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) {
      errorResponse(res, message, 404);
    } else {
      errorResponse(res, message, 500);
    }
  }
};

/**
 * @swagger
 * /api/availability/lecturers/{lecturerId}/availability:
 *   put:
 *     summary: Update lecturer availability for a specific session day
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: lecturerId
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
 *             required:
 *               - sessionDayId
 *               - status
 *             properties:
 *               sessionDayId:
 *                 type: integer
 *                 example: 1
 *               status:
 *                 type: string
 *                 enum: [Available, Busy]
 *                 example: "Busy"
 *     responses:
 *       200:
 *         description: Availability updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid input or registration closed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Lecturer or session day not found
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
export const updateAvailability = async (
  req: Request<{ lecturerId: string }, {}, UpdateAvailabilityInput>,
  res: Response,
): Promise<void> => {
  try {
    const lecturerId = parseInt(req.params.lecturerId, 10);
    const { sessionDayId, status } = req.body;

    if (isNaN(lecturerId)) {
      errorResponse(res, "Invalid lecturer ID", 400);
      return;
    }

    if (!sessionDayId || !status) {
      errorResponse(res, "Session day ID and status are required", 400);
      return;
    }

    if (!["Available", "Busy"].includes(status)) {
      errorResponse(res, "Status must be 'Available' or 'Busy'", 400);
      return;
    }

    const availability = await availabilityService.updateAvailability(
      lecturerId,
      sessionDayId,
      status,
    );
    successResponse(res, availability, "Availability updated successfully");
  } catch (error) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) {
      errorResponse(res, message, 404);
    } else if (message.includes("closed")) {
      errorResponse(res, message, 400);
    } else {
      errorResponse(res, message, 500);
    }
  }
};

/**
 * @swagger
 * /api/availability/lecturers/{lecturerId}/availability/batch:
 *   put:
 *     summary: Batch update lecturer availability for multiple session days
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: lecturerId
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
 *             required:
 *               - availabilities
 *             properties:
 *               availabilities:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     sessionDayId:
 *                       type: integer
 *                       example: 1
 *                     status:
 *                       type: string
 *                       enum: [Available, Busy]
 *                       example: "Busy"
 *     responses:
 *       200:
 *         description: Availability updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid input or registration closed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Lecturer or session day not found
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
export const batchUpdateAvailability = async (
  req: Request<{ lecturerId: string }, {}, BatchUpdateAvailabilityInput>,
  res: Response,
): Promise<void> => {
  try {
    const lecturerId = parseInt(req.params.lecturerId, 10);
    const data = req.body;

    if (isNaN(lecturerId)) {
      errorResponse(res, "Invalid lecturer ID", 400);
      return;
    }

    if (!data.availabilities || !Array.isArray(data.availabilities)) {
      errorResponse(res, "Availabilities array is required", 400);
      return;
    }

    // Validate each availability entry
    for (const avail of data.availabilities) {
      if (!avail.sessionDayId || !avail.status) {
        errorResponse(
          res,
          "Each availability must have sessionDayId and status",
          400,
        );
        return;
      }
      if (!["Available", "Busy"].includes(avail.status)) {
        errorResponse(res, "Status must be 'Available' or 'Busy'", 400);
        return;
      }
    }

    const availabilities = await availabilityService.batchUpdateAvailability(
      lecturerId,
      data,
    );
    successResponse(
      res,
      availabilities,
      "Availability updated successfully for all days",
    );
  } catch (error) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) {
      errorResponse(res, message, 404);
    } else if (message.includes("closed") || message.includes("same session")) {
      errorResponse(res, message, 400);
    } else {
      errorResponse(res, message, 500);
    }
  }
};

/**
 * @swagger
 * /api/availability/lecturers/{lecturerId}/availability/{sessionDayId}:
 *   delete:
 *     summary: Remove availability record (revert to Available)
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: lecturerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lecturer ID
 *       - in: path
 *         name: sessionDayId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Session Day ID
 *     responses:
 *       200:
 *         description: Availability removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid input or registration closed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Lecturer or session day not found
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
export const removeAvailability = async (
  req: Request<{ lecturerId: string; sessionDayId: string }>,
  res: Response,
): Promise<void> => {
  try {
    const lecturerId = parseInt(req.params.lecturerId, 10);
    const sessionDayId = parseInt(req.params.sessionDayId, 10);

    if (isNaN(lecturerId)) {
      errorResponse(res, "Invalid lecturer ID", 400);
      return;
    }

    if (isNaN(sessionDayId)) {
      errorResponse(res, "Invalid session day ID", 400);
      return;
    }

    await availabilityService.removeAvailability(lecturerId, sessionDayId);
    successResponse(
      res,
      null,
      "Availability removed successfully (reverted to Available)",
    );
  } catch (error) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) {
      errorResponse(res, message, 404);
    } else if (message.includes("closed")) {
      errorResponse(res, message, 400);
    } else {
      errorResponse(res, message, 500);
    }
  }
};
