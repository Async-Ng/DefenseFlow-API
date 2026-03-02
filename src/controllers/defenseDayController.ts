import { Request, Response } from "express";
import * as defenseDayService from "../services/defenseDayService.js";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} from "../utils/apiResponse.js";
import { getErrorMessage } from "../utils/typeGuards.js";

/**
 * @swagger
 * /api/defenses/{defenseId}/days/{dayId}:
 *   patch:
 *     summary: "[ADMIN] Update a defense day"
 *     tags: [Defenses]
 *     parameters:
 *       - in: path
 *         name: defenseId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: dayId
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
 *               dayDate:
 *                 type: string
 *                 format: date-time
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Defense day updated successfully
 */
export const updateDefenseDay = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const dayId = parseInt(req.params.dayId as string);
    if (isNaN(dayId)) return errorResponse(res, "Invalid dayId", 400);

    const day = await defenseDayService.updateDefenseDay(dayId, req.body);
    return successResponse(res, day, "Defense Day updated successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) return notFoundResponse(res, message);
    if (message.includes("already scheduled")) return validationErrorResponse(res, { message });
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/defenses/{defenseId}/days/{dayId}:
 *   delete:
 *     summary: "[ADMIN] Delete a defense day"
 *     tags: [Defenses]
 *     parameters:
 *       - in: path
 *         name: defenseId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: dayId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Defense day deleted
 */
export const deleteDefenseDay = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const dayId = parseInt(req.params.dayId as string);
    if (isNaN(dayId)) return errorResponse(res, "Invalid dayId", 400);

    await defenseDayService.deleteDefenseDay(dayId);
    return successResponse(res, null, "Defense Day deleted successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) return notFoundResponse(res, message);
    return errorResponse(res, message, 500);
  }
};
