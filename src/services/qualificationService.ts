import * as qualificationRepository from "../repositories/qualificationRepository.js";
import {
  CreateQualificationInput,
  UpdateQualificationInput,
  PaginatedResult,
  Qualification,
  QualificationFilters,
} from "../types/index.js";

/**
 * Create a new qualification
 */
export const createQualification = async (
  data: CreateQualificationInput,
): Promise<Qualification> => {
  // Check if qualification code already exists
  const existingQualification = await qualificationRepository.findByCode(data.qualificationCode);
  if (existingQualification) {
    throw new Error(`Qualification with code ${data.qualificationCode} already exists`);
  }

  return await qualificationRepository.create(data);
};

/**
 * Get all qualifications
 */
export const getAllQualifications = async (
  pagination: { page: number; limit: number },
  filters: QualificationFilters,
): Promise<PaginatedResult<Qualification>> => {
  return await qualificationRepository.findAll(pagination.page, pagination.limit, filters);
};

/**
 * Get qualification by ID
 */
export const getQualificationById = async (id: number): Promise<Qualification | null> => {
  return await qualificationRepository.findById(id);
};

/**
 * Update qualification
 */
export const updateQualification = async (
  id: number,
  data: UpdateQualificationInput,
): Promise<Qualification> => {
  const qualification = await qualificationRepository.findById(id);
  if (!qualification) {
    throw new Error(`Qualification with ID ${id} not found`);
  }

  // If updating qualification code, check if it already exists
  if (data.qualificationCode && data.qualificationCode !== qualification.qualificationCode) {
    const existingQualification = await qualificationRepository.findByCode(data.qualificationCode);
    if (existingQualification) {
      throw new Error(`Qualification with code ${data.qualificationCode} already exists`);
    }
  }

  return await qualificationRepository.update(id, data);
};

/**
 * Delete qualification
 */
export const deleteQualification = async (id: number): Promise<Qualification> => {
  const qualification = await qualificationRepository.findById(id);
  if (!qualification) {
    throw new Error(`Qualification with ID ${id} not found`);
  }

  return await qualificationRepository.deleteQualification(id);
};
