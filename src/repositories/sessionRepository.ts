import { prisma } from "../config/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
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
// Helper removed as workStartTime is now string


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
      workStartTime: data.workStartTime,
      availabilityStartDate: data.availabilityStartDate ? new Date(data.availabilityStartDate) : null,
      availabilityEndDate: data.availabilityEndDate ? new Date(data.availabilityEndDate) : null,
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
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Create session
    const session = await tx.session.create({
      data: {
        sessionCode: sessionData.sessionCode,
        semesterId: sessionData.semesterId,
        name: sessionData.name,
        type: sessionData.type || "Main",
        timePerTopic: sessionData.timePerTopic,
        workStartTime: sessionData.workStartTime,
        availabilityStartDate: sessionData.availabilityStartDate ? new Date(sessionData.availabilityStartDate) : null,
        availabilityEndDate: sessionData.availabilityEndDate ? new Date(sessionData.availabilityEndDate) : null,
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
  include: IncludeOptions = {},
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

  // Build include options
  const includeOptions: Prisma.SessionInclude = {
    semester: true,
    sessionDays: {
      orderBy: { sessionDayCode: "asc" },
    },
  };

  if (include.sessionDays) {
    // Already included by default, but keeping for compatibility or specific options if expanded later
    includeOptions.sessionDays = true; 
  }

  const [data, total] = await Promise.all([
    prisma.session.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { type: "asc" },
        { workStartTime: "desc" },
      ],
      include: includeOptions,
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
  if (data.workStartTime !== undefined)
    updateData.workStartTime = data.workStartTime;
  if (data.availabilityStartDate !== undefined)
    updateData.availabilityStartDate = data.availabilityStartDate ? new Date(data.availabilityStartDate) : null;
  if (data.availabilityEndDate !== undefined)
    updateData.availabilityEndDate = data.availabilityEndDate ? new Date(data.availabilityEndDate) : null;

  if (data.sessionDays) {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update session details
      const session = await tx.session.update({
        where: { id },
        data: updateData,
      });

      // Handle session days sync
      const existingDays = await tx.sessionDay.findMany({
        where: { sessionId: id },
      });
      const inputCodes = data.sessionDays!.map((d) => d.sessionDayCode);

      // 1. Delete days not in input
      const toDelete = existingDays.filter(
        (d) => !inputCodes.includes(d.sessionDayCode),
      );
      for (const day of toDelete) {
        await tx.sessionDay.delete({ where: { id: day.id } });
      }

      // 2. Create or Update days
      for (const dayInput of data.sessionDays!) {
        const existingDay = existingDays.find(
          (d) => d.sessionDayCode === dayInput.sessionDayCode,
        );

        if (existingDay) {
          // Update
          await tx.sessionDay.update({
            where: { id: existingDay.id },
            data: {
              dayDate: new Date(dayInput.dayDate),
              note: dayInput.note || null,
            },
          });
        } else {
          // Create
          await tx.sessionDay.create({
            data: {
              sessionDayCode: dayInput.sessionDayCode,
              sessionId: id,
              dayDate: new Date(dayInput.dayDate),
              note: dayInput.note || null,
            },
          });
        }
      }

      return session;
    });
  }

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
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
