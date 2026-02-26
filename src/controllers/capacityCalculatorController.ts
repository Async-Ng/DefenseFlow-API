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
 *         required: false
 *         schema:
 *           type: integer
 *         description: Optional defense ID to analyze current days and suggest adjustments
 *         example: 1
 *       - in: query
 *         name: timePerTopic
 *         required: false
 *         schema:
 *           type: integer
 *         description: Optional time per topic in minutes (default from defense or 90)
 *         example: 90
 *       - in: query
 *         name: workHoursPerDay
 *         required: false
 *         schema:
 *           type: integer
 *         description: Optional work hours per day in minutes (default 480 = 8 hours)
 *         example: 480
 *       - in: query
 *         name: councilBoardSize
 *         required: false
 *         schema:
 *           type: integer
 *         description: Optional number of members in a council board (default 5)
 *         example: 5
 *       - in: query
 *         name: plannedDays
 *         required: false
 *         schema:
 *           type: integer
 *         description: Optional planned number of days if no defense exists
 *         example: 5
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
      defenseId: req.query.defenseId ? Number(req.query.defenseId) : undefined,
      timePerTopic: req.query.timePerTopic
        ? Number(req.query.timePerTopic)
        : undefined,
      workHoursPerDay: req.query.workHoursPerDay
        ? Number(req.query.workHoursPerDay)
        : undefined,
      councilBoardSize: req.query.councilBoardSize
        ? Number(req.query.councilBoardSize)
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
      requestData.defenseId !== undefined &&
      isNaN(requestData.defenseId)
    ) {
      res.status(400).json({
        success: false,
        error: "defenseId must be a valid number",
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
      requestData.councilBoardSize !== undefined &&
      (isNaN(requestData.councilBoardSize) || requestData.councilBoardSize <= 0)
    ) {
      res.status(400).json({
        success: false,
        error: "councilBoardSize must be a positive number",
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
