import { Request, Response, NextFunction } from "express";
import * as scheduleService from "../services/scheduleService.js";
import { prisma } from "../config/prisma.js";
import { successResponse } from "../utils/apiResponse.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  getCouncilBoardFilters,
  getPaginationParams,
  getSortParams,
  getIdParam,
  getActiveRole,
} from "../utils/requestHelpers.js";
import { z } from "zod";

/**
 * @swagger
 * /api/schedule/generate:
 *   post:
 *     summary: "[ADMIN] Generate schedule for a defense"
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
 *                 description: Defense ID to generate schedule for
 *                 example: 1
 *     responses:
 *       201:
 *         description: Schedule generated successfully
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
 *                   example: "Schedule generated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "success"
 *                     metrics:
 *                       type: object
 *                       properties:
 *                         totalTopics:
 *                           type: integer
 *                           example: 10
 *                         scheduled:
 *                           type: integer
 *                           example: 8
 *                         unscheduled:
 *                           type: integer
 *                           example: 2
 *                     unscheduledTopics:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["TOPIC_001", "TOPIC_002"]
 *                     warnings:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Councils that did not meet seniority requirements
 *                       example: ["CouncilBoard CB-001: No Senior or MidLevel available. Best-effort used."]
 *       400:
 *         description: Validation error
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
export const generateSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schema = z.object({
      defenseId: z.number({ required_error: "ID đợt bảo vệ là bắt buộc" }).int(),
    });

    const validation = schema.safeParse(req.body);

    if (!validation.success) {
      throw new AppError(400, validation.error.errors[0].message);
    }

    const { defenseId } = validation.data;

    const result = await scheduleService.generateSchedule(defenseId);

    return successResponse(res, result, "Schedule generated successfully", 201);
  } catch (error) {
    return next(error);
  }
};

/**
 * @swagger
 * /api/schedule/{defenseId}:
 *   get:
 *     summary: "[ADMIN, LECTURER] Get schedule for a defense"
 *     tags: [Schedule]
 *     parameters:
 *       - in: path
 *         name: defenseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Defense ID to get schedule for
 *       - in: query
 *         name: defenseDay
 *         schema:
 *           type: integer
 *         description: Filter by defense day ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: boardCode
 *         schema:
 *           type: string
 *         description: Filter by board code (partial match)
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by board name (partial match)
 *       - in: query
 *         name: sortField
 *         schema:
 *           type: string
 *           default: id
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Schedule retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScheduleResponse'
 *       400:
 *         description: Invalid defense ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Schedule not found
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
export const getSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const defenseId = parseInt(req.params.defenseId as string);

    if (isNaN(defenseId)) {
      throw new AppError(400, "ID đợt bảo vệ không hợp lệ");
    }

    const filters = getCouncilBoardFilters(req);
    filters.defenseId = defenseId; // Path param takes precedence or adds to filters

    // Authorization: If the active role is lecturer (not admin), only show their assigned boards
    const user = req.user;
    const activeRole = getActiveRole(req);
    
    if (user && activeRole !== "admin") {
        const lecturerId = user.app_metadata?.lecturerId;
        if (lecturerId) {
            filters.lecturerId = lecturerId;
        }
    }

    const pagination = getPaginationParams(req);
    const sort = getSortParams(req, "id");

    const result = await scheduleService.getSchedule(
      filters,
      pagination,
      sort
    );

    return successResponse(res, result, "Schedule retrieved successfully");
  } catch (error) {
    return next(error);
  }
};

/**
 * @swagger
 * /api/schedule/council-boards/{id}:
 *   get:
 *     summary: "[ADMIN, LECTURER] Get council board details by ID"
 *     tags: [Schedule]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Council Board ID
 *     responses:
 *       200:
 *         description: Council board details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CouncilBoardResponse'
 *       404:
 *         description: Council board not found
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
export const getCouncilBoardById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      throw new AppError(400, "ID Hội đồng bảo vệ không hợp lệ");
    }

    const result = await scheduleService.getCouncilBoardById(id);

    // Authorization: if active role is lecturer (not admin), they can only view boards they are part of
    const user = req.user;
    const activeRole = getActiveRole(req);
    
    if (user && activeRole !== "admin") {
      const lecturerId = user.app_metadata?.lecturerId;
      const boardMembers = (result as any).councilBoardMembers || [];
      const isMember = boardMembers.some(
        (member: any) => member.lecturerId === lecturerId
      );
      
      if (!isMember) {
        throw new AppError(403, "Từ chối truy cập: Bạn chỉ có thể xem hội đồng bảo vệ mà bạn được phân công");
      }
    }

    return successResponse(res, result, "Council board details retrieved successfully");
  } catch (error) {
    return next(error);
  }
};

/**
 * @swagger
 * /api/schedule/publish:
 *   post:
 *     summary: "[ADMIN] Publish the schedule for a defense (making it visible to lecturers)"
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
 *       200:
 *         description: Schedule published successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       404:
 *         description: Defense not found
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
export const publishSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schema = z.object({
      defenseId: z.number({ required_error: "Defense ID is required" }).int(),
    });

    const validation = schema.safeParse(req.body);

    if (!validation.success) {
      throw new AppError(400, validation.error.errors[0].message);
    }

    const { defenseId } = validation.data;

    await scheduleService.publishSchedule(defenseId);

    return successResponse(res, null, "Schedule published successfully");
  } catch (error) {
    return next(error);
  }
};

/**
 * @swagger
 * /api/schedule/defense-councils/{defenseCouncilId}:
 *   put:
 *     summary: "[ADMIN] Update a defense council (Manual Scheduling)"
 *     tags: [Schedule]
 *     parameters:
 *       - in: path
 *         name: defenseCouncilId
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
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               councilBoardId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Defense Council updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DefenseCouncilResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       404:
 *         description: Defense Council not found
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
/**
 * @swagger
 * /api/schedule/defense-councils/{defenseCouncilId}:
 *   put:
 *     summary: "[ADMIN] Update a defense council (Manual Scheduling)"
 *     description: Update the time slot or reassign a topic's defense council to a different council board. All fields are optional (partial update). Cannot modify if the parent Defense Day is locked.
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: defenseCouncilId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the Defense Council to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 description: New start time (ISO 8601)
 *                 example: "2024-03-28T08:00:00Z"
 *               endTime:
 *                 type: string
 *                 format: date-time
 *                 description: New end time (ISO 8601)
 *                 example: "2024-03-28T08:45:00Z"
 *               councilBoardId:
 *                 type: integer
 *                 nullable: true
 *                 description: ID of the target council board (null to unassign)
 *                 example: 3
 *     responses:
 *       200:
 *         description: Defense Council updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DefenseCouncilResponse'
 *       400:
 *         description: Invalid defenseCouncilId or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       403:
 *         description: Defense or Defense Day is locked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Defense Council or target Council Board not found
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
export const updateDefenseCouncil = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const defenseCouncilId = parseInt(req.params.defenseCouncilId as string);
    if (isNaN(defenseCouncilId)) throw new AppError(400, "ID lịch bảo vệ (Defense Council) không hợp lệ");

    const schema = z.object({
      startTime: z.string().datetime().optional(),
      endTime: z.string().datetime().optional(),
      councilBoardId: z.number().int().nullable().optional(),
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, validation.error.errors[0].message);
    }

    const data = {
      startTime: validation.data.startTime ? new Date(validation.data.startTime) : undefined,
      endTime: validation.data.endTime ? new Date(validation.data.endTime) : undefined,
      councilBoardId: validation.data.councilBoardId,
    };

    const result = await scheduleService.updateDefenseCouncil(defenseCouncilId, data);
    return successResponse(res, result, "Defense Council updated successfully");
  } catch (error) {
    return next(error);
  }
};

/**
 * @swagger
 * /api/schedule/council-boards/{councilBoardId}:
 *   put:
 *     summary: "[ADMIN] Update a council board (Manual Scheduling)"
 *     tags: [Schedule]
 *     parameters:
 *       - in: path
 *         name: councilBoardId
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
 *               presidentId:
 *                 type: integer
 *               secretaryId:
 *                 type: integer
 *               memberIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Council Board updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CouncilBoardResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       404:
 *         description: Council Board not found
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
export const updateCouncilBoard = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const councilBoardId = parseInt(req.params.councilBoardId as string);
    if (isNaN(councilBoardId)) throw new AppError(400, "ID Hội đồng bảo vệ không hợp lệ");

    const schema = z.object({
      presidentId: z.number().int().nullable().optional(),
      secretaryId: z.number().int().nullable().optional(),
      memberIds: z.array(z.number().int()).optional(),
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, validation.error.errors[0].message);
    }

    const result = await scheduleService.updateCouncilBoard(councilBoardId, validation.data);
    return successResponse(res, result, "Council Board updated successfully");
  } catch (error) {
    return next(error);
  }
};

/**
 * @swagger
 * /api/schedule/{defenseId}/export:
 *   get:
 *     summary: "[ADMIN] Export defense schedule to Excel"
 *     description: Returns an Excel file with two sheets ("Thông tin Đề tài" and "Thông tin Hội đồng"). "Thông tin Đề tài" includes the "Trạng thái tổng" (Global Status) column.
 *     tags: [Schedule]
 *     parameters:
 *       - in: path
 *         name: defenseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the defense to export
 *     responses:
 *       200:
 *         description: Excel file containing the schedule
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Defense not found
 *       500:
 *         description: Server error
 */
export const exportSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const defenseId = parseInt(req.params.defenseId as string);

    if (isNaN(defenseId)) {
      throw new AppError(400, "ID đợt bảo vệ không hợp lệ");
    }

    // We'll import it dynamically or at the top. Let's add it to imports.
    const exportService = (await import("../services/exportService.js")).default;
    const buffer = await exportService.exportScheduleToExcel(defenseId);

    const defense = await prisma.defense.findUnique({ where: { id: defenseId } });
    const fileName = `Schedule_${defense?.defenseCode || defenseId}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${fileName}`,
    );

    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
};

/**
 * @swagger
 * /api/schedule/defense-councils:
 *   post:
 *     summary: "[ADMIN] Add a topic to a council board (Manual Scheduling)"
 *     description: Assign a topic registration to a council board by creating a Defense Council record. If startTime/endTime are omitted, they are auto-calculated based on the defense's timePerTopic configuration and the last scheduled slot on the board.
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - registrationId
 *               - councilBoardId
 *             properties:
 *               registrationId:
 *                 type: integer
 *                 description: ID of the TopicDefense registration to assign
 *                 example: 5
 *               councilBoardId:
 *                 type: integer
 *                 description: ID of the Council Board to assign the topic to
 *                 example: 3
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 description: Start time (ISO 8601). Auto-calculated if omitted.
 *                 example: "2024-03-28T08:00:00Z"
 *               endTime:
 *                 type: string
 *                 format: date-time
 *                 description: End time (ISO 8601). Auto-calculated if omitted.
 *                 example: "2024-03-28T08:45:00Z"
 *     responses:
 *       200:
 *         description: Topic assigned to council successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DefenseCouncilResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       403:
 *         description: Defense Day is locked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: TopicDefense registration or Council Board not found
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
export const createDefenseCouncil = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const schema = z.object({
      registrationId: z.number(),
      councilBoardId: z.number(),
      startTime: z.string().transform((v) => new Date(v)).optional(),
      endTime: z.string().transform((v) => new Date(v)).optional(),
    });

    const validated = schema.parse(req.body);
    const result = await scheduleService.createDefenseCouncil(validated);
    return successResponse(res, result, "Defense council created successfully");
  } catch (error) {
    return next(error);
  }
};

/**
 * @swagger
 * /api/schedule/defense-councils/{id}:
 *   delete:
 *     summary: "[ADMIN] Remove a topic from a council board (Manual Scheduling)"
 *     description: Deletes a Defense Council record, effectively unassigning the topic from its council board. Cannot delete if the parent Defense Day is locked.
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the Defense Council to delete
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
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       403:
 *         description: Defense Day is locked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Defense Council not found
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
export const deleteDefenseCouncil = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const id = getIdParam(req);
    await scheduleService.deleteDefenseCouncil(id);
    return successResponse(res, {}, "Topic removed from council successfully");
  } catch (error) {
    return next(error);
  }
};

/**
 * @swagger
 * /api/schedule/council-boards/{id}/suitable-lecturers:
 *   get:
 *     summary: "[ADMIN] Get suitable lecturers for a specific council board adjustment"
 *     tags: [Schedule]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Council Board ID
 *     responses:
 *       200:
 *         description: Suitable lecturers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       fullName:
 *                         type: string
 *                       lecturerCode:
 *                         type: string
 *                       seniorityLevel:
 *                         type: string
 *                       fitnessScore:
 *                         type: number
 *                       isCurrentlyInBoard:
 *                         type: boolean
 */
export const getSuitableLecturers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) throw new AppError(400, "ID Hội đồng bảo vệ không hợp lệ");

    const result = await scheduleService.getSuitableLecturersForBoard(id);
    return successResponse(res, result, "Suitable lecturers retrieved successfully");
  } catch (error) {
    return next(error);
  }
};

