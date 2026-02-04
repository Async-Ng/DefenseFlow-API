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
    throw new Error("Configuration already exists for this lecturer and defense");
  }

  // Determine effective values (defaults)
  const effectiveMin = minTopics ?? 5;
  const effectiveMax = maxTopics ?? 20;

  // Validate
  if (effectiveMin < 0) throw new Error("Minimum topics cannot be negative");
  if (effectiveMax < 0) throw new Error("Maximum topics cannot be negative");
  if (effectiveMin > effectiveMax) {
    throw new Error(`Minimum topics (${effectiveMin}) cannot be greater than Maximum topics (${effectiveMax})`);
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
    throw new Error("Configuration not found");
  }

  // Determine effective values (merging)
  const effectiveMin = minTopics !== undefined ? minTopics : existing.minTopics;
  const effectiveMax = maxTopics !== undefined ? maxTopics : existing.maxTopics;

  // Validate
  if (effectiveMin !== undefined && effectiveMin !== null && effectiveMin < 0) {
    throw new Error("Minimum topics cannot be negative");
  }
  if (effectiveMax !== undefined && effectiveMax !== null && effectiveMax < 0) {
    throw new Error("Maximum topics cannot be negative");
  }

  if (
    effectiveMin !== undefined && effectiveMin !== null &&
    effectiveMax !== undefined && effectiveMax !== null &&
    effectiveMin > effectiveMax
  ) {
    throw new Error(`Minimum topics (${effectiveMin}) cannot be greater than Maximum topics (${effectiveMax})`);
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
