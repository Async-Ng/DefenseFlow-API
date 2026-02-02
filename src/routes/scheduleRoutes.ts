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
 *       400:
 *         description: Invalid input or preconditions not met
 */
router.post("/generate", scheduleController.generateSchedule);

export default router;
