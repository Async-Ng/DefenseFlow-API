/**
 * Session Repository
 * Data access layer for Session entity (Functional)
 */

import prisma from "../config/prisma.js";
import { Prisma } from "@prisma/client";
import type {
  Session,
  CreateSessionInput,
  CreateSessionDayInput,
  UpdateSessionInput,
  PaginatedResult,
  SessionFilters,
  IncludeOptions,
  SessionDependencies,
} from "../types/index.js";

/**
 * Convert time string (HH:MM:SS) to DateTime for Prisma Time fields
 */
const timeToDateTime = (timeString: string | undefined): Date | null => {
  if (!timeString) return null;
  const [hours, minutes, seconds] = timeString.split(":");
  const date = new Date();
  date.setHours(
    parseInt(hours),
    parseInt(minutes),
    parseInt(seconds || "0"),
    0,
  );
  return date;
};

/**
 * Create a new session
 */
export const create = async (data: CreateSessionInput): Promise<Session> => {
  return await prisma.session.create({
    data: {
      sessionCode: data.sessionCode,
      semesterId: data.semesterId,
      name: data.name,
      type: data.type || "Main",
      timePerTopic: data.timePerTopic,
      workStartTime: timeToDateTime(data.workStartTime),
    },
  });
};

/**
 * Create session with session days in a transaction
 */
export const createWithDays = async (
  sessionData: CreateSessionInput,
  sessionDays: CreateSessionDayInput[],
): Promise<any> => {
  return await prisma.$transaction(async (tx) => {
    // Create session
    const session = await tx.session.create({
      data: {
        sessionCode: sessionData.sessionCode,
        semesterId: sessionData.semesterId,
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
};

/**
 * Find all sessions with pagination and filters
 */
export const findAll = async (
  page: number = 1,
  limit: number = 10,
  filters: SessionFilters = {},
): Promise<PaginatedResult<any>> => {
  const skip = (page - 1) * limit;
  const where: Prisma.SessionWhereInput = {};

  // Apply filters
  if (filters.sessionCode) {
    where.sessionCode = { contains: filters.sessionCode };
  }
  if (filters.semesterId) {
    where.semesterId = filters.semesterId;
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

  return { data, total, page, limit };
};

/**
 * Find session by ID
 */
export const findById = async (
  id: number,
  include: IncludeOptions = {},
): Promise<any | null> => {
  const includeOptions: Prisma.SessionInclude = {
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
    where: { id },
    include: includeOptions,
  });
};

/**
 * Find session by code
 */
export const findByCode = async (sessionCode: string): Promise<any | null> => {
  return await prisma.session.findUnique({
    where: { sessionCode },
    include: { semester: true },
  });
};

/**
 * Update session
 */
export const update = async (
  id: number,
  data: UpdateSessionInput,
): Promise<Session> => {
  const updateData: Prisma.SessionUpdateInput = {};

  if (data.sessionCode !== undefined) updateData.sessionCode = data.sessionCode;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.timePerTopic !== undefined)
    updateData.timePerTopic = data.timePerTopic;
  if (data.workStartTime !== undefined)
    updateData.workStartTime = timeToDateTime(data.workStartTime);

  return await prisma.session.update({
    where: { id },
    data: updateData,
  });
};

/**
 * Delete session
 */
export const deleteSession = async (id: number): Promise<Session> => {
  // Delete in transaction to handle session days
  return await prisma.$transaction(async (tx) => {
    // Delete session days first
    await tx.sessionDay.deleteMany({
      where: { sessionId: id },
    });

    // Delete session
    return await tx.session.delete({
      where: { id },
    });
  });
};

/**
 * Check if session has dependencies (councils, registrations, etc.)
 */
export const checkDependencies = async (
  sessionId: number,
): Promise<SessionDependencies> => {
  const [councilCount, registrationCount] = await Promise.all([
    prisma.council.count({
      where: {
        sessionDay: {
          sessionId,
        },
      },
    }),
    prisma.topicSessionRegistration.count({
      where: { sessionId },
    }),
  ]);

  return {
    hasCouncils: councilCount > 0,
    hasRegistrations: registrationCount > 0,
  };
};
