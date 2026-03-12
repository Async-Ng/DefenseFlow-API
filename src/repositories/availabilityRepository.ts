/**
 * Availability Repository
 * Data access layer for Lecturer Day Availability operations
 */

import { prisma } from "../config/prisma.js";
import type {
  DefenseDay,
  DefenseDayWithAvailability,
  LecturerDayAvailability,
  LecturerDefenseConfig,
  AvailabilityStatus,
} from "../types/index.js";

/**
 * Get all defense days for a specific defense with status and counts
 */
export const getEnhancedDefenseDaysByDefenseId = async (
  defenseId: number,
): Promise<any[]> => {
  return await prisma.defenseDay.findMany({
    where: {
      defenseId,
    },
    include: {
      councilBoards: {
        select: { id: true },
      },
      lecturerDayAvailability: {
        select: { status: true },
      },
      defense: {
        select: {
          isAvailabilityPublished: true,
          isSchedulePublished: true,
          status: true,
          availabilityEndDate: true,
          lecturerDefenseConfigs: {
            select: { id: true },
          },
        },
      },
    },
    orderBy: {
      dayDate: "asc",
    },
  });
};

/**
 * Get all defense days for active defense with lecturer availability
 */
export const getDefenseDaysWithAvailability = async (
  defenseId: number,
  lecturerId: number,
): Promise<DefenseDayWithAvailability[]> => {
  return await prisma.defenseDay.findMany({
    where: {
      defenseId,
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
 * Get lecturer's availability for a specific defense
 */
export const getLecturerAvailability = async (
  lecturerId: number,
  defenseId: number,
): Promise<LecturerDayAvailability[]> => {
  return await prisma.lecturerDayAvailability.findMany({
    where: {
      lecturerId,
      defenseDay: {
        defenseId,
      },
    },
    include: {
      defenseDay: true,
    },
    orderBy: {
      defenseDay: {
        dayDate: "asc",
      },
    },
  });
};

/**
 * Get lecturer's defense configuration
 */
export const getLecturerDefenseConfig = async (
  lecturerId: number,
  defenseId: number,
): Promise<LecturerDefenseConfig | null> => {
  return await prisma.lecturerDefenseConfig.findFirst({
    where: {
      lecturerId,
      defenseId,
    },
  });
};

/**
 * Find existing availability record
 */
export const findAvailabilityRecord = async (
  lecturerId: number,
  defenseDayId: number,
): Promise<LecturerDayAvailability | null> => {
  return await prisma.lecturerDayAvailability.findFirst({
    where: {
      lecturerId,
      defenseDayId,
    },
  });
};

/**
 * Create or update lecturer availability for a specific day
 */
export const upsertAvailability = async (
  lecturerId: number,
  defenseDayId: number,
  status: AvailabilityStatus,
): Promise<LecturerDayAvailability> => {
  // First, check if record exists
  const existing = await findAvailabilityRecord(lecturerId, defenseDayId);

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
        defenseDay: true,
      },
    });
  } else {
    // Create new record
    return await prisma.lecturerDayAvailability.create({
      data: {
        lecturerId,
        defenseDayId,
        status,
      },
      include: {
        defenseDay: true,
      },
    });
  }
};

/**
 * Batch update lecturer availability
 */
export const batchUpdateAvailability = async (
  lecturerId: number,
  updates: Array<{ defenseDayId: number; status: AvailabilityStatus }>,
): Promise<LecturerDayAvailability[]> => {
  const results: LecturerDayAvailability[] = [];

  // Use transaction to ensure atomicity
  await prisma.$transaction(async (tx) => {
    for (const update of updates) {
      // Check if record exists
      const existing = await tx.lecturerDayAvailability.findFirst({
        where: {
          lecturerId,
          defenseDayId: update.defenseDayId,
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
            defenseDay: true,
          },
        });
      } else {
        // Create new
        result = await tx.lecturerDayAvailability.create({
          data: {
            lecturerId,
            defenseDayId: update.defenseDayId,
            status: update.status,
          },
          include: {
            defenseDay: true,
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
  defenseDayId: number,
): Promise<void> => {
  const existing = await findAvailabilityRecord(lecturerId, defenseDayId);

  if (existing) {
    await prisma.lecturerDayAvailability.delete({
      where: {
        id: existing.id,
      },
    });
  }
};

/**
 * Get defense by ID with lock status (for validation)
 */
export const getDefenseById = async (defenseId: number) => {
  return await prisma.defense.findUnique({
    where: {
      id: defenseId,
    },
  });
};

/**
 * Get defense day by ID
 */
export const getDefenseDayById = async (
  defenseDayId: number,
): Promise<DefenseDay | null> => {
  return await prisma.defenseDay.findUnique({
    where: {
      id: defenseDayId,
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
/**
 * Get available lecturers for a specific defense day
 * Excludes lecturers who are busy or already assigned to a board on that day
 */
export const getAvailableLecturersForDay = async (defenseDayId: number) => {
  const defenseDay = await prisma.defenseDay.findUnique({
    where: { id: defenseDayId },
    select: { defenseId: true, dayDate: true },
  });

  if (!defenseDay) return [];

  // 1. Get IDs of lecturers assigned to any board on this day
  const assignedLecturerIds = await prisma.councilBoardMember.findMany({
    where: {
      councilBoard: {
        defenseDayId: defenseDayId,
      },
    },
    select: { lecturerId: true },
  });

  const excludedIds = assignedLecturerIds
    .map((m) => m.lecturerId)
    .filter((id): id is number => id !== null);

  // 2. Find lecturers who:
  // - Are configured for THIS defense (Lecturer_Defense_Configs.defenseId)
  // - Are NOT in excludedIds (not already assigned to a board on this day)
  // - Do NOT have a 'Busy' status for this day in lecturerDayAvailability
  return await prisma.lecturer.findMany({
    where: {
      lecturerDefenseConfigs: {
        some: { defenseId: defenseDay.defenseId },
      },
      id: {
        notIn: excludedIds,
      },
      lecturerDayAvailability: {
        none: {
          defenseDayId: defenseDayId,
          status: "Busy",
        },
      },
    },
    include: {
      lecturerQualifications: {
        include: {
          qualification: true,
        },
      },
    },
    orderBy: {
      fullName: "asc",
    },
  });
};

