/**
 * Session Service
 * Business logic layer for Session operations (Functional)
 */

import * as sessionRepository from "@repositories/sessionRepository.js";
import * as semesterRepository from "@repositories/semesterRepository.js";
import {
  validateSessionData,
  validateSessionDaysInSemester,
  validateRequiredFields,
} from "@domain/validators.js";
import type {
  Session,
  CreateSessionInput,
  UpdateSessionInput,
  PaginatedResult,
  SessionFilters,
  IncludeOptions,
} from "../types/index.js";

/**
 * Create a new session with session days
 */
export const createSession = async (data: CreateSessionInput): Promise<any> => {
  // Validate session data
  const validation = validateSessionData(data as Record<string, unknown>);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(", "));
  }

  // Check if session code already exists
  const existing = await sessionRepository.findByCode(data.sessionCode);
  if (existing) {
    throw new Error(`Session with code '${data.sessionCode}' already exists`);
  }

  // Verify semester exists
  const semester = await semesterRepository.findById(data.semesterId);
  if (!semester) {
    throw new Error(`Semester with ID ${data.semesterId} not found`);
  }

  // Validate session days if provided
  if (data.sessionDays && data.sessionDays.length > 0) {
    // Validate each session day has required fields
    for (const day of data.sessionDays) {
      const dayValidation = validateRequiredFields(
        day as Record<string, unknown>,
        ["sessionDayCode", "dayDate"],
      );
      if (!dayValidation.isValid) {
        throw new Error(
          `Session day validation failed: ${dayValidation.error}`,
        );
      }
    }

    // Validate session days fall within semester dates
    if (semester.startDate && semester.endDate) {
      const dateValidation = validateSessionDaysInSemester(
        data.sessionDays,
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

    // Create session with days
    return await sessionRepository.createWithDays(data, data.sessionDays);
  } else {
    // Create session without days
    return await sessionRepository.create(data);
  }
};

/**
 * Get all sessions with pagination
 */
export const getAllSessions = async (
  page: number = 1,
  limit: number = 10,
  filters: SessionFilters = {},
): Promise<PaginatedResult<any>> => {
  return await sessionRepository.findAll(page, limit, filters);
};

/**
 * Get session by ID
 */
export const getSessionById = async (
  id: number,
  include: IncludeOptions = {},
): Promise<any> => {
  const session = await sessionRepository.findById(id, include);
  if (!session) {
    throw new Error(`Session with ID ${id} not found`);
  }
  return session;
};

/**
 * Update session
 */
export const updateSession = async (
  id: number,
  data: UpdateSessionInput,
): Promise<Session> => {
  // Check if session exists
  const existing = await sessionRepository.findById(id);
  if (!existing) {
    throw new Error(`Session with ID ${id} not found`);
  }

  // If updating session code, check for duplicates
  if (data.sessionCode && data.sessionCode !== existing.sessionCode) {
    const duplicate = await sessionRepository.findByCode(data.sessionCode);
    if (duplicate) {
      throw new Error(`Session with code '${data.sessionCode}' already exists`);
    }
  }

  // Validate timePerTopic if provided
  if (data.timePerTopic !== undefined && data.timePerTopic !== null) {
    if (typeof data.timePerTopic !== "number" || data.timePerTopic <= 0) {
      throw new Error("Time per topic must be a positive number");
    }
  }

  // Update session
  return await sessionRepository.update(id, data);
};

/**
 * Delete session
 */
export const deleteSession = async (id: number): Promise<Session> => {
  // Check if session exists
  const existing = await sessionRepository.findById(id);
  if (!existing) {
    throw new Error(`Session with ID ${id} not found`);
  }

  // Check for dependencies
  const dependencies = await sessionRepository.checkDependencies(id);
  if (dependencies.hasCouncils) {
    throw new Error(
      "Cannot delete session with associated councils. Please delete councils first.",
    );
  }
  if (dependencies.hasRegistrations) {
    throw new Error(
      "Cannot delete session with topic registrations. Please remove registrations first.",
    );
  }

  // Delete session
  return await sessionRepository.deleteSession(id);
};
