/**
 * Capacity Calculator Controller
 * Handles HTTP requests for session capacity calculations
 */

import type { Request, Response, NextFunction } from "express";
import * as capacityService from "../services/capacityCalculatorService.js";
import type { CapacityCalculationRequest } from "../types/index.js";

/**
 * @swagger
 * /api/capacity/calculate:
 *   get:
 *     summary: Calculate session capacity and provide planning recommendations
 *     tags: [Capacity]
 *     description: |
 *       **Only semesterId is required** - other parameters are auto-derived from:
 *       - Session data (if semester has sessions)
 *       - Default values (if no session exists)
 *       
 *       Analyzes and provides recommendations for:
 *       - Required session days
 *       - Lecturer count (min/recommended/max)
 *       - Workload distribution
 *       - Topics per council per day
 *       - Session day adjustments (if sessionId provided)
 *     parameters:
 *       - in: query
 *         name: semesterId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the semester to calculate capacity for
 *         example: 1
 *       - in: query
 *         name: sessionId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Optional session ID to analyze current days and suggest adjustments
 *         example: 1
 *       - in: query
 *         name: timePerTopic
 *         required: false
 *         schema:
 *           type: integer
 *         description: Optional time per topic in minutes (default from session or 90)
 *         example: 90
 *       - in: query
 *         name: workHoursPerDay
 *         required: false
 *         schema:
 *           type: integer
 *         description: Optional work hours per day in minutes (default 480 = 8 hours)
 *         example: 480
 *       - in: query
 *         name: councilSize
 *         required: false
 *         schema:
 *           type: integer
 *         description: Optional number of members in a council (default 5)
 *         example: 5
 *       - in: query
 *         name: plannedDays
 *         required: false
 *         schema:
 *           type: integer
 *         description: Optional planned number of days if no session exists
 *         example: 5
 *     responses:
 *       200:
 *         description: Capacity calculation successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CapacityCalculationResponse'
 *       400:
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Semester or session not found
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
export async function calculateCapacity(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const requestData: CapacityCalculationRequest = {
      semesterId: Number(req.query.semesterId),
      sessionId: req.query.sessionId ? Number(req.query.sessionId) : undefined,
      timePerTopic: req.query.timePerTopic
        ? Number(req.query.timePerTopic)
        : undefined,
      workHoursPerDay: req.query.workHoursPerDay
        ? Number(req.query.workHoursPerDay)
        : undefined,
      councilSize: req.query.councilSize
        ? Number(req.query.councilSize)
        : undefined,
      plannedDays: req.query.plannedDays
        ? Number(req.query.plannedDays)
        : undefined,
    };

    // Validate required fields
    if (!requestData.semesterId || isNaN(requestData.semesterId)) {
      res.status(400).json({
        success: false,
        error: "semesterId is required and must be a valid number",
      });
      return;
    }

    // Validate optional numeric fields
    if (
      requestData.sessionId !== undefined &&
      isNaN(requestData.sessionId)
    ) {
      res.status(400).json({
        success: false,
        error: "sessionId must be a valid number",
      });
      return;
    }

    if (
      requestData.timePerTopic !== undefined &&
      (isNaN(requestData.timePerTopic) || requestData.timePerTopic <= 0)
    ) {
      res.status(400).json({
        success: false,
        error: "timePerTopic must be a positive number",
      });
      return;
    }

    if (
      requestData.workHoursPerDay !== undefined &&
      (isNaN(requestData.workHoursPerDay) || requestData.workHoursPerDay <= 0)
    ) {
      res.status(400).json({
        success: false,
        error: "workHoursPerDay must be a positive number",
      });
      return;
    }

    if (
      requestData.councilSize !== undefined &&
      (isNaN(requestData.councilSize) || requestData.councilSize <= 0)
    ) {
      res.status(400).json({
        success: false,
        error: "councilSize must be a positive number",
      });
      return;
    }

    if (
      requestData.plannedDays !== undefined &&
      (isNaN(requestData.plannedDays) || requestData.plannedDays <= 0)
    ) {
      res.status(400).json({
        success: false,
        error: "plannedDays must be a positive number",
      });
      return;
    }

    const result = await capacityService.calculateCapacity(requestData);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
