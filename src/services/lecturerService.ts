/**
 * Lecturer Service
 * Business logic layer for Lecturer operations (Functional)
 */

import * as lecturerRepository from "../repositories/lecturerRepository.js";
import type {
  Lecturer,
  LecturerWithSkills,
  UpdateLecturerRolesInput,
  UpdateLecturerSkillsInput,
  PaginatedResult,
  LecturerFilters,
} from "../types/index.js";

/**
 * Get lecturer by ID with skills
 */
export const getLecturerById = async (
  id: number,
): Promise<LecturerWithSkills> => {
  const lecturer = await lecturerRepository.findById(id, true);
  if (!lecturer) {
    throw new Error(`Lecturer with ID ${id} not found`);
  }

  // Ensure role flags are boolean (convert null to false)
  return {
    ...lecturer,
    isPresidentQualified: lecturer.isPresidentQualified ?? false,
    isSecretaryQualified: lecturer.isSecretaryQualified ?? false,
  } as LecturerWithSkills;
};

/**
 * Get all lecturers with pagination
 */
export const getAllLecturers = async (
  page: number = 1,
  limit: number = 10,
  filters: LecturerFilters = {},
): Promise<PaginatedResult<Lecturer>> => {
  const result = await lecturerRepository.findAll(page, limit, filters);

  // Ensure role flags are boolean for all lecturers
  const data = result.data.map((lecturer) => ({
    ...lecturer,
    isPresidentQualified: lecturer.isPresidentQualified ?? false,
    isSecretaryQualified: lecturer.isSecretaryQualified ?? false,
  }));

  return {
    ...result,
    data,
  };
};

/**
 * Update lecturer roles
 */
export const updateLecturerRoles = async (
  id: number,
  data: UpdateLecturerRolesInput,
): Promise<Lecturer> => {
  // Check if lecturer exists
  const existing = await lecturerRepository.findById(id);
  if (!existing) {
    throw new Error(`Lecturer with ID ${id} not found`);
  }

  // Update roles
  const updated = await lecturerRepository.updateRoles(id, data);

  return {
    ...updated,
    isPresidentQualified: updated.isPresidentQualified ?? false,
    isSecretaryQualified: updated.isSecretaryQualified ?? false,
  };
};

/**
 * Update lecturer skills
 */
export const updateLecturerSkills = async (
  id: number,
  data: UpdateLecturerSkillsInput,
): Promise<LecturerWithSkills> => {
  // Check if lecturer exists
  const existing = await lecturerRepository.findById(id);
  if (!existing) {
    throw new Error(`Lecturer with ID ${id} not found`);
  }

  // Validate skill scores
  for (const skillInput of data.skills) {
    if (skillInput.score < 0 || skillInput.score > 5) {
      throw new Error(
        `Invalid skill score ${skillInput.score} for skill ID ${skillInput.skillId}. Score must be between 0 and 5.`,
      );
    }

    // Check if skill exists
    const skillExists = await lecturerRepository.skillExists(
      skillInput.skillId,
    );
    if (!skillExists) {
      throw new Error(`Skill with ID ${skillInput.skillId} not found`);
    }
  }

  // Update skills
  await Promise.all(
    data.skills.map((skillInput) =>
      lecturerRepository.upsertLecturerSkill(
        id,
        skillInput.skillId,
        skillInput.score,
      ),
    ),
  );

  // Return updated lecturer with skills
  const updated = await lecturerRepository.findById(id, true);
  if (!updated) {
    throw new Error(`Failed to retrieve updated lecturer`);
  }

  return {
    ...updated,
    isPresidentQualified: updated.isPresidentQualified ?? false,
    isSecretaryQualified: updated.isSecretaryQualified ?? false,
  } as LecturerWithSkills;
};
