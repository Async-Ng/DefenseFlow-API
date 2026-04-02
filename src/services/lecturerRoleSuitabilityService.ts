import { CouncilRole } from "../../generated/prisma/client.js";
import { AppError } from "../middleware/errorHandler.js";
import * as lecturerRepository from "../repositories/lecturerRepository.js";
import type { LecturerRoleSuitability, LecturerRoleSuitabilityItem } from "../types/index.js";

const VALID_ROLES: CouncilRole[] = [
  CouncilRole.President,
  CouncilRole.Secretary,
  CouncilRole.ReqReviewer,
  CouncilRole.TechReviewer,
  CouncilRole.AlgorithmReviewer,
];

/**
 * Set (upsert) suitability scores for a lecturer across council roles.
 * Monitor provides a list of { role, suitability } items.
 */
export const setLecturerSuitabilities = async (
  lecturerId: number,
  items: LecturerRoleSuitabilityItem[],
): Promise<LecturerRoleSuitability[]> => {
  const lecturer = await lecturerRepository.findById(lecturerId);
  if (!lecturer) throw new AppError(404, "Không tìm thấy giảng viên");

  for (const item of items) {
    if (!VALID_ROLES.includes(item.role)) {
      throw new AppError(400, `Role không hợp lệ: ${item.role}`);
    }
    if (item.suitability < 0 || item.suitability > 100) {
      throw new AppError(400, `Suitability phải trong khoảng 0-100, nhận được: ${item.suitability}`);
    }
  }

  await Promise.all(
    items.map((item) =>
      lecturerRepository.upsertLecturerRoleSuitability(lecturerId, item.role, item.suitability),
    ),
  );

  return lecturerRepository.getLecturerRoleSuitabilities(lecturerId);
};

/**
 * Get all role suitability scores for a lecturer.
 */
export const getLecturerSuitabilities = async (
  lecturerId: number,
): Promise<LecturerRoleSuitability[]> => {
  const lecturer = await lecturerRepository.findById(lecturerId);
  if (!lecturer) throw new AppError(404, "Không tìm thấy giảng viên");

  return lecturerRepository.getLecturerRoleSuitabilities(lecturerId);
};
