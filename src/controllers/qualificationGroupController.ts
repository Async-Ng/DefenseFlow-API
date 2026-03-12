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
 *     tags: [Qualifications]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Tìm theo tên hoặc mã nhóm
 *     responses:
 *       200:
 *         description: Danh sách nhóm chuyên môn
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
 *     summary: "[ADMIN] Lấy chi tiết nhóm chuyên môn theo ID"
 *     tags: [Qualifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Chi tiết nhóm chuyên môn
 *       404:
 *         description: Không tìm thấy
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
 *     tags: [Qualifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateQualificationGroupInput'
 *     responses:
 *       201:
 *         description: Tạo nhóm thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc trùng mã/tên
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
 *     tags: [Qualifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateQualificationGroupInput'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy nhóm
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
 *     tags: [Qualifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       400:
 *         description: Nhóm đang được dùng bởi loại đề tài
 *       404:
 *         description: Không tìm thấy nhóm
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
