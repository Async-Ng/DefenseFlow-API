import { prisma } from "../config/prisma.js";
import { Prisma, Council } from "../../generated/prisma/client.js";

/**
 * Create a new council with members
 */
export const createCouncil = async (
  data: Prisma.CouncilCreateInput,
): Promise<Council> => {
  return await prisma.council.create({
    data,
    include: {
      councilMembers: {
        include: {
          lecturer: true,
        },
      },
    },
  });
};

/**
 * Create multiple defense matches
 */
export const createDefenseMatches = async (
  data: Prisma.DefenseMatchCreateManyInput[],
): Promise<Prisma.BatchPayload> => {
  return await prisma.defenseMatch.createMany({
    data,
  });
};

/**
 * Delete all councils and related data for a specific session
 * This is used to clear a previous draft schedule
 */
export const deleteCouncilsBySession = async (
  sessionId: number,
): Promise<void> => {
  // Find all session days for this session
  const sessionDays = await prisma.sessionDay.findMany({
    where: { sessionId },
    select: { id: true },
  });

  const sessionDayIds = sessionDays.map((day) => day.id);

  if (sessionDayIds.length === 0) return;

  // Find all councils for these session days
  const councils = await prisma.council.findMany({
    where: {
      sessionDayId: {
        in: sessionDayIds,
      },
    },
    select: { id: true },
  });

  const councilIds = councils.map((c) => c.id);

  if (councilIds.length === 0) return;

  // Delete DefenseMatches first (foreign key constraint)
  await prisma.defenseMatch.deleteMany({
    where: {
      councilId: {
        in: councilIds,
      },
    },
  });

  // Delete CouncilMembers
  await prisma.councilMember.deleteMany({
    where: {
      councilId: {
        in: councilIds,
      },
    },
  });

  // Delete Councils
  await prisma.council.deleteMany({
    where: {
      id: {
        in: councilIds,
      },
    },
  });
};

/**
 * Find councils by session ID
 */
export const findCouncilsBySession = async (
  sessionId: number,
): Promise<Council[]> => {
  const sessionDays = await prisma.sessionDay.findMany({
    where: { sessionId },
    select: { id: true },
  });

  const sessionDayIds = sessionDays.map((day) => day.id);

  if (sessionDayIds.length === 0) return [];

  return await prisma.council.findMany({
    where: {
      sessionDayId: {
        in: sessionDayIds,
      },
    },
    include: {
      councilMembers: {
        include: {
          lecturer: true,
        },
      },
      defenseMatches: {
        include: {
          registration: {
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
      { sessionDayId: "asc" },
      { id: "asc" },
    ],
  });
};
