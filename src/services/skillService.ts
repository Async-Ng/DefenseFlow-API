import * as skillRepository from "../repositories/skillRepository.js";
import {
  CreateSkillInput,
  UpdateSkillInput,
  PaginatedResult,
  Skill,
  SkillFilterQuery,
} from "../types/index.js";

/**
 * Create a new skill
 */
export const createSkill = async (
  data: CreateSkillInput,
): Promise<Skill> => {
  // Check if skill code already exists
  const existingSkill = await skillRepository.findByCode(data.skillCode);
  if (existingSkill) {
    throw new Error(`Skill with code ${data.skillCode} already exists`);
  }

  return await skillRepository.create(data);
};

/**
 * Get all skills
 */
export const getAllSkills = async (
  pagination: { page: number; limit: number },
  filters: SkillFilterQuery,
): Promise<PaginatedResult<Skill>> => {
  const filterParams = {
    skillCode: filters.skillCode as string,
    name: filters.name as string,
  };

  return await skillRepository.findAll(pagination.page, pagination.limit, filterParams);
};

/**
 * Get skill by ID
 */
export const getSkillById = async (id: number): Promise<Skill | null> => {
  return await skillRepository.findById(id);
};

/**
 * Update skill
 */
export const updateSkill = async (
  id: number,
  data: UpdateSkillInput,
): Promise<Skill> => {
  const skill = await skillRepository.findById(id);
  if (!skill) {
    throw new Error(`Skill with ID ${id} not found`);
  }

  // If updating skill code, check if it already exists
  if (data.skillCode && data.skillCode !== skill.skillCode) {
    const existingSkill = await skillRepository.findByCode(data.skillCode);
    if (existingSkill) {
      throw new Error(`Skill with code ${data.skillCode} already exists`);
    }
  }

  return await skillRepository.update(id, data);
};

/**
 * Delete skill
 */
export const deleteSkill = async (id: number): Promise<Skill> => {
  const skill = await skillRepository.findById(id);
  if (!skill) {
    throw new Error(`Skill with ID ${id} not found`);
  }

  return await skillRepository.deleteSkill(id);
};
