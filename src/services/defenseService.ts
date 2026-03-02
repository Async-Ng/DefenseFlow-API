/**
 * Defense Service
 * Business logic layer for Defense operations (Functional)
 */

import * as defenseRepository from "../repositories/defenseRepository.js";
import * as semesterRepository from "../repositories/semesterRepository.js";
// Assuming validators will be renamed or updated separately. 
// For now, I will rename the imports assuming they will be refactored.
import {
  validateDefenseData,
  validateDefenseDaysInSemester,
  validateRequiredFields,
} from "../domain/validators.js";
import type {
  Defense,
  CreateDefenseInput,
  UpdateDefenseInput,
  PaginatedResult,
  DefenseFilters,
  IncludeOptions,
} from "../types/index.js";

/**
 * Create a new defense with defense days
 */
export const createDefense = async (data: CreateDefenseInput): Promise<any> => {
  // Validate defense data
  const validation = validateDefenseData(data as Record<string, unknown>);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(", "));
  }

  // Check if defense code already exists
  const existing = await defenseRepository.findByCode(data.defenseCode);
  if (existing) {
    throw new Error(`Defense with code '${data.defenseCode}' already exists`);
  }

  // Verify semester exists
  const semester = await semesterRepository.findById(data.semesterId);
  if (!semester) {
    throw new Error(`Semester with ID ${data.semesterId} not found`);
  }

  // Check if a Main defense already exists for this semester
  if (data.type === "Main") {
    const existingMain = await defenseRepository.findMainBySemesterId(
      data.semesterId,
    );
    if (existingMain) {
      throw new Error(
        `Semester already has a Main defense ('${existingMain.defenseCode}')`,
      );
    }
  }

  // Validate defense days if provided
  if (data.defenseDays && data.defenseDays.length > 0) {
    // Validate each defense day has required fields
    for (const day of data.defenseDays) {
      const dayValidation = validateRequiredFields(
        day as Record<string, unknown>,
        ["defenseDayCode", "dayDate"],
      );
      if (!dayValidation.isValid) {
        throw new Error(
          `Defense day validation failed: ${dayValidation.error}`,
        );
      }
    }

    // Validate defense days fall within semester dates
    if (semester.startDate && semester.endDate) {
      const dateValidation = validateDefenseDaysInSemester(
        data.defenseDays,
        semester.startDate,
        semester.endDate,
      );

      if (!dateValidation.isValid) {
        throw new Error(
          `${dateValidation.error}. Invalid dates: ${dateValidation.details?.invalidDates
            .map((d) => `${d.date} (${d.reason})`)
            .join(", ")}`,
        );
      }
    }

    // Create defense with days
    return await defenseRepository.createWithDays(data, data.defenseDays);
  } else {
    // Create defense without days
    return await defenseRepository.create(data);
  }
};

/**
 * Get all defenses with pagination
 */
export const getAllDefenses = async (
  page: number = 1,
  limit: number = 10,
  filters: DefenseFilters = {},
  include: IncludeOptions = {},
): Promise<PaginatedResult<any>> => {
  return await defenseRepository.findAll(page, limit, filters, include);
};

/**
 * Get defense by ID
 */
export const getDefenseById = async (
  id: number,
  include: IncludeOptions = {},
): Promise<any> => {
  const defense = await defenseRepository.findById(id, include);
  if (!defense) {
    throw new Error(`Defense with ID ${id} not found`);
  }
  return defense;
};

/**
 * Update defense
 */
export const updateDefense = async (
  id: number,
  data: UpdateDefenseInput,
): Promise<Defense> => {
  // Check if defense exists
  const existing = await defenseRepository.findById(id);
  if (!existing) {
    throw new Error(`Defense with ID ${id} not found`);
  }

  // If updating defense code, check for duplicates
  if (data.defenseCode && data.defenseCode !== existing.defenseCode) {
    const duplicate = await defenseRepository.findByCode(data.defenseCode);
    if (duplicate) {
      throw new Error(`Defense with code '${data.defenseCode}' already exists`);
    }
  }

  // If updating to Main, check if another Main defense exists for this semester
  if (data.type === "Main") {
    const existingMain = await defenseRepository.findMainBySemesterId(
      existing.semesterId,
    );
    if (existingMain && existingMain.id !== id) {
      throw new Error(
        `Semester already has another Main defense ('${existingMain.defenseCode}')`,
      );
    }
  }

  // Validate timePerTopic if provided
  if (data.timePerTopic !== undefined && data.timePerTopic !== null) {
    if (typeof data.timePerTopic !== "number" || data.timePerTopic <= 0) {
      throw new Error("Time per topic must be a positive number");
    }
  }

  // Validate maxCouncilsPerDay if provided
  if (data.maxCouncilsPerDay !== undefined && data.maxCouncilsPerDay !== null) {
    if (typeof data.maxCouncilsPerDay !== "number" || data.maxCouncilsPerDay <= 0) {
      throw new Error("Max councils per day must be a positive number");
    }
  }

  // Validate defense days if provided
  if (data.defenseDays && data.defenseDays.length > 0) {
    // Validate each defense day has required fields
    for (const day of data.defenseDays) {
      const dayValidation = validateRequiredFields(
        day as Record<string, unknown>,
        ["defenseDayCode", "dayDate"],
      );
      if (!dayValidation.isValid) {
        throw new Error(
          `Defense day validation failed: ${dayValidation.error}`,
        );
      }
    }

    // Validate defense days fall within semester dates
    if (existing.semester && existing.semester.startDate && existing.semester.endDate) {
      const dateValidation = validateDefenseDaysInSemester(
        data.defenseDays,
        existing.semester.startDate,
        existing.semester.endDate,
      );

      if (!dateValidation.isValid) {
        throw new Error(
          `${dateValidation.error}. Invalid dates: ${dateValidation.details?.invalidDates
            .map((d: any) => `${d.date} (${d.reason})`)
            .join(", ")}`,
        );
      }
    }
  }

  // Update defense
  return await defenseRepository.update(id, data);
};

/**
 * Delete defense
 */
export const deleteDefense = async (id: number): Promise<Defense> => {
  // Check if defense exists
  const existing = await defenseRepository.findById(id);
  if (!existing) {
    throw new Error(`Defense with ID ${id} not found`);
  }

  // Check for dependencies
  const dependencies = await defenseRepository.checkDependencies(id);
  if (dependencies.hasCouncilBoards) {
    throw new Error(
      "Cannot delete defense with associated council boards. Please delete council boards first.",
    );
  }
  if (dependencies.hasRegistrations) {
    throw new Error(
      "Cannot delete defense with topic registrations. Please remove registrations first.",
    );
  }

  // Delete defense
  return await defenseRepository.deleteDefense(id);
};
