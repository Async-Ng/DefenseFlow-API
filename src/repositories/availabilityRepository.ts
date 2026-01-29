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
  const sessionDays = await prisma.sessionDay.findMany({
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

  return sessionDays.map((day) => ({
    ...day,
    lecturerDayAvailability: day.lecturerDayAvailability.map((lda) => ({
      status: lda.status || "Available", // Default to "Available" if null, though logically should be set
    })),
  }));
};

/**
 * Get lecturer's availability for a specific session
 */
export const getLecturerAvailability = async (
  lecturerId: number,
  sessionId: number,
): Promise<LecturerDayAvailability[]> => {
  const availabilities = await prisma.lecturerDayAvailability.findMany({
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

  return availabilities.map((avail) => ({
    id: avail.id,
    sessionDayId: avail.sessionDayId ?? 0, // Should not be null for existing record
    status: avail.status || "Available",
  }));
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
  const record = await prisma.lecturerDayAvailability.findFirst({
    where: {
      lecturerId,
      sessionDayId,
    },
  });

  if (!record) return null;

  return {
    id: record.id,
    sessionDayId: record.sessionDayId ?? sessionDayId,
    status: record.status || "Available",
  };
};

/**
 * Create or update lecturer availability for a specific day
 */
export const upsertAvailability = async (
  lecturerId: number,
  sessionDayId: number,
  status: AvailabilityStatus,
): Promise<LecturerDayAvailability> => {
  // Verify unique constraints or use findFirst if compound key name is unknown.
  // Assuming schema has @@unique([lecturerId, sessionDayId])
  const existing = await findAvailabilityRecord(lecturerId, sessionDayId);

  let result;
  if (existing) {
    result = await prisma.lecturerDayAvailability.update({
      where: { id: existing.id },
      data: { status },
      include: { sessionDay: true },
    });
  } else {
    result = await prisma.lecturerDayAvailability.create({
      data: { lecturerId, sessionDayId, status },
      include: { sessionDay: true },
    });
  }

  return {
    id: result.id,
    sessionDayId: result.sessionDayId ?? sessionDayId,
    status: result.status || "Available",
  };
};

/**
 * Batch update lecturer availability
 */
export const batchUpdateAvailability = async (
  lecturerId: number,
  updates: Array<{ sessionDayId: number; status: AvailabilityStatus }>,
): Promise<LecturerDayAvailability[]> => {
  // Use transaction to ensure atomicity
  return await prisma.$transaction(async (tx) => {
    const results: LecturerDayAvailability[] = [];

    for (const update of updates) {
      // Manual check to avoid assuming @@unique name
      const existing = await tx.lecturerDayAvailability.findFirst({
        where: { lecturerId, sessionDayId: update.sessionDayId },
      });

      let result;
      if (existing) {
        result = await tx.lecturerDayAvailability.update({
          where: { id: existing.id },
          data: { status: update.status },
          include: { sessionDay: true },
        });
      } else {
        result = await tx.lecturerDayAvailability.create({
          data: {
            lecturerId,
            sessionDayId: update.sessionDayId,
            status: update.status,
          },
          include: { sessionDay: true },
        });
      }

      results.push({
        id: result.id,
        sessionDayId: result.sessionDayId ?? update.sessionDayId,
        status: result.status || "Available",
      });
    }
    return results;
  });
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
