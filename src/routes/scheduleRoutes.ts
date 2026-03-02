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
 * /api/schedule/defense-councils:
 *   post:
 *     summary: "[ADMIN] Manually assign a topic to a council board"
 *     description: Creates a new defense council slot for a specific topic registration. Useful for manually handling leftover topics.
 *     tags: [Schedule]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - registrationId
 *               - councilBoardId
 *               - startTime
 *               - endTime
 *             properties:
 *               registrationId:
 *                 type: integer
 *                 description: ID of the topic registration (TopicDefense)
 *                 example: 10
 *               councilBoardId:
 *                 type: integer
 *                 description: ID of the council board to assign to
 *                 example: 5
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 description: Start time of the defense slot
 *                 example: "2024-05-20T08:00:00.000Z"
 *               endTime:
 *                 type: string
 *                 format: date-time
 *                 description: End time of the defense slot
 *                 example: "2024-05-20T08:45:00.000Z"
 *     responses:
 *       201:
 *         description: Topic assigned to council successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Defense council created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/DefenseCouncil'
 *       400:
 *         description: Invalid input or missing required fields
 *       500:
 *         description: Server error
 */
router.post("/defense-councils", scheduleController.createDefenseCouncil);

/**
 * @swagger
 * /api/schedule/defense-councils/{id}:
 *   delete:
 *     summary: "[ADMIN] Remove a topic from a council board"
 *     description: Deletes a specific defense council slot, making the topic unscheduled again.
 *     tags: [Schedule]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the defense council slot to delete
 *     responses:
 *       200:
 *         description: Topic removed from council successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Topic removed from council successfully"
 *       404:
 *         description: Defense council slot not found
 *       500:
 *         description: Server error
 */
router.delete("/defense-councils/:id", scheduleController.deleteDefenseCouncil);

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
