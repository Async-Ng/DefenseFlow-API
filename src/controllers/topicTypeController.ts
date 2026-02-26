import { Request, Response } from "express";
import * as topicTypeService from "../services/topicTypeService.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import { CreateTopicTypeInput, UpdateTopicTypeInput } from "../types/index.js";

/**
 * @swagger
 * /api/topic-types:
 *   post:
 *     summary: Create a new topic type
 *     tags: [TopicTypes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               qualificationIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Optional list of qualification IDs to link at creation
 *     responses:
 *       201:
 *         description: Topic type created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TopicTypeResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Topic type already exists
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
export const createTopicType = async (req: Request, res: Response) => {
  try {
    const input: CreateTopicTypeInput = req.body;

    if (!input.name) {
      return errorResponse(res, "Missing required field: name", 400);
    }

    const topicType = await topicTypeService.createTopicType(input);
    return successResponse(res, topicType, "Topic type created successfully", 201);
  } catch (error: any) {
    if (error.message.includes("already exists")) {
      return errorResponse(res, error.message, 409);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @swagger
 * /api/topic-types:
 *   get:
 *     summary: Get all topic types
 *     tags: [TopicTypes]
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
 *         name: name
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of topic types
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TopicTypeListResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getTopicTypes = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const name = req.query.name as string | undefined;

    const result = await topicTypeService.getAllTopicTypes({ page, limit }, { name });
    return successResponse(res, result, "Topic types retrieved successfully");
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @swagger
 * /api/topic-types/{id}:
 *   get:
 *     summary: Get topic type by ID
 *     tags: [TopicTypes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Topic type details (includes linked qualifications)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TopicTypeResponse'
 *       404:
 *         description: Topic type not found
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
export const getTopicType = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return errorResponse(res, "Invalid ID", 400);
    }

    const topicType = await topicTypeService.getTopicTypeById(id);
    if (!topicType) {
      return errorResponse(res, "Topic type not found", 404);
    }

    return successResponse(res, topicType, "Topic type retrieved successfully");
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @swagger
 * /api/topic-types/{id}:
 *   put:
 *     summary: Update topic type (name and/or qualifications)
 *     tags: [TopicTypes]
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
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               qualificationIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Full list of qualification IDs. Replaces all current linked qualifications.
 *     responses:
 *       200:
 *         description: Topic type updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TopicTypeResponse'
 *       404:
 *         description: Topic type not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Topic type name already exists
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
export const updateTopicType = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return errorResponse(res, "Invalid ID", 400);
    }

    const input: UpdateTopicTypeInput = req.body;
    const topicType = await topicTypeService.updateTopicType(id, input);
    return successResponse(res, topicType, "Topic type updated successfully");
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    if (error.message.includes("already exists")) {
      return errorResponse(res, error.message, 409);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @swagger
 * /api/topic-types/{id}:
 *   delete:
 *     summary: Delete topic type
 *     tags: [TopicTypes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Topic type deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Topic type not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Cannot delete topic type (referenced by topics)
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
export const deleteTopicType = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return errorResponse(res, "Invalid ID", 400);
    }

    await topicTypeService.deleteTopicType(id);
    return successResponse(res, null, "Topic type deleted successfully");
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    if (error.code === "P2003") {
      return errorResponse(
        res,
        "Cannot delete topic type because it is being used by topics",
        400,
      );
    }
    return errorResponse(res, error.message, 500);
  }
};
