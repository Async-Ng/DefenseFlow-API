import { prisma } from "../config/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import type {
  Semester,
  CreateSemesterInput,
  UpdateSemesterInput,
  PaginatedResult,
  SemesterFilters,
  IncludeOptions,
} from "../types/index.js";

/**
 * Create a new semester
 */
export const create = async (data: CreateSemesterInput): Promise<Semester> => {
  return await prisma.semester.create({
    data: {
      semesterCode: data.semesterCode,
      name: data.name,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
  });
};

/**
 * Find all semesters with pagination and filters
 */
export const findAll = async (
  page: number = 1,
  limit: number = 10,
  filters: SemesterFilters = {},
): Promise<PaginatedResult<Semester>> => {
  const skip = (page - 1) * limit;
  const where: Prisma.SemesterWhereInput = {};

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
      orderBy: { startDate: "desc" },
    }),
    prisma.semester.count({ where }),
  ]);

  return { data, total, page, limit };
};

/**
 * Find semester by ID
 */
export const findById = async (
  id: number,
  include: IncludeOptions = {},
): Promise<Semester | null> => {
  const includeOptions: Prisma.SemesterInclude = {};

  if (include.defenses) {
    includeOptions.defenses = include.defenseDays
      ? { include: { defenseDays: true } }
      : true;
  }
  if (include.topics) {
    includeOptions.topics = true;
  }
  if (include.councilBoards) {
    includeOptions.councilBoards = true;
  }

  return await prisma.semester.findUnique({
    where: { id },
    include:
      Object.keys(includeOptions).length > 0 ? includeOptions : undefined,
  });
};

/**
 * Find semester by code
 */
export const findByCode = async (
  semesterCode: string,
): Promise<Semester | null> => {
  return await prisma.semester.findUnique({
    where: { semesterCode },
  });
};

/**
 * Update semester
 */
export const update = async (
  id: number,
  data: UpdateSemesterInput,
): Promise<Semester> => {
  const updateData: Prisma.SemesterUpdateInput = {};

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
    where: { id },
    data: updateData,
  });
};

/**
 * Delete semester (simple — no related data)
 */
export const deleteSemester = async (id: number): Promise<Semester> => {
  return await prisma.semester.delete({
    where: { id },
  });
};

/**
 * Delete semester and ALL related data in a single transaction.
 * Deletion order respects FK constraints (leaf → root):
 *   DefenseCouncil → CouncilBoardMember → CouncilBoard →
 *   LecturerDayAvailability → TopicDefense → LecturerDefenseConfig →
 *   DefenseDay → Defense → TopicSupervisor → TopicQualification →
 *   Topic → Semester
 */
export const deleteSemesterCascade = async (id: number): Promise<Semester> => {
  return await prisma.$transaction(async (tx) => {
    // 1. Collect IDs of records that belong to this semester

    // Defenses belonging to this semester
    const defenses = await tx.defense.findMany({
      where: { semesterId: id },
      select: { id: true },
    });
    const defenseIds = defenses.map((d) => d.id);

    // DefenseDays belonging to those defenses
    const defenseDays = await tx.defenseDay.findMany({
      where: { defenseId: { in: defenseIds } },
      select: { id: true },
    });
    const defenseDayIds = defenseDays.map((d) => d.id);

    // CouncilBoards belonging to this semester (includes both via DefenseDay and direct semesterId)
    const councilBoards = await tx.councilBoard.findMany({
      where: { semesterId: id },
      select: { id: true },
    });
    const councilBoardIds = councilBoards.map((cb) => cb.id);

    // TopicDefenses belonging to defenses of this semester
    const topicDefenses = await tx.topicDefense.findMany({
      where: { defenseId: { in: defenseIds } },
      select: { id: true },
    });
    const topicDefenseIds = topicDefenses.map((td) => td.id);

    // Topics belonging to this semester
    const topics = await tx.topic.findMany({
      where: { semesterId: id },
      select: { id: true },
    });
    const topicIds = topics.map((t) => t.id);

    // 2. Delete in correct order

    // DefenseCouncil — FK → CouncilBoard, TopicDefense
    await tx.defenseCouncil.deleteMany({
      where: {
        OR: [
          { councilBoardId: { in: councilBoardIds } },
          { registrationId: { in: topicDefenseIds } },
        ],
      },
    });

    // CouncilBoardMember — FK → CouncilBoard
    await tx.councilBoardMember.deleteMany({
      where: { councilBoardId: { in: councilBoardIds } },
    });

    // CouncilBoard — FK → DefenseDay, Semester
    await tx.councilBoard.deleteMany({
      where: { semesterId: id },
    });

    // LecturerDayAvailability — FK → DefenseDay
    await tx.lecturerDayAvailability.deleteMany({
      where: { defenseDayId: { in: defenseDayIds } },
    });

    // TopicDefense — FK → Topic, Defense
    await tx.topicDefense.deleteMany({
      where: { defenseId: { in: defenseIds } },
    });

    // LecturerDefenseConfig — FK → Defense
    await tx.lecturerDefenseConfig.deleteMany({
      where: { defenseId: { in: defenseIds } },
    });

    // DefenseDay — FK → Defense
    await tx.defenseDay.deleteMany({
      where: { defenseId: { in: defenseIds } },
    });

    // Defense — FK → Semester
    await tx.defense.deleteMany({
      where: { semesterId: id },
    });

    // TopicSupervisor — FK → Topic
    await tx.topicSupervisor.deleteMany({
      where: { topicId: { in: topicIds } },
    });

    // TopicQualification — FK → Topic
    await tx.topicQualification.deleteMany({
      where: { topicId: { in: topicIds } },
    });

    // Topic — FK → Semester
    await tx.topic.deleteMany({
      where: { semesterId: id },
    });

    // Finally — delete the Semester itself
    return await tx.semester.delete({
      where: { id },
    });
  });
};

/**
 * Check if semester has active defenses
 */
export const hasActiveDefenses = async (
  semesterId: number,
): Promise<boolean> => {
  const count = await prisma.defense.count({
    where: { semesterId },
  });
  return count > 0;
};

/**
 * Get defenses for date conflict checking
 */
export const getDefensesWithDays = async (
  semesterId: number,
): Promise<any[]> => {
  return await prisma.defense.findMany({
    where: { semesterId },
    include: { defenseDays: true },
  });
};
