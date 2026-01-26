/**
 * Session Service
 * Business logic layer for Session operations
 */

import sessionRepository from "../repositories/sessionRepository.js";
import semesterRepository from "../repositories/semesterRepository.js";
import {
  validateSessionData,
  validateSessionDaysInSemester,
  validateRequiredFields,
} from "../domain/validators.js";

class SessionService {
  /**
   * Create a new session with session days
   * @param {Object} data - Session data including sessionDays array
   * @returns {Promise<Object>} Created session with days
   * @throws {Error} Validation or business rule errors
   */
  async createSession(data) {
    // Validate session data
    const validation = validateSessionData(data);
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
        const dayValidation = validateRequiredFields(day, [
          "sessionDayCode",
          "dayDate",
        ]);
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
            `${dateValidation.error}. Invalid dates: ${dateValidation.invalidDates
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
  }

  /**
   * Get all sessions with pagination
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} { data, total, page, limit }
   */
  async getAllSessions(page = 1, limit = 10, filters = {}) {
    const result = await sessionRepository.findAll(page, limit, filters);
    return {
      data: result.data,
      total: result.total,
      page,
      limit,
    };
  }

  /**
   * Get session by ID
   * @param {number} id - Session ID
   * @param {Object} include - Relations to include
   * @returns {Promise<Object>} Session
   * @throws {Error} If session not found
   */
  async getSessionById(id, include = {}) {
    const session = await sessionRepository.findById(id, include);
    if (!session) {
      throw new Error(`Session with ID ${id} not found`);
    }
    return session;
  }

  /**
   * Update session
   * @param {number} id - Session ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated session
   * @throws {Error} Validation or business rule errors
   */
  async updateSession(id, data) {
    // Check if session exists
    const existing = await sessionRepository.findById(id);
    if (!existing) {
      throw new Error(`Session with ID ${id} not found`);
    }

    // If updating session code, check for duplicates
    if (data.sessionCode && data.sessionCode !== existing.sessionCode) {
      const duplicate = await sessionRepository.findByCode(data.sessionCode);
      if (duplicate) {
        throw new Error(
          `Session with code '${data.sessionCode}' already exists`,
        );
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
  }

  /**
   * Delete session
   * @param {number} id - Session ID
   * @returns {Promise<Object>} Deleted session
   * @throws {Error} If session has dependencies
   */
  async deleteSession(id) {
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
    return await sessionRepository.delete(id);
  }
}

export default new SessionService();
