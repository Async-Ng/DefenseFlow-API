/**
 * Semester Service
 * Business logic layer for Semester operations
 */

import semesterRepository from "../repositories/semesterRepository.js";
import {
  validateSemesterData,
  validateDateRange,
  validateSessionDaysInSemester,
} from "../domain/validators.js";

class SemesterService {
  /**
   * Create a new semester
   * @param {Object} data - Semester data
   * @returns {Promise<Object>} Created semester
   * @throws {Error} Validation or business rule errors
   */
  async createSemester(data) {
    // Validate semester data
    const validation = validateSemesterData(data);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    // Check if semester code already exists
    const existing = await semesterRepository.findByCode(data.semesterCode);
    if (existing) {
      throw new Error(
        `Semester with code '${data.semesterCode}' already exists`,
      );
    }

    // Create semester
    return await semesterRepository.create(data);
  }

  /**
   * Get all semesters with pagination
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} { data, total, page, limit }
   */
  async getAllSemesters(page = 1, limit = 10, filters = {}) {
    const result = await semesterRepository.findAll(page, limit, filters);
    return {
      data: result.data,
      total: result.total,
      page,
      limit,
    };
  }

  /**
   * Get semester by ID
   * @param {number} id - Semester ID
   * @param {Object} include - Relations to include
   * @returns {Promise<Object>} Semester
   * @throws {Error} If semester not found
   */
  async getSemesterById(id, include = {}) {
    const semester = await semesterRepository.findById(id, include);
    if (!semester) {
      throw new Error(`Semester with ID ${id} not found`);
    }
    return semester;
  }

  /**
   * Update semester
   * @param {number} id - Semester ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated semester
   * @throws {Error} Validation or business rule errors
   */
  async updateSemester(id, data) {
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
      if (!dateValidation.isValid) {
        throw new Error(dateValidation.error);
      }

      // Check for conflicts with existing sessions
      await this.checkSessionConflicts(id, newStartDate, newEndDate);
    }

    // Update semester
    return await semesterRepository.update(id, data);
  }

  /**
   * Delete semester
   * @param {number} id - Semester ID
   * @returns {Promise<Object>} Deleted semester
   * @throws {Error} If semester has dependencies
   */
  async deleteSemester(id) {
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
    return await semesterRepository.delete(id);
  }

  /**
   * Check if updating semester dates would conflict with existing sessions
   * @param {number} semesterId - Semester ID
   * @param {Date|string} newStartDate - New start date
   * @param {Date|string} newEndDate - New end date
   * @throws {Error} If conflicts found
   */
  async checkSessionConflicts(semesterId, newStartDate, newEndDate) {
    const sessions = await semesterRepository.getSessionsWithDays(semesterId);

    if (sessions.length === 0) {
      return; // No conflicts
    }

    // Collect all session days
    const allSessionDays = [];
    for (const session of sessions) {
      if (session.sessionDays) {
        allSessionDays.push(...session.sessionDays);
      }
    }

    // Validate session days against new semester dates
    if (allSessionDays.length > 0) {
      const validation = validateSessionDaysInSemester(
        allSessionDays,
        newStartDate,
        newEndDate,
      );

      if (!validation.isValid) {
        throw new Error(
          `Cannot update semester dates: ${validation.error}. ` +
            `Conflicting dates: ${validation.invalidDates.map((d) => d.date).join(", ")}`,
        );
      }
    }
  }
}

export default new SemesterService();
