/**
 * Session Repository
 * Data access layer for Session entity
 */

import prisma from "../config/prisma.js";

/**
 * Convert time string (HH:MM:SS) to DateTime for Prisma Time fields
 * @param {string} timeString - Time in HH:MM:SS format
 * @returns {Date} DateTime object with today's date and specified time
 */
const timeToDateTime = (timeString) => {
  if (!timeString) return null;
  const [hours, minutes, seconds] = timeString.split(":");
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds || 0), 0);
  return date;
};

class SessionRepository {
  /**
   * Create a new session
   * @param {Object} data - Session data
   * @returns {Promise<Object>} Created session
   */
  async create(data) {
    return await prisma.session.create({
      data: {
        sessionCode: data.sessionCode,
        semesterId: parseInt(data.semesterId),
        name: data.name,
        type: data.type || "Main",
        timePerTopic: data.timePerTopic,
        workStartTime: timeToDateTime(data.workStartTime),
      },
    });
  }

  /**
   * Create session with session days in a transaction
   * @param {Object} sessionData - Session data
   * @param {Array} sessionDays - Array of session day objects
   * @returns {Promise<Object>} Created session with days
   */
  async createWithDays(sessionData, sessionDays) {
    return await prisma.$transaction(async (tx) => {
      // Create session
      const session = await tx.session.create({
        data: {
          sessionCode: sessionData.sessionCode,
          semesterId: parseInt(sessionData.semesterId),
          name: sessionData.name,
          type: sessionData.type || "Main",
          timePerTopic: sessionData.timePerTopic,
          workStartTime: timeToDateTime(sessionData.workStartTime),
        },
      });

      // Create session days
      if (sessionDays && sessionDays.length > 0) {
        await tx.sessionDay.createMany({
          data: sessionDays.map((day) => ({
            sessionDayCode: day.sessionDayCode,
            sessionId: session.id,
            dayDate: new Date(day.dayDate),
            note: day.note || null,
          })),
        });
      }

      // Return session with days
      return await tx.session.findUnique({
        where: { id: session.id },
        include: { sessionDays: true },
      });
    });
  }

  /**
   * Find all sessions with pagination and filters
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} { data, total }
   */
  async findAll(page = 1, limit = 10, filters = {}) {
    const skip = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (filters.sessionCode) {
      where.sessionCode = { contains: filters.sessionCode };
    }
    if (filters.semesterId) {
      where.semesterId = parseInt(filters.semesterId);
    }
    if (filters.type) {
      where.type = filters.type;
    }

    const [data, total] = await Promise.all([
      prisma.session.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: "desc" },
        include: { semester: true },
      }),
      prisma.session.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Find session by ID
   * @param {number} id - Session ID
   * @param {Object} include - Relations to include
   * @returns {Promise<Object|null>} Session or null
   */
  async findById(id, include = {}) {
    const includeOptions = {
      semester: true,
    };

    if (include.sessionDays) {
      includeOptions.sessionDays = true;
    }
    if (include.councils) {
      includeOptions.sessionDays = {
        include: { councils: true },
      };
    }

    return await prisma.session.findUnique({
      where: { id: parseInt(id) },
      include: includeOptions,
    });
  }

  /**
   * Find session by code
   * @param {string} sessionCode - Session code
   * @returns {Promise<Object|null>} Session or null
   */
  async findByCode(sessionCode) {
    return await prisma.session.findUnique({
      where: { sessionCode },
      include: { semester: true },
    });
  }

  /**
   * Update session
   * @param {number} id - Session ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated session
   */
  async update(id, data) {
    const updateData = {};

    if (data.sessionCode !== undefined)
      updateData.sessionCode = data.sessionCode;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.timePerTopic !== undefined)
      updateData.timePerTopic = data.timePerTopic;
    if (data.workStartTime !== undefined)
      updateData.workStartTime = timeToDateTime(data.workStartTime);

    return await prisma.session.update({
      where: { id: parseInt(id) },
      data: updateData,
    });
  }

  /**
   * Delete session
   * @param {number} id - Session ID
   * @returns {Promise<Object>} Deleted session
   */
  async delete(id) {
    // Delete in transaction to handle session days
    return await prisma.$transaction(async (tx) => {
      // Delete session days first
      await tx.sessionDay.deleteMany({
        where: { sessionId: parseInt(id) },
      });

      // Delete session
      return await tx.session.delete({
        where: { id: parseInt(id) },
      });
    });
  }

  /**
   * Check if session has dependencies (councils, registrations, etc.)
   * @param {number} sessionId - Session ID
   * @returns {Promise<Object>} { hasCouncils, hasRegistrations }
   */
  async checkDependencies(sessionId) {
    const [councilCount, registrationCount] = await Promise.all([
      prisma.council.count({
        where: {
          sessionDay: {
            sessionId: parseInt(sessionId),
          },
        },
      }),
      prisma.topicSessionRegistration.count({
        where: { sessionId: parseInt(sessionId) },
      }),
    ]);

    return {
      hasCouncils: councilCount > 0,
      hasRegistrations: registrationCount > 0,
    };
  }
}

export default new SessionRepository();
