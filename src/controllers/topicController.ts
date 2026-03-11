import { Request, Response } from "express";
import * as topicService from "../services/topicService.js";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
  paginatedResponse,
  createdResponse,
} from "../utils/apiResponse.js";
import { getErrorMessage } from "../utils/typeGuards.js";
import { getIdParam, getPaginationParams, getTopicFilters } from "../utils/requestHelpers.js";
import {
  UpdateTopicResultInput,
  UpdateTopicInput,
  CreateTopicInput,
} from "../types/index.js";

// Helper to parse topic filters removed in favor of requestHelpers

/**
 * @swagger
 * /api/topics:
 *   post:
 *     summary: "[ADMIN] Create a new topic"
 *     tags: [Topics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTopicInput'
 *     responses:
 *       201:
 *         description: Topic created successfully
 *       400:
 *         description: Validation error (duplicate code, invalid semester)
 *       500:
 *         description: Server Error
 */
export const createTopic = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const data: CreateTopicInput = req.body;
    if (!data.topicCode || !data.semesterId) {
      return validationErrorResponse(res, {
        message: "topicCode và semesterId là bắt buộc",
      });
    }
    const topic = await topicService.createTopic(data);
    return createdResponse(res, topic, "Topic created successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("already exists") || message.includes("not found")) {
      return validationErrorResponse(res, { message });
    }
    return errorResponse(res, message, 500);
  }
};


/**
 * @swagger
 * /api/topics:
 *   get:
 *     summary: "[ADMIN, LECTURER] Get all topics"
 *     tags: [Topics]
 *     parameters:
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
 *       - in: query
 *         name: topicCode
 *         schema:
 *           type: string
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *       - in: query
 *         name: semesterId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: supervisorIds
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *         description: Filter by supervisor IDs (can provide multiple)
 *     responses:
 *       200:
 *         description: List of topics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TopicListResponse'
 *       500:
 *         description: Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getAllTopics = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { page, limit } = getPaginationParams(req);
    const filters = getTopicFilters(req);

    const result = await topicService.getAllTopics(page, limit, filters);
    return paginatedResponse(
      res,
      result.data,
      page,
      limit,
      result.total,
      "Topics retrieved successfully",
    );
  } catch (error: unknown) {
    return errorResponse(res, getErrorMessage(error), 500);
  }
};

/**
 * @swagger
 * /api/topics/{id}:
 *   get:
 *     summary: "[ADMIN, LECTURER] Get topic by ID"
 *     tags: [Topics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Topic details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TopicResponse'
 *       404:
 *         description: Topic not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getTopicById = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const id = getIdParam(req);
    const topic = await topicService.getTopicById(id);
    return successResponse(res, topic, "Topic retrieved successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) {
      return notFoundResponse(res, message);
    }
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/topics/{id}:
 *   patch:
 *     summary: "[ADMIN] Update topic"
 *     tags: [Topics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTopicInput'
 *     responses:
 *       200:
 *         description: Topic updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TopicResponse'
 *       404:
 *         description: Topic not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       500:
 *         description: Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const updateTopic = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const id = getIdParam(req);
    const data: UpdateTopicInput = req.body;

    const topic = await topicService.updateTopic(id, data);
    return successResponse(res, topic, "Topic updated successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) {
      return notFoundResponse(res, message);
    }
    if (message.includes("already exists")) {
      return validationErrorResponse(res, { message });
    }
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/topics/{id}:
 *   delete:
 *     summary: "[ADMIN] Delete topic"
 *     tags: [Topics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Topic deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Topic not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const deleteTopic = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const id = getIdParam(req);
    await topicService.deleteTopic(id);
    return successResponse(res, {}, "Topic deleted successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) {
      return notFoundResponse(res, message);
    }
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/topics/{id}/result:
 *   patch:
 *     summary: "[ADMIN] Update the result of a topic registration"
 *     tags: [Topics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTopicResultInput'
 *     responses:
 *       200:
 *         description: Topic result updated successfully
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
 *                   example: "Topic result updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/TopicDefense'
 *       404:
 *         description: Topic or registration not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       500:
 *         description: Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const updateTopicResult = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const id = getIdParam(req);
    const data: UpdateTopicResultInput = req.body;

    // Validate enum
    if (
      !data.result ||
      !["Pending", "Passed", "Failed"].includes(data.result)
    ) {
      return validationErrorResponse(res, {
        message: "Kết quả (Result) phải là một trong các giá trị: Pending, Passed, Failed",
      });
    }

    const result = await topicService.updateTopicResult(id, data);
    return successResponse(res, result, "Topic result updated successfully");
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("not found")) {
      return notFoundResponse(res, message);
    }
    if (message.includes("not registered")) {
      return validationErrorResponse(res, { message });
    }
    return errorResponse(res, message, 500);
  }
};
