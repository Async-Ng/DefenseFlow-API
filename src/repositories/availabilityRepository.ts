/**
 * Availability Repository
 * Data access layer for Lecturer Day Availability operations
 */

import { prisma } from "../config/prisma.js";
import type {
  SessionDay,
  SessionDayWithAvailability,
  LecturerDayAvailability,
  LecturerSessionConfig,
  AvailabilityStatus,
} from "../types/index.js";

/**
 * Get all session days for a specific session
 */
export const getSessionDaysBySessionId = async (
  sessionId: number,
): Promise<SessionDay[]> => {
  return await prisma.sessionDay.findMany({
    where: {
      sessionId,
    },
    orderBy: {
      dayDate: "asc",
    },
  });
};

/**
 * Get all session days for active session with lecturer availability
 */
export const getSessionDaysWithAvailability = async (
  sessionId: number,
  lecturerId: number,
): Promise<SessionDayWithAvailability[]> => {
  return await prisma.sessionDay.findMany({
    where: {
      sessionId,
    },
    include: {
      lecturerDayAvailability: {
        where: {
          lecturerId,
        },
      },
    },
    orderBy: {
      dayDate: "asc",
    },
  });
};

/**
 * Get lecturer's availability for a specific session
 */
export const getLecturerAvailability = async (
  lecturerId: number,
  sessionId: number,
): Promise<LecturerDayAvailability[]> => {
  return await prisma.lecturerDayAvailability.findMany({
    where: {
      lecturerId,
      sessionDay: {
        sessionId,
      },
    },
    include: {
      sessionDay: true,
    },
    orderBy: {
      sessionDay: {
        dayDate: "asc",
      },
    },
  });
};

/**
 * Get lecturer's session configuration
 */
export const getLecturerSessionConfig = async (
  lecturerId: number,
  sessionId: number,
): Promise<LecturerSessionConfig | null> => {
  return await prisma.lecturerSessionConfig.findFirst({
    where: {
      lecturerId,
      sessionId,
    },
  });
};

/**
 * Find existing availability record
 */
export const findAvailabilityRecord = async (
  lecturerId: number,
  sessionDayId: number,
): Promise<LecturerDayAvailability | null> => {
  return await prisma.lecturerDayAvailability.findFirst({
    where: {
      lecturerId,
      sessionDayId,
    },
  });
};

/**
 * Create or update lecturer availability for a specific day
 */
export const upsertAvailability = async (
  lecturerId: number,
  sessionDayId: number,
  status: AvailabilityStatus,
): Promise<LecturerDayAvailability> => {
  // First, check if record exists
  const existing = await findAvailabilityRecord(lecturerId, sessionDayId);

  if (existing) {
    // Update existing record
    return await prisma.lecturerDayAvailability.update({
      where: {
        id: existing.id,
      },
      data: {
        status,
      },
      include: {
        sessionDay: true,
      },
    });
  } else {
    // Create new record
    return await prisma.lecturerDayAvailability.create({
      data: {
        lecturerId,
        sessionDayId,
        status,
      },
      include: {
        sessionDay: true,
      },
    });
  }
};

/**
 * Batch update lecturer availability
 */
export const batchUpdateAvailability = async (
  lecturerId: number,
  updates: Array<{ sessionDayId: number; status: AvailabilityStatus }>,
): Promise<LecturerDayAvailability[]> => {
  const results: LecturerDayAvailability[] = [];

  // Use transaction to ensure atomicity
  await prisma.$transaction(async (tx) => {
    for (const update of updates) {
      // Check if record exists
      const existing = await tx.lecturerDayAvailability.findFirst({
        where: {
          lecturerId,
          sessionDayId: update.sessionDayId,
        },
      });

      let result: LecturerDayAvailability;

      if (existing) {
        // Update existing
        result = await tx.lecturerDayAvailability.update({
          where: {
            id: existing.id,
          },
          data: {
            status: update.status,
          },
          include: {
            sessionDay: true,
          },
        });
      } else {
        // Create new
        result = await tx.lecturerDayAvailability.create({
          data: {
            lecturerId,
            sessionDayId: update.sessionDayId,
            status: update.status,
          },
          include: {
            sessionDay: true,
          },
        });
      }

      results.push(result);
    }
  });

  return results;
};

/**
 * Delete lecturer availability record
 */
export const deleteAvailability = async (
  lecturerId: number,
  sessionDayId: number,
): Promise<void> => {
  const existing = await findAvailabilityRecord(lecturerId, sessionDayId);

  if (existing) {
    await prisma.lecturerDayAvailability.delete({
      where: {
        id: existing.id,
      },
    });
  }
};

/**
 * Get session by ID with lock status (for validation)
 */
export const getSessionById = async (sessionId: number) => {
  return await prisma.session.findUnique({
    where: {
      id: sessionId,
    },
  });
};

/**
 * Get session day by ID
 */
export const getSessionDayById = async (
  sessionDayId: number,
): Promise<SessionDay | null> => {
  return await prisma.sessionDay.findUnique({
    where: {
      id: sessionDayId,
    },
  });
};

/**
 * Verify lecturer exists
 */
export const getLecturerById = async (lecturerId: number) => {
  return await prisma.lecturer.findUnique({
    where: {
      id: lecturerId,
    },
  });
};
