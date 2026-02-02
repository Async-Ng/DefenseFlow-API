import express from "express";
import * as scheduleController from "../controllers/scheduleController.js";

const router: express.Router = express.Router();

/**
 * @swagger
 * /api/schedule/generate:
 *   post:
 *     summary: Generate draft schedule for a session
 *     tags: [Schedule]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Schedule generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScheduleGenerationResult'
 *       400:
 *         description: Invalid input or preconditions not met
 */
router.post("/generate", scheduleController.generateSchedule);

/**
 * @swagger
 * /api/schedule/{sessionId}:
 *   get:
 *     summary: Get generated schedule for a session
 *     tags: [Schedule]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the session
 *     responses:
 *       200:
 *         description: Schedule retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Council'
 *       404:
 *         description: Session not found
 */
router.get("/:sessionId", scheduleController.getSchedule);

export default router;
