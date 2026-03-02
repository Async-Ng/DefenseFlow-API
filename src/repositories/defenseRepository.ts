import { prisma } from "../config/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import type {
  Defense,
  CreateDefenseInput,
  CreateDefenseDayInput,
  UpdateDefenseInput,
  PaginatedResult,
  DefenseFilters,
  IncludeOptions,
  DefenseDependencies,
} from "../types/index.js";

/**
 * Convert time string (HH:MM:SS) to DateTime for Prisma Time fields
 */
// Helper removed as workStartTime is now string


/**
 * Create a new defense
 */
export const create = async (data: CreateDefenseInput): Promise<Defense> => {
  return await prisma.defense.create({
    data: {
      defenseCode: data.defenseCode,
      semesterId: data.semesterId,
      name: data.name,
      type: data.type || "Main",
      timePerTopic: data.timePerTopic,
      maxCouncilsPerDay: data.maxCouncilsPerDay,
      workStartTime: data.workStartTime,
      availabilityStartDate: data.availabilityStartDate ? new Date(data.availabilityStartDate) : null,
      availabilityEndDate: data.availabilityEndDate ? new Date(data.availabilityEndDate) : null,
    },
  });
};

/**
 * Create defense with defense days in a transaction
 */
export const createWithDays = async (
  defenseData: CreateDefenseInput,
  defenseDays: CreateDefenseDayInput[],
): Promise<any> => {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Create defense
    const defense = await tx.defense.create({
      data: {
        defenseCode: defenseData.defenseCode,
        semesterId: defenseData.semesterId,
        name: defenseData.name,
        type: defenseData.type || "Main",
        timePerTopic: defenseData.timePerTopic,
        maxCouncilsPerDay: defenseData.maxCouncilsPerDay,
        workStartTime: defenseData.workStartTime,
        availabilityStartDate: defenseData.availabilityStartDate ? new Date(defenseData.availabilityStartDate) : null,
        availabilityEndDate: defenseData.availabilityEndDate ? new Date(defenseData.availabilityEndDate) : null,
      },
    });

    // Create defense days
    if (defenseDays && defenseDays.length > 0) {
      await tx.defenseDay.createMany({
        data: defenseDays.map((day) => ({
          defenseDayCode: day.defenseDayCode,
          defenseId: defense.id,
          dayDate: new Date(day.dayDate),
          note: day.note || null,
        })),
      });
    }

    // Return defense with days
    return await tx.defense.findUnique({
      where: { id: defense.id },
      include: { defenseDays: true },
    });
  });
};

/**
 * Find all defenses with pagination and filters
 */
export const findAll = async (
  page: number = 1,
  limit: number = 10,
  filters: DefenseFilters = {},
  _include: IncludeOptions = {},
): Promise<PaginatedResult<any>> => {
  const skip = (page - 1) * limit;
  const where: Prisma.DefenseWhereInput = {};

  // Apply search
  if (filters.search) {
    where.OR = [
      { defenseCode: { contains: filters.search, mode: "insensitive" } },
      { name: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  // Apply filters
  if (filters.defenseCode) {
    where.defenseCode = { contains: filters.defenseCode };
  }
  if (filters.semesterId) {
    where.semesterId = filters.semesterId;
  }
  if (filters.type) {
    where.type = filters.type;
  }
  if (filters.maxCouncilsPerDay) {
    where.maxCouncilsPerDay = filters.maxCouncilsPerDay;
  }

  // Build include options
  const includeOptions: Prisma.DefenseInclude = {
    semester: true,
    defenseDays: {
      orderBy: { dayDate: "asc" },
    },
  };


  const [data, total] = await Promise.all([
    prisma.defense.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { semesterId: "desc" },
        { id: "desc" },
      ],
      include: includeOptions,
    }),
    prisma.defense.count({ where }),
  ]);

  return { data, total, page, limit };
};

/**
 * Find defense by ID
 */
export const findById = async (
  id: number,
  include: IncludeOptions = {},
): Promise<any | null> => {
  const includeOptions: Prisma.DefenseInclude = {
    semester: true,
  };

  if (include.defenseDays) {
    includeOptions.defenseDays = true;
  }
  if (include.councilBoards) {
    includeOptions.defenseDays = {
      include: { councilBoards: true },
    };
  }

  return await prisma.defense.findUnique({
    where: { id },
    include: includeOptions,
  });
};

/**
 * Find defense by code
 */
export const findByCode = async (defenseCode: string): Promise<any | null> => {
  return await prisma.defense.findUnique({
    where: { defenseCode },
    include: { semester: true },
  });
};

/**
 * Find "Main" defense for a specific semester
 */
export const findMainBySemesterId = async (
  semesterId: number,
): Promise<any | null> => {
  return await prisma.defense.findFirst({
    where: {
      semesterId,
      type: "Main",
    },
  });
};

/**
 * Update defense
 */
export const update = async (
  id: number,
  data: UpdateDefenseInput,
): Promise<Defense> => {
  const updateData: Prisma.DefenseUpdateInput = {};

  if (data.defenseCode !== undefined) updateData.defenseCode = data.defenseCode;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.timePerTopic !== undefined)
    updateData.timePerTopic = data.timePerTopic;
  if (data.maxCouncilsPerDay !== undefined)
    updateData.maxCouncilsPerDay = data.maxCouncilsPerDay;
  if (data.workStartTime !== undefined)
    updateData.workStartTime = data.workStartTime;
  if (data.availabilityStartDate !== undefined)
    updateData.availabilityStartDate = data.availabilityStartDate ? new Date(data.availabilityStartDate) : null;
  if (data.availabilityEndDate !== undefined)
    updateData.availabilityEndDate = data.availabilityEndDate ? new Date(data.availabilityEndDate) : null;

  if (data.defenseDays) {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update defense details
      const defense = await tx.defense.update({
        where: { id },
        data: updateData,
      });

      // Handle defense days sync
      const existingDays = await tx.defenseDay.findMany({
        where: { defenseId: id },
      });
      const inputCodes = data.defenseDays!.map((d) => d.defenseDayCode);

      // 1. Delete days not in input
      const toDelete = existingDays.filter(
        (d) => !inputCodes.includes(d.defenseDayCode),
      );
      for (const day of toDelete) {
        await tx.defenseDay.delete({ where: { id: day.id } });
      }

      // 2. Create or Update days
      for (const dayInput of data.defenseDays!) {
        const existingDay = existingDays.find(
          (d) => d.defenseDayCode === dayInput.defenseDayCode,
        );

        if (existingDay) {
          // Update
          await tx.defenseDay.update({
            where: { id: existingDay.id },
            data: {
              dayDate: new Date(dayInput.dayDate),
              note: dayInput.note || null,
            },
          });
        } else {
          // Create
          await tx.defenseDay.create({
            data: {
              defenseDayCode: dayInput.defenseDayCode,
              defenseId: id,
              dayDate: new Date(dayInput.dayDate),
              note: dayInput.note || null,
            },
          });
        }
      }

      return defense;
    });
  }

  return await prisma.defense.update({
    where: { id },
    data: updateData,
  });
};

/**
 * Delete defense
 */
export const deleteDefense = async (id: number): Promise<Defense> => {
  // Delete in transaction to handle defense days
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Delete defense days first
    await tx.defenseDay.deleteMany({
      where: { defenseId: id },
    });

    // Delete defense
    return await tx.defense.delete({
      where: { id },
    });
  });
};

/**
 * Check if defense has dependencies (councilBoards, registrations, etc.)
 */
export const checkDependencies = async (
  defenseId: number,
): Promise<DefenseDependencies> => {
  const [councilCount, registrationCount] = await Promise.all([
    prisma.councilBoard.count({
      where: {
        defenseDay: {
          defenseId,
        },
      },
    }),
    prisma.topicDefense.count({
      where: { defenseId },
    }),
  ]);

  return {
    hasCouncilBoards: councilCount > 0,
    hasRegistrations: registrationCount > 0,
  };
};
