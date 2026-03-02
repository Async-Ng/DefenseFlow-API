import { Request, Response } from "express";
import * as topicDefenseService from "../services/topicDefenseService.js";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
  createdResponse,
} from "../utils/apiResponse.js";
import { getErrorMessage } from "../utils/typeGuards.js";
import { getIdParam } from "../utils/requestHelpers.js";
import { CreateTopicDefenseInput, TopicDefenseFilters } from "../types/index.js";

/**
 * @swagger
 * /api/topic-defenses:
 *   post:
 *     summary: "[ADMIN] Register a topic into a defense"
 *     tags: [TopicDefense]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTopicDefenseInput'
 *     responses:
 *       201:
 *         description: Topic registered successfully
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
 *                   example: "Topic registered successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     topicDefenseCode:
 *                       type: string
 *                       example: "REG_12345"
 *                     topicId:
 *                       type: integer
 *                       example: 5
 *                     defenseId:
 *                       type: integer
 *                       example: 2
 *                     finalResult:
 *                       type: string
 *                       example: "Pending"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 */
export const createTopicDefense = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const data: CreateTopicDefenseInput = req.body;
    if (!data.topicIds || !Array.isArray(data.topicIds) || data.topicIds.length === 0 || !data.defenseId) {
      return validationErrorResponse(res, {
        message: "topicIds (array) and defenseId are required",
      });
    }

    const topicDefense = await topicDefenseService.createTopicDefense(data);
    return createdResponse(res, topicDefense, "Topic registered successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("already registered") || message.includes("not open")) {
      return validationErrorResponse(res, { message });
    }
    if (message.includes("not found")) {
      return notFoundResponse(res, message);
    }
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/topic-defenses:
 *   get:
 *     summary: "[ADMIN, LECTURER] Get topic defense registrations"
 *     tags: [TopicDefense]
 *     parameters:
 *       - in: query
 *         name: defenseId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: topicId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: topicCode
 *         schema:
 *           type: string
 *       - in: query
 *         name: finalResult
 *         schema:
 *           type: string
 *           enum: [Pending, Passed, Failed]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of topic defenses (paginated)
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
 *                   example: "Topic defenses retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           topicDefenseCode:
 *                             type: string
 *                             example: "REG_12345"
 *                           topic:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 5
 *                               topicCode:
 *                                 type: string
 *                                 example: "SWD_01"
 *                               title:
 *                                 type: string
 *                                 example: "Defense Flow System"
 *                           defense:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 2
 *                               defenseCode:
 *                                 type: string
 *                                 example: "DEF_SP24"
 *                           finalResult:
 *                             type: string
 *                             example: "Pending"
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *       500:
 *         description: Server Error
 */
export const getTopicDefenses = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const filters: TopicDefenseFilters = {
      defenseId: req.query.defenseId ? Number(req.query.defenseId) : undefined,
      topicId: req.query.topicId ? Number(req.query.topicId) : undefined,
      topicCode: req.query.topicCode ? String(req.query.topicCode) : undefined,
      finalResult: req.query.finalResult as any,
    };
    
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    const result = await topicDefenseService.getTopicDefenses(filters, page, limit);
    return successResponse(res, result, "Topic defenses retrieved successfully");
  } catch (error: unknown) {
    return errorResponse(res, getErrorMessage(error), 500);
  }
};

/**
 * @swagger
 * /api/topic-defenses/{id}:
 *   get:
 *     summary: "[ADMIN, LECTURER] Get topic defense details by ID"
 *     tags: [TopicDefense]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Topic defense details
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
 *                   example: "Topic defense retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     topicDefenseCode:
 *                       type: string
 *                       example: "REG_12345"
 *                     finalResult:
 *                       type: string
 *                       example: "Pending"
 *                     topic:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         topicCode:
 *                           type: string
 *                         title:
 *                           type: string
 *                     defense:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         defenseCode:
 *                           type: string
 *                     defenseCouncils:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 */
export const getTopicDefenseById = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const id = getIdParam(req);
    const record = await topicDefenseService.getTopicDefenseById(id);
    return successResponse(res, record, "Topic defense retrieved successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) return notFoundResponse(res, message);
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/topic-defenses/{id}:
 *   delete:
 *     summary: "[ADMIN] Remove a topic registration from a defense"
 *     tags: [TopicDefense]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Registration removed
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
 *                   example: "Topic registration removed successfully"
 *                 data:
 *                   type: object
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Cannot remove
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 */
export const deleteTopicDefense = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const id = getIdParam(req);
    await topicDefenseService.deleteTopicDefense(id);
    return successResponse(res, {}, "Topic registration removed successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) return notFoundResponse(res, message);
    if (message.includes("Cannot remove")) return validationErrorResponse(res, { message });
    return errorResponse(res, message, 500);
  }
};
