import { Request, Response } from "express";
import * as topicTypeService from "../services/topicTypeService.js";
import { successResponse, errorResponse, paginatedResponse } from "../utils/apiResponse.js";
import { CreateTopicTypeInput, UpdateTopicTypeInput } from "../types/index.js";
import { getPaginationParams, getTopicTypeFilters } from "../utils/requestHelpers.js";
import { getErrorMessage } from "../utils/typeGuards.js";

/**
 * @swagger
 * /api/topic-types:
 *   post:
 *     summary: "[HỆ THỐNG] Tạo loại đề tài mới"
 *     tags: [TopicTypes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTopicTypeInput'
 *     responses:
 *       201:
 *         description: Tạo loại đề tài thành công
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
      return errorResponse(res, "Thiếu trường bắt buộc: name", 400);
    }

    const topicType = await topicTypeService.createTopicType(input);
    return successResponse(res, topicType, "Tạo loại đề tài thành công", 201);
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
 *     summary: "[ADMIN, LECTURER] Lấy danh sách toàn bộ loại đề tài"
 *     tags: [TopicTypes]
 *     parameters:
 *       - in: query
 *         name: page
 *         description: Số trang
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         description: Số bản ghi mỗi trang
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: name
 *         description: Lọc theo tên loại đề tài
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách loại đề tài
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
    const { page, limit } = getPaginationParams(req);
    const filters = getTopicTypeFilters(req);

    const result = await topicTypeService.getAllTopicTypes({ page, limit }, filters);
    return paginatedResponse(
      res,
      result.data,
      page,
      limit,
      result.total,
      "Lấy danh sách loại đề tài thành công",
    );
  } catch (error: any) {
    return errorResponse(res, getErrorMessage(error), 500);
  }
};

/**
 * @swagger
 * /api/topic-types/{id}:
 *   get:
 *     summary: "[ADMIN, LECTURER] Lấy thông tin chi tiết loại đề tài"
 *     tags: [TopicTypes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID của loại đề tài
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Chi tiết loại đề tài (bao gồm danh sách năng lực chuyên môn liên quan)
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
      return errorResponse(res, "ID không hợp lệ", 400);
    }

    const topicType = await topicTypeService.getTopicTypeById(id);
    if (!topicType) {
      return errorResponse(res, "Không tìm thấy loại đề tài", 404);
    }

    return successResponse(res, topicType, "Lấy thông tin loại đề tài thành công");
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @swagger
 * /api/topic-types/{id}:
 *   put:
 *     summary: "[HỆ THỐNG] Cập nhật loại đề tài"
 *     description: Cập nhật tên và/hoặc danh sách năng lực chuyên môn kèm trọng số.
 *     tags: [TopicTypes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID của loại đề tài
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTopicTypeInput'
 *     responses:
 *       200:
 *         description: Cập nhật loại đề tài thành công
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
    return successResponse(res, topicType, "Cập nhật loại đề tài thành công");
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
 *     summary: "[HỆ THỐNG] Xóa loại đề tài"
 *     tags: [TopicTypes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID của loại đề tài cần xóa
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Xóa loại đề tài thành công
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
    return successResponse(res, null, "Xóa loại đề tài thành công");
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    if (error.code === "P2003") {
      return errorResponse(
        res,
        "Không thể xóa loại đề tài này vì đang được sử dụng bởi các đề tài",
        400,
      );
    }
    return errorResponse(res, error.message, 500);
  }
};
