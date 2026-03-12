import { Request, Response } from "express";
import * as qualificationGroupService from "../services/qualificationGroupService.js";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
  paginatedResponse,
  createdResponse,
} from "../utils/apiResponse.js";
import { getErrorMessage } from "../utils/typeGuards.js";
import { getIdParam, getPaginationParams } from "../utils/requestHelpers.js";

/**
 * @swagger
 * /api/qualification-groups:
 *   get:
 *     summary: "[ADMIN] Lấy danh sách nhóm chuyên môn"
 *     description: Trả về danh sách phân trang tất cả nhóm chuyên môn. Mỗi nhóm bao gồm các kỹ năng (Qualification) thuộc về nhóm đó.
 *     tags: [Qualifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Số trang (bắt đầu từ 1)
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: Số bản ghi mỗi trang
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Tìm kiếm theo tên hoặc mã nhóm (không phân biệt hoa thường)
 *     responses:
 *       200:
 *         description: Lấy danh sách nhóm chuyên môn thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Lấy danh sách nhóm chuyên môn thành công" }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/QualificationGroup' }
 *                 page: { type: integer, example: 1 }
 *                 limit: { type: integer, example: 10 }
 *                 total: { type: integer, example: 5 }
 *       401:
 *         description: Không có token hoặc token không hợp lệ
 *       500:
 *         description: Lỗi server
 */
export const getAllGroups = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { page, limit } = getPaginationParams(req);
    const search = req.query.search as string | undefined;
    const result = await qualificationGroupService.getAllGroups({ page, limit }, search);
    return paginatedResponse(res, result.data, page, limit, result.total, "Lấy danh sách nhóm chuyên môn thành công");
  } catch (error) {
    return errorResponse(res, getErrorMessage(error), 500);
  }
};

/**
 * @swagger
 * /api/qualification-groups/{id}:
 *   get:
 *     summary: "[ADMIN] Lấy chi tiết nhóm chuyên môn"
 *     description: Trả về thông tin chi tiết của một nhóm chuyên môn, bao gồm danh sách các kỹ năng (Qualification) thuộc nhóm.
 *     tags: [Qualifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID của nhóm chuyên môn
 *     responses:
 *       200:
 *         description: Lấy nhóm chuyên môn thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Lấy nhóm chuyên môn thành công" }
 *                 data: { $ref: '#/components/schemas/QualificationGroup' }
 *       404:
 *         description: Không tìm thấy nhóm chuyên môn với ID cung cấp
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string, example: "Không tìm thấy nhóm chuyên môn với ID 999" }
 *       401:
 *         description: Không có token hoặc token không hợp lệ
 *       500:
 *         description: Lỗi server
 */
export const getGroupById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = getIdParam(req);
    const group = await qualificationGroupService.getGroupById(id);
    return successResponse(res, group, "Lấy nhóm chuyên môn thành công");
  } catch (error) {
    const message = getErrorMessage(error);
    if (message.includes("Không tìm thấy")) return notFoundResponse(res, message);
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/qualification-groups:
 *   post:
 *     summary: "[ADMIN] Tạo nhóm chuyên môn mới"
 *     description: |
 *       Tạo một nhóm chuyên môn mới để nhóm các kỹ năng liên quan lại với nhau.
 *       Nhóm chuyên môn sẽ được sử dụng khi thiết lập yêu cầu chuyên môn cho loại đề tài (TopicType).
 *       - `code` và `name` phải là duy nhất trong hệ thống.
 *       - Sau khi tạo nhóm, có thể gán từng kỹ năng (Qualification) vào nhóm thông qua endpoint cập nhật Qualification.
 *     tags: [Qualifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateQualificationGroupInput'
 *           example:
 *             code: "AI"
 *             name: "Trí tuệ Nhân tạo"
 *             description: "Nhóm kỹ năng về AI, ML, Deep Learning, Computer Vision, NLP"
 *     responses:
 *       201:
 *         description: Tạo nhóm chuyên môn thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Tạo nhóm chuyên môn thành công" }
 *                 data: { $ref: '#/components/schemas/QualificationGroup' }
 *       400:
 *         description: Thiếu trường bắt buộc (code, name) hoặc mã/tên đã tồn tại
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string, example: "Mã nhóm 'AI' đã tồn tại" }
 *       401:
 *         description: Không có token hoặc token không hợp lệ
 *       403:
 *         description: Không có quyền (chỉ admin)
 *       500:
 *         description: Lỗi server
 */
export const createGroup = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { code, name, description } = req.body;
    if (!code || !name) {
      return validationErrorResponse(res, { message: "Mã nhóm (code) và Tên nhóm (name) là bắt buộc" });
    }
    const group = await qualificationGroupService.createGroup({ code, name, description });
    return createdResponse(res, group, "Tạo nhóm chuyên môn thành công");
  } catch (error) {
    const message = getErrorMessage(error);
    if (message.includes("đã tồn tại")) return validationErrorResponse(res, { message });
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/qualification-groups/{id}:
 *   patch:
 *     summary: "[ADMIN] Cập nhật nhóm chuyên môn"
 *     description: |
 *       Cập nhật thông tin của nhóm chuyên môn (code, name, description).
 *       - Tất cả trường đều tùy chọn — chỉ các trường được gửi mới bị cập nhật.
 *       - `code` và `name` nếu thay đổi phải vẫn duy nhất trong hệ thống.
 *     tags: [Qualifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID của nhóm chuyên môn cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateQualificationGroupInput'
 *           example:
 *             name: "Trí tuệ Nhân tạo & Machine Learning"
 *             description: "Nhóm kỹ năng mở rộng về AI, ML, DL, NLP, CV, GenAI"
 *     responses:
 *       200:
 *         description: Cập nhật nhóm chuyên môn thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Cập nhật nhóm chuyên môn thành công" }
 *                 data: { $ref: '#/components/schemas/QualificationGroup' }
 *       400:
 *         description: Mã hoặc tên mới đã tồn tại trong hệ thống
 *       404:
 *         description: Không tìm thấy nhóm với ID cung cấp
 *       401:
 *         description: Không có token hoặc token không hợp lệ
 *       403:
 *         description: Không có quyền (chỉ admin)
 *       500:
 *         description: Lỗi server
 */
export const updateGroup = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = getIdParam(req);
    const { code, name, description } = req.body;
    const group = await qualificationGroupService.updateGroup(id, { code, name, description });
    return successResponse(res, group, "Cập nhật nhóm chuyên môn thành công");
  } catch (error) {
    const message = getErrorMessage(error);
    if (message.includes("Không tìm thấy")) return notFoundResponse(res, message);
    if (message.includes("đã tồn tại")) return validationErrorResponse(res, { message });
    return errorResponse(res, message, 500);
  }
};

/**
 * @swagger
 * /api/qualification-groups/{id}:
 *   delete:
 *     summary: "[ADMIN] Xóa nhóm chuyên môn"
 *     description: |
 *       Xóa một nhóm chuyên môn khỏi hệ thống.
 *       - **Không thể xóa** nhóm đang được sử dụng bởi một hoặc nhiều loại đề tài (TopicType).
 *       - Trước khi xóa, hãy gỡ liên kết nhóm khỏi tất cả TopicType sử dụng nó.
 *       - Các kỹ năng (Qualification) thuộc nhóm sẽ không bị xóa, chỉ liên kết nhóm bị xóa.
 *     tags: [Qualifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID của nhóm chuyên môn cần xóa
 *     responses:
 *       200:
 *         description: Xóa nhóm chuyên môn thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Xóa nhóm chuyên môn thành công" }
 *       400:
 *         description: Nhóm đang được sử dụng bởi một hoặc nhiều loại đề tài, không thể xóa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string, example: "Nhóm 'Trí tuệ Nhân tạo' đang được sử dụng bởi 2 loại đề tài, không thể xóa" }
 *       404:
 *         description: Không tìm thấy nhóm với ID cung cấp
 *       401:
 *         description: Không có token hoặc token không hợp lệ
 *       403:
 *         description: Không có quyền (chỉ admin)
 *       500:
 *         description: Lỗi server
 */
export const deleteGroup = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = getIdParam(req);
    await qualificationGroupService.deleteGroup(id);
    return successResponse(res, {}, "Xóa nhóm chuyên môn thành công");
  } catch (error) {
    const message = getErrorMessage(error);
    if (message.includes("Không tìm thấy")) return notFoundResponse(res, message);
    if (message.includes("đang được sử dụng")) return validationErrorResponse(res, { message });
    return errorResponse(res, message, 500);
  }
};
