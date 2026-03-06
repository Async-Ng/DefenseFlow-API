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

  // Delete defense (cascading handled in repository transaction)
  return await defenseRepository.deleteDefense(id);
};

/**
 * Publish availability registration for a defense
 * Once published, lecturers can view and register their availability
 */
export const publishAvailability = async (
  id: number,
  startDate?: string,
  endDate?: string,
): Promise<Defense> => {
  const existing = await defenseRepository.findById(id);
  if (!existing) {
    throw new Error(`Defense with ID ${id} not found`);
  }

  if (existing.isAvailabilityPublished) {
    throw new Error(
      `Availability for defense '${existing.defenseCode}' is already published`,
    );
  }

  // Validate dates if provided
  if (startDate && endDate) {
    if (new Date(startDate) > new Date(endDate)) {
      throw new Error("Start date cannot be after end date");
    }
  }

  return await defenseRepository.publishAvailability(id, startDate, endDate);
};

/**
 * Import failed topics from the Main defense to this Resit defense
 */
export const importFailedTopics = async (resitDefenseId: number): Promise<{ importedCount: number }> => {
  // 1. Verify target defense exists and is a Resit
  const targetDefense = await defenseRepository.findById(resitDefenseId);
  if (!targetDefense) {
    throw new Error(`Defense with ID ${resitDefenseId} not found`);
  }
  if (targetDefense.type !== "Resit") {
    throw new Error(`Target defense '${targetDefense.defenseCode}' must be a Resit defense`);
  }

  // 2. Find the Main defense for this same semester
  const mainDefense = await defenseRepository.findMainBySemesterId(targetDefense.semesterId);
  if (!mainDefense) {
    throw new Error(`Semester ${targetDefense.semesterId} does not have a Main defense to import from`);
  }

  // 3. Import topic defense repository to interact with topics
  const topicDefenseRepository = (await import("../repositories/topicDefenseRepository.js"));
  
  // 4. Get all failed topics from the Main defense
  const { data: failedTopics } = await topicDefenseRepository.findAndCountAll({
    defenseId: mainDefense.id,
    finalResult: "Failed"
  }, 1, 9999); // using a large limit to grab all
  
  if (failedTopics.length === 0) {
    return { importedCount: 0 };
  }

  // 5. Get existing topics already registered in the Resit defense
  const { data: existingResitTopics } = await topicDefenseRepository.findAndCountAll({
    defenseId: resitDefenseId
  }, 1, 9999);
  
  const existingTopicIds = new Set(existingResitTopics.map(td => td.topicId));

  // 6. Filter out topics already in the Resit defense
  const newFailedTopicIds = failedTopics
    .filter(td => td.topicId !== null && !existingTopicIds.has(td.topicId))
    .map(td => td.topicId as number);

  if (newFailedTopicIds.length === 0) {
    throw new Error("All failed topics have already been imported to this Resit defense");
  }

  // 7. Clone/register these topics into the Resit defense
  await topicDefenseRepository.create({
    defenseId: resitDefenseId,
    topicIds: newFailedTopicIds
  });

  return { importedCount: newFailedTopicIds.length };
};
