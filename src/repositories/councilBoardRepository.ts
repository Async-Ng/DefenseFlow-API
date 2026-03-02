import { prisma } from "../config/prisma.js";
import { Prisma, CouncilBoard } from "../../generated/prisma/client.js";
import { CouncilBoardFilters, CouncilBoardSort } from "../types/index.js";

/**
 * Create a new council board with members
 */
export const createCouncilBoard = async (
  data: Prisma.CouncilBoardCreateInput,
): Promise<CouncilBoard> => {
  return await prisma.councilBoard.create({
    data,
    include: {
      councilBoardMembers: {
        include: {
          lecturer: true,
        },
      },
    },
  });
};

/**
 * Create multiple defense councils
 */
export const createDefenseCouncils = async (
  data: Prisma.DefenseCouncilCreateManyInput[],
): Promise<Prisma.BatchPayload> => {
  return await prisma.defenseCouncil.createMany({
    data,
  });
};

/**
 * Delete all council boards and related data for a specific defense
 * This is used to clear a previous draft schedule
 */
export const deleteCouncilBoardsByDefense = async (
  defenseId: number,
): Promise<void> => {
  // Find all defense days for this defense
  const defenseDays = await prisma.defenseDay.findMany({
    where: { defenseId },
    select: { id: true },
  });

  const defenseDayIds = defenseDays.map((day) => day.id);

  if (defenseDayIds.length === 0) return;

  // Find all council boards for these defense days
  const councilBoards = await prisma.councilBoard.findMany({
    where: {
      defenseDayId: {
        in: defenseDayIds,
      },
    },
    select: { id: true },
  });

  const councilBoardIds = councilBoards.map((c) => c.id);

  if (councilBoardIds.length === 0) return;

  // Delete DefenseCouncils first (foreign key constraint)
  await prisma.defenseCouncil.deleteMany({
    where: {
      councilBoardId: {
        in: councilBoardIds,
      },
    },
  });

  // Delete CouncilBoardMembers
  await prisma.councilBoardMember.deleteMany({
    where: {
      councilBoardId: {
        in: councilBoardIds,
      },
    },
  });

  // Delete CouncilBoards
  await prisma.councilBoard.deleteMany({
    where: {
      id: {
        in: councilBoardIds,
      },
    },
  });
};

/**
 * Find council boards by defense ID
 */
export const findCouncilBoardsByDefense = async (
  defenseId: number,
): Promise<CouncilBoard[]> => {
  const defenseDays = await prisma.defenseDay.findMany({
    where: { defenseId },
    select: { id: true },
  });

  const defenseDayIds = defenseDays.map((day) => day.id);

  if (defenseDayIds.length === 0) return [];

  return await prisma.councilBoard.findMany({
    where: {
      defenseDayId: {
        in: defenseDayIds,
      },
    },
    include: {
      councilBoardMembers: {
        include: {
          lecturer: {
            include: {
              lecturerQualifications: {
                include: {
                  qualification: true,
                },
              },
            },
          },
        },
      },
      defenseCouncils: {
        orderBy: { startTime: "asc" },
        include: {
          topicDefense: {
            include: {
              topic: {
                include: {
                  topicSupervisors: {
                    include: {
                      lecturer: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: [
      { defenseDayId: "asc" },
      { id: "asc" },
    ],
  });
};

/**
 * Find all council boards with filters, pagination, and sorting
 */
export const findAll = async (
  filters: CouncilBoardFilters = {},
  page: number = 1,
  limit: number = 10,
  sort?: CouncilBoardSort,
): Promise<{ data: any[]; total: number }> => {
  const skip = (page - 1) * limit;
  const where: Prisma.CouncilBoardWhereInput = {};

  // Apply search
  if (filters.search) {
    where.OR = [
      { boardCode: { contains: filters.search, mode: "insensitive" } },
      { name: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.defenseDayId) {
    where.defenseDayId = filters.defenseDayId;
  }

  if (filters.semesterId) {
    where.semesterId = filters.semesterId;
  }

  if (filters.defenseId) {
    where.defenseDay = {
      defenseId: filters.defenseId,
    };
  }

  if (filters.boardCode) {
    where.boardCode = { contains: filters.boardCode, mode: "insensitive" };
  }

  if (filters.name) {
    where.name = { contains: filters.name, mode: "insensitive" };
  }

  let orderBy: Prisma.CouncilBoardOrderByWithRelationInput = { id: "asc" };
  
  if (sort) {
    if (sort.field === "dayDate") {
      orderBy = {
        defenseDay: {
          dayDate: sort.order,
        },
      };
    } else {
      orderBy = { [sort.field]: sort.order };
    }
  }

  const [data, total] = await Promise.all([
    prisma.councilBoard.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        councilBoardMembers: {
          include: {
            lecturer: {
              include: {
                lecturerQualifications: {
                  include: {
                    qualification: true,
                  },
                },
              },
            },
          },
        },
        defenseCouncils: {
          orderBy: { startTime: "asc" },
          include: {
            topicDefense: {
              include: {
                topic: {
                  include: {
                    topicSupervisors: {
                      include: {
                        lecturer: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.councilBoard.count({ where }),
  ]);

  return { data, total };
};

/**
 * Find a council board by ID with all related data
 */
export const findById = async (id: number): Promise<CouncilBoard | null> => {
  return await prisma.councilBoard.findUnique({
    where: { id },
    include: {
      defenseDay: {
        include: {
          defense: true,
        },
      },
      semester: true,
      councilBoardMembers: {
        include: {
          lecturer: {
            include: {
              lecturerQualifications: {
                include: {
                  qualification: true,
                },
              },
            },
          },
        },
      },
      defenseCouncils: {
        orderBy: { startTime: "asc" },
        include: {
          topicDefense: {
            include: {
              topic: {
                include: {
                  topicSupervisors: {
                    include: {
                      lecturer: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
};

