import * as lecturerDefenseConfigRepo from "../repositories/lecturerDefenseConfigRepository.js";
import { LecturerDefenseConfigInput, LecturerDefenseConfig, UpdateLecturerDefenseConfigInput } from "../types/index.js";

export const getLecturerDefenseConfig = async (
  lecturerId: number,
  defenseId: number
): Promise<LecturerDefenseConfig | null> => {
  return await lecturerDefenseConfigRepo.getByLecturerAndDefense(lecturerId, defenseId);
};

export const createLecturerDefenseConfig = async (
  input: LecturerDefenseConfigInput
): Promise<LecturerDefenseConfig> => {
  const { lecturerId, defenseId, minTopics, maxTopics } = input;

  // Check existence
  const existing = await lecturerDefenseConfigRepo.getByLecturerAndDefense(lecturerId, defenseId);
  if (existing) {
    throw new Error("Cấu hình cho giảng viên và đợt bảo vệ này đã tồn tại");
  }

  // Determine effective values (defaults)
  const effectiveMin = minTopics ?? 5;
  const effectiveMax = maxTopics ?? 20;

  // Validate
  if (effectiveMin < 0) throw new Error("Số đề tài tối thiểu không được âm");
  if (effectiveMax < 0) throw new Error("Số đề tài tối đa không được âm");
  if (effectiveMin > effectiveMax) {
    throw new Error(`Số lượng đề tài tối thiểu (${effectiveMin}) không được lớn hơn số lượng tối đa (${effectiveMax})`);
  }

  return await lecturerDefenseConfigRepo.create(input);
};

export const updateLecturerDefenseConfig = async (
  id: number,
  input: UpdateLecturerDefenseConfigInput
): Promise<LecturerDefenseConfig> => {
  const { minTopics, maxTopics } = input;
  
  // Check existence
  const existing = await lecturerDefenseConfigRepo.getById(id);
  if (!existing) {
    throw new Error("Không tìm thấy cấu hình");
  }

  // Determine effective values (merging)
  const effectiveMin = minTopics !== undefined ? minTopics : existing.minTopics;
  const effectiveMax = maxTopics !== undefined ? maxTopics : existing.maxTopics;

  // Validate
  if (input.minTopics !== undefined && input.minTopics < 0) {
    throw new Error("Số đề tài tối thiểu không được âm");
  }
  if (input.maxTopics !== undefined && input.maxTopics < 0) {
    throw new Error("Số đề tài tối đa không được âm");
  }

  if (
    effectiveMin !== undefined && effectiveMin !== null &&
    effectiveMax !== undefined && effectiveMax !== null &&
    effectiveMin > effectiveMax
  ) {
    throw new Error(`Số lượng đề tài tối thiểu (${effectiveMin}) không được lớn hơn số lượng tối đa (${effectiveMax})`);
  }

  return await lecturerDefenseConfigRepo.update(id, input);
};

export const getAllLecturerDefenseConfigs = async (
  pagination: { page: number; limit: number },
  filters: { lecturerId?: number; defenseId?: number }
) => {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const { data, total } = await lecturerDefenseConfigRepo.getAll(
    { skip, take: limit },
    filters
  );

  return {
    data,
    total,
    page,
    limit
  };
}; // Added by antigravity

export const getLecturerDefenseConfigById = async (id: number): Promise<LecturerDefenseConfig> => {
  const config = await lecturerDefenseConfigRepo.getById(id);
  if (!config) throw new Error("Không tìm thấy cấu hình");
  return config;
};

export const deleteLecturerDefenseConfig = async (id: number): Promise<void> => {
  const config = await lecturerDefenseConfigRepo.getById(id);
  if (!config) throw new Error("Không tìm thấy cấu hình");
  await lecturerDefenseConfigRepo.deleteById(id);
};
