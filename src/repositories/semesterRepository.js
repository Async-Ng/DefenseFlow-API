/**
 * Semester Repository
 * Data access layer for Semester entity
 */

import prisma from "../config/prisma.js";

class SemesterRepository {
  /**
   * Create a new semester
   * @param {Object} data - Semester data
   * @returns {Promise<Object>} Created semester
   */
  async create(data) {
    return await prisma.semester.create({
      data: {
        semesterCode: data.semesterCode,
        name: data.name,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });
  }

  /**
   * Find all semesters with pagination and filters
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} { data, total }
   */
  async findAll(page = 1, limit = 10, filters = {}) {
    const skip = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (filters.semesterCode) {
      where.semesterCode = { contains: filters.semesterCode };
    }
    if (filters.name) {
      where.name = { contains: filters.name };
    }

    const [data, total] = await Promise.all([
      prisma.semester.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: "desc" },
      }),
      prisma.semester.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Find semester by ID
   * @param {number} id - Semester ID
   * @param {Object} include - Relations to include
   * @returns {Promise<Object|null>} Semester or null
   */
  async findById(id, include = {}) {
    const includeOptions = {};

    if (include.sessions) {
      includeOptions.sessions = {
        include: include.sessionDays ? { sessionDays: true } : false,
      };
    }
    if (include.topics) {
      includeOptions.topics = true;
    }
    if (include.councils) {
      includeOptions.councils = true;
    }

    return await prisma.semester.findUnique({
      where: { id: parseInt(id) },
      include:
        Object.keys(includeOptions).length > 0 ? includeOptions : undefined,
    });
  }

  /**
   * Find semester by code
   * @param {string} semesterCode - Semester code
   * @returns {Promise<Object|null>} Semester or null
   */
  async findByCode(semesterCode) {
    return await prisma.semester.findUnique({
      where: { semesterCode },
    });
  }

  /**
   * Update semester
   * @param {number} id - Semester ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated semester
   */
  async update(id, data) {
    const updateData = {};

    if (data.semesterCode !== undefined)
      updateData.semesterCode = data.semesterCode;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    }
    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    }

    return await prisma.semester.update({
      where: { id: parseInt(id) },
      data: updateData,
    });
  }

  /**
   * Delete semester
   * @param {number} id - Semester ID
   * @returns {Promise<Object>} Deleted semester
   */
  async delete(id) {
    return await prisma.semester.delete({
      where: { id: parseInt(id) },
    });
  }

  /**
   * Check if semester has active sessions
   * @param {number} semesterId - Semester ID
   * @returns {Promise<boolean>} True if has sessions
   */
  async hasActiveSessions(semesterId) {
    const count = await prisma.session.count({
      where: { semesterId: parseInt(semesterId) },
    });
    return count > 0;
  }

  /**
   * Get sessions for date conflict checking
   * @param {number} semesterId - Semester ID
   * @returns {Promise<Array>} Sessions with session days
   */
  async getSessionsWithDays(semesterId) {
    return await prisma.session.findMany({
      where: { semesterId: parseInt(semesterId) },
      include: { sessionDays: true },
    });
  }
}

export default new SemesterRepository();
