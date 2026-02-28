import { prisma } from "../config/prisma.js";
import { DashboardStats } from "../types/index.js";

/**
 * Get overall dashboard statistics
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const [
    totalSemesters,
    totalLecturers,
    totalTopics,
    totalDefenses,
    totalCouncilBoards,
    topicsByResult,
    upcomingDefenses,
  ] = await Promise.all([
    prisma.semester.count(),
    prisma.lecturer.count(),
    prisma.topic.count(),
    prisma.defense.count(),
    prisma.councilBoard.count(),
    prisma.topicDefense.groupBy({
      by: ["finalResult"],
      _count: {
        id: true,
      },
    }),
    prisma.defense.findMany({
      where: {
        availabilityStartDate: {
          gte: new Date(),
        },
      },
      take: 5,
      orderBy: {
        availabilityStartDate: "asc",
      },
      include: {
        semester: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  // Map topics by result
  const resultCounts = {
    pending: 0,
    passed: 0,
    failed: 0,
  };

  topicsByResult.forEach((group) => {
    const result = group.finalResult.toLowerCase();
    if (result === "pending") resultCounts.pending = group._count.id;
    if (result === "passed") resultCounts.passed = group._count.id;
    if (result === "failed") resultCounts.failed = group._count.id;
  });

  return {
    totalSemesters,
    totalLecturers,
    totalTopics,
    totalDefenses,
    totalCouncilBoards,
    topicsByResult: resultCounts,
    upcomingDefenses: upcomingDefenses as any,
  };
};
