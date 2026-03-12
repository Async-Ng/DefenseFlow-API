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
 *     summary: "[ADMIN] Tạo loại đề tài mới"
 *     description: |
 *       Tạo loại đề tài mới và liên kết với các nhóm chuyên môn (QualificationGroup) kèm trọng số ưu tiên.
 *       - `name` phải là duy nhất trong hệ thống.
 *       - Nếu cung cấp `groups`, tổng tất cả `priorityWeight` **phải bằng đúng 100**.
 *       - Mỗi `priorityWeight` phải là số nguyên từ 1 đến 100.
 *       - Có thể tạo loại đề tài không có nhóm chuyên môn (để gán sau).
 *     tags: [TopicTypes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTopicTypeInput'
 *           examples:
 *             with_groups:
 *               summary: Tạo kèm nhóm chuyên môn
 *               value:
 *                 name: "AI Mobile App"
 *                 groups:
 *                   - groupId: 1
 *                     priorityWeight: 60
 *                   - groupId: 2
 *                     priorityWeight: 40
 *             without_groups:
 *               summary: Tạo không có nhóm (gán sau)
 *               value:
 *                 name: "Web E-commerce"
 *     responses:
 *       201:
 *         description: Tạo loại đề tài thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Tạo loại đề tài thành công" }
 *                 data: { $ref: '#/components/schemas/TopicType' }
 *       400:
 *         description: Dữ liệu không hợp lệ — tổng trọng số ≠ 100 hoặc trọng số ngoài phạm vi 1-100
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string, example: "Tổng trọng số ưu tiên của tất cả nhóm phải bằng 100 (hiện tại: 80)" }
 *       409:
 *         description: Tên loại đề tài đã tồn tại
 *       401:
 *         description: Không có token
 *       403:
 *         description: Không có quyền (chỉ admin)
 *       500:
 *         description: Lỗi server
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
 *     description: Trả về danh sách phân trang tất cả loại đề tài, kèm danh sách nhóm chuyên môn liên kết và trọng số ưu tiên.
 *     tags: [TopicTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: Số bản ghi mỗi trang
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *         description: Lọc theo tên loại đề tài (không phân biệt hoa thường)
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Tìm kiếm theo tên loại đề tài
 *     responses:
 *       200:
 *         description: Danh sách loại đề tài
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/TopicType' }
 *                 page: { type: integer, example: 1 }
 *                 limit: { type: integer, example: 10 }
 *                 total: { type: integer, example: 8 }
 *       401:
 *         description: Không có token
 *       500:
 *         description: Lỗi server
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
 *     description: Trả về chi tiết loại đề tài kèm danh sách nhóm chuyên môn liên kết, thông tin từng nhóm, và các kỹ năng thuộc nhóm đó.
 *     tags: [TopicTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID của loại đề tài
 *     responses:
 *       200:
 *         description: Chi tiết loại đề tài (bao gồm qualificationGroupTopicTypes)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/TopicType' }
 *       404:
 *         description: Không tìm thấy loại đề tài với ID cung cấp
 *       401:
 *         description: Không có token
 *       500:
 *         description: Lỗi server
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
 *     summary: "[ADMIN] Cập nhật loại đề tài"
 *     description: |
 *       Cập nhật tên và/hoặc danh sách nhóm chuyên môn của loại đề tài.
 *       - Nếu cung cấp `groups`, danh sách mới sẽ **thay thế toàn bộ** danh sách cũ.
 *       - Tổng tất cả `priorityWeight` **phải bằng đúng 100** nếu cung cấp `groups`.
 *       - Có thể truyền `groups: []` để gỡ bỏ tất cả nhóm chuyên môn.
 *     tags: [TopicTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID của loại đề tài cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTopicTypeInput'
 *           examples:
 *             update_name_and_groups:
 *               summary: Cập nhật tên và nhóm chuyên môn
 *               value:
 *                 name: "AI & Data Science"
 *                 groups:
 *                   - groupId: 1
 *                     priorityWeight: 70
 *                   - groupId: 3
 *                     priorityWeight: 30
 *             remove_all_groups:
 *               summary: Gỡ bỏ tất cả nhóm chuyên môn
 *               value:
 *                 groups: []
 *     responses:
 *       200:
 *         description: Cập nhật loại đề tài thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/TopicType' }
 *       400:
 *         description: Tổng trọng số không bằng 100 hoặc trọng số ngoài phạm vi
 *       404:
 *         description: Không tìm thấy loại đề tài
 *       409:
 *         description: Tên loại đề tài đã tồn tại
 *       401:
 *         description: Không có token
 *       403:
 *         description: Không có quyền (chỉ admin)
 *       500:
 *         description: Lỗi server
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
