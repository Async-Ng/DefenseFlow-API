import { prisma } from "../config/prisma.js";
import { Prisma, CouncilBoard } from "../../generated/prisma/client.js";

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
