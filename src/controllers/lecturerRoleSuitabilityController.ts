import { Request, Response } from "express";
import * as lecturerRoleSuitabilityService from "../services/lecturerRoleSuitabilityService.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import { getErrorMessage } from "../utils/typeGuards.js";
import type { SetLecturerRoleSuitabilitiesInput } from "../types/index.js";

/**
 * GET /api/lecturers/:id/role-suitabilities
 * Lấy suitability scores của một giảng viên theo từng vị trí hội đồng
 */
export const getLecturerRoleSuitabilities = async (req: Request, res: Response): Promise<void> => {
  try {
    const lecturerId = parseInt(req.params["id"] as string, 10);
    if (isNaN(lecturerId)) {
      errorResponse(res, "ID giảng viên không hợp lệ", 400);
      return;
    }

    const suitabilities = await lecturerRoleSuitabilityService.getLecturerSuitabilities(lecturerId);
    successResponse(res, suitabilities);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const statusCode = (error as any)?.statusCode ?? 500;
    errorResponse(res, message, statusCode);
  }
};

/**
 * PUT /api/lecturers/:id/role-suitabilities
 * Monitor thiết lập suitability scores cho một giảng viên
 * Body: { suitabilities: [{ role: CouncilRole, suitability: number }] }
 */
export const setLecturerRoleSuitabilities = async (req: Request, res: Response): Promise<void> => {
  try {
    const lecturerId = parseInt(req.params["id"] as string, 10);
    if (isNaN(lecturerId)) {
      errorResponse(res, "ID giảng viên không hợp lệ", 400);
      return;
    }

    const body = req.body as SetLecturerRoleSuitabilitiesInput;
    if (!Array.isArray(body.suitabilities) || body.suitabilities.length === 0) {
      errorResponse(res, "Cần cung cấp danh sách suitabilities", 400);
      return;
    }

    const result = await lecturerRoleSuitabilityService.setLecturerSuitabilities(
      lecturerId,
      body.suitabilities,
    );
    successResponse(res, result);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const statusCode = (error as any)?.statusCode ?? 500;
    errorResponse(res, message, statusCode);
  }
};
