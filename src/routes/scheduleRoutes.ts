import express from "express";
import * as scheduleController from "../controllers/scheduleController.js";

const router: express.Router = express.Router();

/**
 * @swagger
 * /api/schedule/generate:
 *   post:
 *     summary: Generate draft schedule for a defense
 *     tags: [Schedule]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - defenseId
 *             properties:
 *               defenseId:
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
 * /api/schedule/publish:
 *   post:
 *     summary: Publish schedule
 *     tags: [Schedule]
 */
router.post("/publish", scheduleController.publishSchedule);

/**
 * @swagger
 * /api/schedule/defense-councils/{defenseCouncilId}:
 *   put:
 *     summary: Update defense council (Manual Scheduling)
 *     tags: [Schedule]
 */
router.put("/defense-councils/:defenseCouncilId", scheduleController.updateDefenseCouncil);

/**
 * @swagger
 * /api/schedule/council-boards/{councilBoardId}:
 *   put:
 *     summary: Update council board members
 *     tags: [Schedule]
 */
router.put("/council-boards/:councilBoardId", scheduleController.updateCouncilBoard);

/**
 * @swagger
 * /api/schedule/council-boards/{id}:
 *   get:
 *     summary: Get council board details by ID
 *     tags: [Schedule]
 */
router.get("/council-boards/:id", scheduleController.getCouncilBoardById);

/**
 * @swagger
 * /api/schedule/{defenseId}:
 *   get:
 *     summary: Get generated schedule for a defense
 *     tags: [Schedule]
 *     parameters:
 *       - in: path
 *         name: defenseId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the defense
 *     responses:
 *       200:
 *         description: Schedule retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CouncilBoard'
 *       404:
 *         description: Defense not found
 */
router.get("/:defenseId", scheduleController.getSchedule);

/**
 * GET /api/schedule/:defenseId/export
 * Export schedule to Excel
 */
router.get("/:defenseId/export", scheduleController.exportSchedule);

export default router;
