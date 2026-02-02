import * as lecturerSessionConfigRepo from "../repositories/lecturerSessionConfigRepository.js";
import { LecturerSessionConfigInput, LecturerSessionConfig, UpdateLecturerSessionConfigInput } from "../types/index.js";

export const getLecturerSessionConfig = async (
  lecturerId: number,
  sessionId: number
): Promise<LecturerSessionConfig | null> => {
  return await lecturerSessionConfigRepo.getByLecturerAndSession(lecturerId, sessionId);
};

export const createLecturerSessionConfig = async (
  input: LecturerSessionConfigInput
): Promise<LecturerSessionConfig> => {
  const { lecturerId, sessionId, minTopics, maxTopics } = input;

  // Check existence
  const existing = await lecturerSessionConfigRepo.getByLecturerAndSession(lecturerId, sessionId);
  if (existing) {
    throw new Error("Configuration already exists for this lecturer and session");
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

  return await lecturerSessionConfigRepo.create(input);
};

export const updateLecturerSessionConfig = async (
  id: number,
  input: UpdateLecturerSessionConfigInput
): Promise<LecturerSessionConfig> => {
  const { minTopics, maxTopics } = input;
  
  // Check existence
  const existing = await lecturerSessionConfigRepo.getById(id);
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

  return await lecturerSessionConfigRepo.update(id, input);
};

export const getAllLecturerSessionConfigs = async (
  pagination: { page: number; limit: number },
  filters: { lecturerId?: number; sessionId?: number }
) => {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const { data, total } = await lecturerSessionConfigRepo.getAll(
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

