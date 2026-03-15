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
 * /api/availability/defenses/{defenseId}/days:
 *   get:
 *     summary: "[ADMIN, LECTURER] Get all defense days for a specific defense"
 *     description: |
 *       Returns all scheduled days for a particular defense round.
 *       **Access conditions:** The defense must have `isAvailabilityPublished = true` AND the current date must be within
 *       the `availabilityStartDate` – `availabilityEndDate` window (if configured). Admins bypass the window check.
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: defenseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The unique ID of the defense round
 *         example: 1
 *     responses:
 *       200:
 *         description: Successfully retrieved defense days
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DefenseDaysResponse'
 *       400:
 *         description: Availability not published yet, registration window not open, or registration period has ended
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Defense round not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getDefenseDays = async (
  req: Request<{ defenseId: string }>,
  res: Response,
): Promise<void> => {
  try {
    const defenseId = parseInt(req.params.defenseId, 10);

    if (isNaN(defenseId)) {
      errorResponse(res, "Invalid defense ID", 400);
      return;
    }

    const defenseDays = await availabilityService.getDefenseDays(defenseId);
    successResponse(res, defenseDays, "Defense days retrieved successfully");
  } catch (error) {
    const message = getErrorMessage(error);
    if (message.includes("not found") || message.includes("Không tìm thấy")) {
      errorResponse(res, message, 404);
    } else if (
      message.includes("not been published yet") ||
      message.includes("Lịch bảo vệ chưa được công bố") ||
      message.includes("Registration opens on") ||
      message.includes("Thời gian đăng ký nguyện vọng chưa bắt đầu") ||
      message.includes("period has ended") ||
      message.includes("Thời gian đăng ký nguyện vọng đã kết thúc")
    ) {
      errorResponse(res, message, 400);
    } else {
      errorResponse(res, message, 500);
    }
  }
};

/**
 * @swagger
 * /api/availability/defenses/{defenseId}/days/with-availability:
 *   get:
 *     summary: "[ADMIN, LECTURER] Get defense days with lecturer's availability status"
 *     description: |
 *       Returns all defense days for a specific round, indicating for each day whether the specified lecturer is 'Available' or 'Busy'.
 *       **Access conditions:** The defense must have `isAvailabilityPublished = true` AND the current date must be within
 *       the `availabilityStartDate` – `availabilityEndDate` window (if configured). Admins bypass the window check but must still submit their own `lecturerId`.
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: defenseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The unique ID of the defense round
 *         example: 1
 *       - in: query
 *         name: lecturerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The unique ID of the lecturer
 *         example: 5
 *     responses:
 *       200:
 *         description: Successfully retrieved defense days with availability status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DefenseDaysWithAvailabilityResponse'
 *       400:
 *         description: Availability not published, registration window not open/closed, or lecturerId missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Lecturer tried to view another lecturer's availability
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Defense or lecturer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getDefenseDaysWithAvailability = async (
  req: Request<{ defenseId: string }, {}, {}, { lecturerId?: string }>,
  res: Response,
): Promise<void> => {
  try {
    const defenseId = parseInt(req.params.defenseId, 10);
    const lecturerId = req.query.lecturerId
      ? parseInt(req.query.lecturerId, 10)
      : undefined;

    // Authorization: Lecturers can only access their own availability
    const user = req.user;
    if (user && !user.app_metadata?.roles?.includes("admin")) {
      if (lecturerId !== user.app_metadata?.lecturerId) {
        errorResponse(res, "Forbidden: You can only view your own availability", 403);
        return;
      }
    }

    if (isNaN(defenseId)) {
      errorResponse(res, "Invalid defense ID", 400);
      return;
    }

    if (!lecturerId || isNaN(lecturerId)) {
      errorResponse(res, "Valid lecturer ID is required", 400);
      return;
    }

    const defenseDays = await availabilityService.getDefenseDaysWithAvailability(
      defenseId,
      lecturerId,
    );
    successResponse(
      res,
      defenseDays,
      "Defense days with availability retrieved successfully",
    );
  } catch (error) {
    const message = getErrorMessage(error);
    if (message.includes("not found") || message.includes("Không tìm thấy")) {
      errorResponse(res, message, 404);
    } else if (
      message.includes("not been published yet") ||
      message.includes("Lịch bảo vệ chưa được công bố") ||
      message.includes("Registration opens on") ||
      message.includes("Thời gian đăng ký nguyện vọng chưa bắt đầu") ||
      message.includes("period has ended") ||
      message.includes("Thời gian đăng ký nguyện vọng đã kết thúc") ||
      message.includes("Valid lecturer ID is required") ||
      message.includes("Bạn không có tên")
    ) {
      errorResponse(res, message, 400);
    } else {
      errorResponse(res, message, 500);
    }
  }
};

/**
 * @swagger
 * /api/availability/lecturers/{lecturerId}/status:
 *   get:
 *     summary: "[ADMIN, LECTURER] Get lecturer's registration status for a defense"
 *     description: Checks if a lecturer has completed their registration (availability) for a specific defense round. Returns counts of available/busy days.
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: lecturerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The unique ID of the lecturer
 *         example: 5
 *       - in: query
 *         name: defenseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The unique ID of the defense round
 *         example: 1
 *     responses:
 *       200:
 *         description: Successfully retrieved registration status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LecturerStatusResultResponse'
 *       400:
 *         description: Invalid parameters or defenseId missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Lecturer or defense round not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getLecturerStatus = async (
  req: Request<{ lecturerId: string }, {}, {}, { defenseId?: string }>,
  res: Response,
): Promise<void> => {
  try {
    const lecturerId = parseInt(req.params.lecturerId, 10);
    const defenseId = req.query.defenseId
      ? parseInt(req.query.defenseId, 10)
      : undefined;

    // Authorization: Lecturers can only access their own status
    const user = req.user;
    if (user && !user.app_metadata?.roles?.includes("admin")) {
      if (lecturerId !== user.app_metadata?.lecturerId) {
        errorResponse(res, "Forbidden: You can only view your own status", 403);
        return;
      }
    }

    if (isNaN(lecturerId)) {
      errorResponse(res, "Invalid lecturer ID", 400);
      return;
    }

    if (!defenseId || isNaN(defenseId)) {
      errorResponse(res, "Valid defense ID is required", 400);
      return;
    }

    const status = await availabilityService.getLecturerStatus(
      lecturerId,
      defenseId,
    );
    successResponse(res, status, "Lecturer status retrieved successfully");
  } catch (error) {
    const message = getErrorMessage(error);
    if (message.includes("not found") || message.includes("Không tìm thấy")) {
      errorResponse(res, message, 404);
    } else if (
      message.includes("not been published yet") ||
      message.includes("Lịch bảo vệ chưa được công bố") ||
      message.includes("Bạn không có tên")
    ) {
      errorResponse(res, message, 400);
    } else {
      errorResponse(res, message, 500);
    }
  }
};

/**
 * @swagger
 * /api/availability/lecturers/{lecturerId}/availability:
 *   put:
 *     summary: "[LECTURER] Update lecturer availability for a specific defense day"
 *     description: |
 *       Creates or updates a single availability record for a lecturer on a specific defense day.
 *       **Requires** the defense to have `isAvailabilityPublished = true` and current date to be within `availabilityStartDate` – `availabilityEndDate` (if set).
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: lecturerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The unique ID of the lecturer
 *         example: 5
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - defenseDayId
 *               - status
 *             properties:
 *               defenseDayId:
 *                 type: integer
 *                 description: ID of the defense day
 *                 example: 1
 *               status:
 *                 $ref: '#/components/schemas/AvailabilityStatus'
 *     responses:
 *       200:
 *         description: Availability updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AvailabilityResponse'
 *       400:
 *         description: Invalid input, invalid status, availability not published, registration not open, or period closed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Lecturer or defense day not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
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
    const { defenseDayId, status } = req.body;

    // Authorization: Lecturers can only update their own availability
    const user = req.user;
    if (user && !user.app_metadata?.roles?.includes("admin")) {
      if (lecturerId !== user.app_metadata?.lecturerId) {
        errorResponse(res, "Forbidden: You can only modify your own availability", 403);
        return;
      }
    }

    if (isNaN(lecturerId)) {
      errorResponse(res, "Invalid lecturer ID", 400);
      return;
    }

    if (!defenseDayId || !status) {
      errorResponse(res, "Defense day ID and status are required", 400);
      return;
    }

    if (!["Available", "Busy"].includes(status)) {
      errorResponse(res, "Status must be 'Available' or 'Busy'", 400);
      return;
    }

    const availability = await availabilityService.updateAvailability(
      lecturerId,
      defenseDayId,
      status,
    );
    successResponse(res, availability, "Availability updated successfully");
  } catch (error) {
    const message = getErrorMessage(error);
    if (message.includes("not found") || message.includes("Không tìm thấy")) {
      errorResponse(res, message, 404);
    } else if (
      message.includes("closed") ||
      message.includes("Đợt đăng ký đã đóng") ||
      message.includes("not been published yet") ||
      message.includes("Lịch bảo vệ chưa được công bố") ||
      message.includes("Thời gian đăng ký nguyện vọng") ||
      message.includes("Bạn không có tên")
    ) {
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
 *     summary: "[LECTURER] Batch update lecturer availability for multiple defense days"
 *     description: Efficiently updates multiple availability records at once. All days must belong to the same defense round.
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: lecturerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The unique ID of the lecturer
 *         example: 5
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
 *                 description: List of availability updates
 *                 items:
 *                   type: object
 *                   required:
 *                     - defenseDayId
 *                     - status
 *                   properties:
 *                     defenseDayId:
 *                       type: integer
 *                       description: ID of the defense day
 *                       example: 1
 *                     status:
 *                       $ref: '#/components/schemas/AvailabilityStatus'
 *     responses:
 *       200:
 *         description: All availabilities updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AvailabilityListResponse'
 *       400:
 *         description: Invalid input, days from different defenses, or registration closed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Lecturer or one of the defense days not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
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

    // Authorization: Lecturers can only update their own availability
    const user = req.user;
    if (user && !user.app_metadata?.roles?.includes("admin")) {
      if (lecturerId !== user.app_metadata?.lecturerId) {
        errorResponse(res, "Forbidden: You can only modify your own availability", 403);
        return;
      }
    }

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
      if (!avail.defenseDayId || !avail.status) {
        errorResponse(
          res,
          "Each availability must have defenseDayId and status",
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
    if (message.includes("not found") || message.includes("Không tìm thấy")) {
      errorResponse(res, message, 404);
    } else if (
      message.includes("closed") ||
      message.includes("Đợt đăng ký đã đóng") ||
      message.includes("same defense") ||
      message.includes("cùng một đợt bảo vệ") ||
      message.includes("not been published yet") ||
      message.includes("Lịch bảo vệ chưa được công bố") ||
      message.includes("Registration opens on") ||
      message.includes("Thời gian đăng ký nguyện vọng") ||
      message.includes("Bạn không có tên")
    ) {
      errorResponse(res, message, 400);
    } else {
      errorResponse(res, message, 500);
    }
  }
};

/**
 * @swagger
 * /api/availability/lecturers/{lecturerId}/availability/{defenseDayId}:
 *   delete:
 *     summary: "[LECTURER] Remove availability record"
 *     description: Deletes an availability record for a lecturer on a specific day. Effectively reverts the status to 'Available' (default).
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: lecturerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The unique ID of the lecturer
 *         example: 5
 *       - in: path
 *         name: defenseDayId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The unique ID of the defense day
 *         example: 1
 *     responses:
 *       200:
 *         description: Availability record removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               items:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                     example: true
 *                   message:
 *                     type: string
 *                     example: "Availability removed successfully (reverted to Available)"
 *       400:
 *         description: Invalid parameters or registration period closed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Lecturer or availability record not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const removeAvailability = async (
  req: Request<{ lecturerId: string; defenseDayId: string }>,
  res: Response,
): Promise<void> => {
  try {
    const lecturerId = parseInt(req.params.lecturerId, 10);
    const defenseDayId = parseInt(req.params.defenseDayId, 10);

    // Authorization: Lecturers can only update their own availability
    const user = req.user;
    if (user && !user.app_metadata?.roles?.includes("admin")) {
      if (lecturerId !== user.app_metadata?.lecturerId) {
        errorResponse(res, "Forbidden: You can only modify your own availability", 403);
        return;
      }
    }

    if (isNaN(lecturerId)) {
      errorResponse(res, "Invalid lecturer ID", 400);
      return;
    }

    if (isNaN(defenseDayId)) {
      errorResponse(res, "Invalid defense day ID", 400);
      return;
    }

    await availabilityService.removeAvailability(lecturerId, defenseDayId);
    successResponse(
      res,
      null,
      "Availability removed successfully (reverted to Available)",
    );
  } catch (error) {
    const message = getErrorMessage(error);
    if (message.includes("not found") || message.includes("Không tìm thấy")) {
      errorResponse(res, message, 404);
    } else if (
      message.includes("closed") ||
      message.includes("Đợt đăng ký đã đóng") ||
      message.includes("not been published yet") ||
      message.includes("Lịch bảo vệ chưa được công bố") ||
      message.includes("Thời gian đăng ký nguyện vọng") ||
      message.includes("Bạn không có tên")
    ) {
      errorResponse(res, message, 400);
    } else {
      errorResponse(res, message, 500);
    }
  }
};
/**
 * @swagger
 * /api/availability/defense-days/{defenseDayId}/available-lecturers:
 *   get:
 *     summary: "[ADMIN] Get available lecturers for a specific defense day"
 *     description: Returns lecturers who are not 'Busy' and have not been assigned to any board on the given defense day.
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: defenseDayId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The unique ID of the defense day
 *         example: 1
 *     responses:
 *       200:
 *         description: Successfully retrieved available lecturers
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LecturerSimpleListResponse'
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: Defense day not found
 *       500:
 *         description: Internal server error
 */
export const getAvailableLecturers = async (
  req: Request<{ defenseDayId: string }>,
  res: Response,
): Promise<void> => {
  try {
    const defenseDayId = parseInt(req.params.defenseDayId, 10);

    if (isNaN(defenseDayId)) {
      errorResponse(res, "Invalid defense day ID", 400);
      return;
    }

    const lecturers = await availabilityService.getAvailableLecturers(defenseDayId);
    successResponse(res, lecturers, "Available lecturers retrieved successfully");
  } catch (error) {
    const message = getErrorMessage(error);
    if (message.includes("not found") || message.includes("Không tìm thấy")) {
      errorResponse(res, message, 404);
    } else {
      errorResponse(res, message, 500);
    }
  }
};
