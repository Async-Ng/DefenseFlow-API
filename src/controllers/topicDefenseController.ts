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
 *     summary: Register a topic into a defense
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
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server Error
 */
export const createTopicDefense = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const data: CreateTopicDefenseInput = req.body;
    if (!data.topicId || !data.defenseId) {
      return validationErrorResponse(res, {
        message: "topicId and defenseId are required",
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
 *     summary: Get topic defense registrations
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
 *     responses:
 *       200:
 *         description: List of topic defenses
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
    };

    const records = await topicDefenseService.getTopicDefenses(filters);
    return successResponse(res, records, "Topic defenses retrieved successfully");
  } catch (error: unknown) {
    return errorResponse(res, getErrorMessage(error), 500);
  }
};

/**
 * @swagger
 * /api/topic-defenses/{id}:
 *   get:
 *     summary: Get topic defense details by ID
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
 *       404:
 *         description: Not found
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
 *     summary: Remove a topic registration from a defense
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
 *       404:
 *         description: Not found
 *       400:
 *         description: Cannot remove
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
