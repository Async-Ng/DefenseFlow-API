import { Request, Response } from "express";
import * as dashboardService from "../services/dashboardService.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import { getErrorMessage } from "../utils/typeGuards.js";

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: "[ADMIN] Get overall dashboard statistics"
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/DashboardStats'
 *       500:
 *         description: Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getDashboardStats = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const stats = await dashboardService.getDashboardStats();
    return successResponse(res, stats, "Dashboard statistics retrieved successfully");
  } catch (error: unknown) {
    return errorResponse(res, getErrorMessage(error), 500);
  }
};
