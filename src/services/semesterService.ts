/**
 * Semester Service
 * Business logic layer for Semester operations (Functional)
 */

import * as semesterRepository from "../repositories/semesterRepository.js";
import {
  validateSemesterData,
  validateDateRange,
  validateSessionDaysInSemester,
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
    throw new Error(`Semester with code '${data.semesterCode}' already exists`);
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
    throw new Error(`Semester with ID ${id} not found`);
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
    throw new Error(`Semester with ID ${id} not found`);
  }

  // If updating semester code, check for duplicates
  if (data.semesterCode && data.semesterCode !== existing.semesterCode) {
    const duplicate = await semesterRepository.findByCode(data.semesterCode);
    if (duplicate) {
      throw new Error(
        `Semester with code '${data.semesterCode}' already exists`,
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

    // Check for conflicts with existing sessions
    await checkSessionConflicts(id, newStartDate, newEndDate);
  }

  // Update semester
  return await semesterRepository.update(id, data);
};

/**
 * Delete semester
 */
export const deleteSemester = async (id: number): Promise<Semester> => {
  // Check if semester exists
  const existing = await semesterRepository.findById(id);
  if (!existing) {
    throw new Error(`Semester with ID ${id} not found`);
  }

  // Check for active sessions
  const hasSessions = await semesterRepository.hasActiveSessions(id);
  if (hasSessions) {
    throw new Error(
      "Cannot delete semester with active sessions. Please delete all sessions first.",
    );
  }

  // Delete semester
  return await semesterRepository.deleteSemester(id);
};

/**
 * Check if updating semester dates would conflict with existing sessions
 */
const checkSessionConflicts = async (
  semesterId: number,
  newStartDate: string | Date | null,
  newEndDate: string | Date | null,
): Promise<void> => {
  const sessions = await semesterRepository.getSessionsWithDays(semesterId);

  if (sessions.length === 0) {
    return; // No conflicts
  }

  // Collect all session days
  const allSessionDays: Array<{ sessionDayCode: string; dayDate: Date }> = [];
  for (const session of sessions) {
    if (session.sessionDays) {
      allSessionDays.push(...session.sessionDays);
    }
  }

  // Validate session days against new semester dates
  if (allSessionDays.length > 0) {
    const validation = validateSessionDaysInSemester(
      allSessionDays.map((d) => ({
        sessionDayCode: d.sessionDayCode,
        dayDate: d.dayDate.toISOString(),
      })),
      newStartDate,
      newEndDate,
    );

    if (!validation.isValid) {
      throw new Error(
        `Cannot update semester dates: ${validation.error}. ` +
          `Conflicting dates: ${validation.details?.invalidDates.map((d) => d.date).join(", ")}`,
      );
    }
  }
};
