/**
 * Capacity Calculator Controller
 * Handles HTTP requests for defense capacity calculations
 */

import type { Request, Response, NextFunction } from "express";
import * as capacityService from "../services/capacityCalculatorService.js";
import type { CapacityCalculationRequest } from "../types/index.js";

/**
 * @swagger
 * /api/capacity/calculate:
 *   get:
 *     summary: Calculate defense capacity and provide planning recommendations
 *     tags: [Capacity]
 *     description: |
 *       **Only semesterId is required** - other parameters are auto-derived from:
 *       - Defense data (if semester has defenses)
 *       - Default values (if no defense exists)
 *       
 *       Analyzes and provides recommendations for:
 *       - Required defense days
 *       - Lecturer count (min/recommended/max)
 *       - Workload distribution
 *       - Topics per council board per day
 *       - Defense day adjustments (if defenseId provided)
 *     parameters:
 *       - in: query
 *         name: semesterId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the semester to calculate capacity for
 *         example: 1
 *       - in: query
 *         name: defenseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the defense round to calculate capacity for
 *         example: 1
 *     responses:
 *       200:
 *         description: Capacity calculation successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     semesterId:
 *                       type: integer
 *                     defenseId:
 *                       type: integer
 *                       nullable: true
 *                     analysis:
 *                       type: object
 *                       properties:
 *                         totalTopics:
 *                           type: integer
 *                         timePerTopic:
 *                           type: integer
 *                         workHoursPerDay:
 *                           type: integer
 *                         councilBoardSize:
 *                           type: integer
 *                     recommendations:
 *                       type: object
 *                       properties:
 *                         minimumDaysRequired:
 *                           type: integer
 *                         recommendedDays:
 *                           type: integer
 *                         currentDefenseDays:
 *                           type: integer
 *                           nullable: true
 *                         defenseDayAdjustment:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             shouldAdjust:
 *                               type: boolean
 *                             suggestedChange:
 *                               type: integer
 *                             reason:
 *                               type: string
 *                         minLecturersRequired:
 *                           type: integer
 *                         recommendedLecturers:
 *                           type: integer
 *                         maxLecturersNeeded:
 *                           type: integer
 *                         topicsPerCouncilBoardPerDay:
 *                           type: object
 *                           properties:
 *                             minimum:
 *                               type: integer
 *                             maximum:
 *                               type: integer
 *                             average:
 *                               type: integer
 *                         councilBoardsPerDay:
 *                           type: integer
 *                         lecturerWorkload:
 *                           type: object
 *                           properties:
 *                             recommendedMin:
 *                               type: integer
 *                             recommendedMax:
 *                               type: integer
 *                             idealAverage:
 *                               type: integer
 *                     warnings:
 *                       type: array
 *                       items:
 *                         type: string
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *       404:
 *         description: Semester or defense not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 */
export async function calculateCapacity(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const requestData: CapacityCalculationRequest = {
      semesterId: Number(req.query.semesterId),
      defenseId: Number(req.query.defenseId),
    };

    // Validate required fields
    if (!requestData.semesterId || isNaN(requestData.semesterId)) {
      res.status(400).json({
        success: false,
        error: "semesterId is required and must be a valid number",
      });
      return;
    }

    if (!requestData.defenseId || isNaN(requestData.defenseId)) {
      res.status(400).json({
        success: false,
        error: "defenseId is required and must be a valid number",
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
