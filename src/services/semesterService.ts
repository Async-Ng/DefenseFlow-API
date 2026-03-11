/**
 * Semester Service
 * Business logic layer for Semester operations (Functional)
 */

import * as semesterRepository from "../repositories/semesterRepository.js";
import {
  validateSemesterData,
  validateDateRange,
  validateDefenseDaysInSemester,
} from "../domain/validators.js";
import type {
  Semester,
  CreateSemesterInput,
  UpdateSemesterInput,
  PaginatedResult,
  SemesterFilters,
  IncludeOptions,
} from "../types/index.js";

/**
 * Create a new semester
 */
export const createSemester = async (
  data: CreateSemesterInput,
): Promise<Semester> => {
  // Validate semester data
  const validation = validateSemesterData(data as Record<string, unknown>);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(", "));
  }

  // Check if semester code already exists
  const existing = await semesterRepository.findByCode(data.semesterCode);
  if (existing) {
    throw new Error(`Học kỳ với mã '${data.semesterCode}' đã tồn tại`);
  }

  // Create semester
  return await semesterRepository.create(data);
};

/**
 * Get all semesters with pagination
 */
export const getAllSemesters = async (
  page: number = 1,
  limit: number = 10,
  filters: SemesterFilters = {},
): Promise<PaginatedResult<Semester>> => {
  return await semesterRepository.findAll(page, limit, filters);
};

/**
 * Get semester by ID
 */
export const getSemesterById = async (
  id: number,
  include: IncludeOptions = {},
): Promise<Semester> => {
  const semester = await semesterRepository.findById(id, include);
  if (!semester) {
    throw new Error(`Không tìm thấy học kỳ với ID ${id}`);
  }
  return semester;
};

/**
 * Update semester
 */
export const updateSemester = async (
  id: number,
  data: UpdateSemesterInput,
): Promise<Semester> => {
  // Check if semester exists
  const existing = await semesterRepository.findById(id);
  if (!existing) {
    throw new Error(`Không tìm thấy học kỳ với ID ${id}`);
  }

  // If updating semester code, check for duplicates
  if (data.semesterCode && data.semesterCode !== existing.semesterCode) {
    const duplicate = await semesterRepository.findByCode(data.semesterCode);
    if (duplicate) {
      throw new Error(
        `Học kỳ với mã '${data.semesterCode}' đã tồn tại`,
      );
    }
  }

  // Validate date range if both dates are being updated
  const newStartDate =
    data.startDate !== undefined ? data.startDate : existing.startDate;
  const newEndDate =
    data.endDate !== undefined ? data.endDate : existing.endDate;

  if (newStartDate && newEndDate) {
    const dateValidation = validateDateRange(newStartDate, newEndDate);
    if (!dateValidation.isValid && dateValidation.error) {
      throw new Error(dateValidation.error);
    }

    // Check for conflicts with existing defenses
    await checkDefenseConflicts(id, newStartDate, newEndDate);
  }

  // Update semester
  return await semesterRepository.update(id, data);
};

/**
 * Delete semester and cascade-delete all related data
 */
export const deleteSemester = async (id: number): Promise<Semester> => {
  // Check if semester exists
  const existing = await semesterRepository.findById(id);
  if (!existing) {
    throw new Error(`Không tìm thấy học kỳ với ID ${id}`);
  }

  // Cascade-delete semester and all associated data in a single transaction
  return await semesterRepository.deleteSemesterCascade(id);
};

/**
 * Check if updating semester dates would conflict with existing defenses
 */
const checkDefenseConflicts = async (
  semesterId: number,
  newStartDate: string | Date | null,
  newEndDate: string | Date | null,
): Promise<void> => {
  const defenses = await semesterRepository.getDefensesWithDays(semesterId);

  if (defenses.length === 0) {
    return; // No conflicts
  }

  // Collect all defense days
  const allDefenseDays: Array<{ defenseDayCode: string; dayDate: Date }> = [];
  for (const defense of defenses) {
    if (defense.defenseDays) {
      allDefenseDays.push(...defense.defenseDays);
    }
  }

  // Validate defense days against new semester dates
  if (allDefenseDays.length > 0) {
    const validation = validateDefenseDaysInSemester(
      allDefenseDays.map((d) => ({
        defenseDayCode: d.defenseDayCode,
        dayDate: d.dayDate.toISOString(),
      })),
      newStartDate,
      newEndDate,
    );

    if (!validation.isValid) {
      throw new Error(
        `Không thể cập nhật ngày của học kỳ: ${validation.error}. ` +
          `Các ngày bị xung đột: ${validation.details?.invalidDates.map((d) => d.date).join(", ")}`,
      );
    }
  }
};
