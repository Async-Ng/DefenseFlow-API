import { prisma } from "../config/prisma.js";
import {
  CouncilRole,
  Prisma,
  SemesterStatus,
} from "../../generated/prisma/client.js";
import type {
  Lecturer,
  LecturerQualification,
  LecturerRoleSuitability,
  PaginatedResult,
  LecturerFilters,
  LecturerWithQualifications,
  CreateLecturerInput,
  UpdateLecturerInput,
} from "../types/index.js";

/**
 * Find lecturer by ID
 */
export const findById = async (
  id: number,
  includeQualifications: boolean = false,
): Promise<LecturerWithQualifications | Lecturer | null> => {
  const include: Prisma.LecturerInclude = {};

  if (includeQualifications) {
    include.lecturerQualifications = {
      include: {
        qualification: true,
      },
    };
  }

  return await prisma.lecturer.findUnique({
    where: { id },
    include: Object.keys(include).length > 0 ? include : undefined,
  });
};

/**
 * Find all lecturers with pagination and filters
 */
export const findAll = async (
  page: number = 1,
  limit: number = 10,
  filters: LecturerFilters = {},
): Promise<PaginatedResult<Lecturer>> => {
  const skip = (page - 1) * limit;
  const where: Prisma.LecturerWhereInput = {};

  // Apply search
  if (filters.search) {
    where.OR = [
      { lecturerCode: { contains: filters.search, mode: "insensitive" } },
      { fullName: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  // Apply filters
  if (filters.lecturerCode) {
    where.lecturerCode = {
      contains: filters.lecturerCode,
      mode: "insensitive",
    };
  }
  if (filters.fullName) {
    where.fullName = { contains: filters.fullName, mode: "insensitive" };
  }
  if (filters.email) {
    where.email = { contains: filters.email, mode: "insensitive" };
  }

  const [data, total] = await Promise.all([
    prisma.lecturer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { fullName: "asc" },
      include: {
        lecturerQualifications: {
          include: {
            qualification: true,
          },
          orderBy: {
            qualification: {
              name: "asc",
            },
          },
        },
      },
    }),
    prisma.lecturer.count({ where }),
  ]);

  return { data, total, page, limit };
};

/**
 * Find lecturer by code
 */
export const findByCode = async (
  lecturerCode: string,
): Promise<Lecturer | null> => {
  return await prisma.lecturer.findUnique({
    where: { lecturerCode },
  });
};

/**
 * Create a new lecturer
 */
export const create = async (data: CreateLecturerInput): Promise<Lecturer> => {
  return await prisma.lecturer.create({
    data,
  });
};

/**
 * Update a lecturer
 */
export const update = async (
  id: number,
  data: UpdateLecturerInput,
): Promise<Lecturer> => {
  return await prisma.lecturer.update({
    where: { id },
    data,
  });
};

/**
 * Delete a lecturer
 */
export const deleteLecturer = async (id: number): Promise<Lecturer> => {
  return await prisma.lecturer.delete({
    where: { id },
  });
};

/**
 * Upsert lecturer qualification (create or update)
 */
export const upsertLecturerQualification = async (
  lecturerId: number,
  qualificationId: number,
  score: number,
): Promise<LecturerQualification> => {
  return await prisma.lecturerQualification.upsert({
    where: {
      lecturerId_qualificationId: {
        lecturerId,
        qualificationId,
      },
    },
    update: {
      score,
    },
    create: {
      lecturerId,
      qualificationId,
      score,
    },
  });
};

/**
 * Delete lecturer qualification
 */
export const deleteLecturerQualification = async (
  lecturerId: number,
  qualificationId: number,
): Promise<LecturerQualification> => {
  return await prisma.lecturerQualification.delete({
    where: {
      lecturerId_qualificationId: {
        lecturerId,
        qualificationId,
      },
    },
  });
};

/**
 * Find all qualifications for a lecturer
 */
export const findLecturerQualifications = async (
  lecturerId: number,
): Promise<LecturerQualification[]> => {
  return await prisma.lecturerQualification.findMany({
    where: { lecturerId },
    include: {
      qualification: true,
    },
    orderBy: {
      qualification: {
        name: "asc",
      },
    },
  });
};

/**
 * Find all topics supervised by a lecturer
 */
export const findSupervisedTopics = async (
  lecturerId: number,
  filters: { semesterId?: number } = {},
): Promise<any[]> => {
  const where: Prisma.TopicWhereInput = {
    topicSupervisors: {
      some: { lecturerId },
    },
  };

  if (filters.semesterId) {
    where.semesterId = filters.semesterId;
  }

  return await prisma.topic.findMany({
    where,
    include: {
      semester: {
        select: { name: true },
      },
      topicType: {
        select: { name: true },
      },
      topicDefenses: {
        orderBy: {
          id: "desc",
        },
        include: {
          defense: {
            select: {
              id: true,
              defenseCode: true,
              name: true,
              type: true,
              status: true,
            },
          },
          defenseCouncils: {
            orderBy: {
              startTime: "asc",
            },
            include: {
              councilBoard: {
                include: {
                  defenseDay: {
                    select: {
                      dayDate: true,
                      defense: {
                        select: {
                          name: true,
                          defenseCode: true,
                        },
                      },
                    },
                  },
                  councilBoardMembers: {
                    include: {
                      lecturer: {
                        select: {
                          id: true,
                          fullName: true,
                          lecturerCode: true,
                        },
                      },
                    },
                    orderBy: {
                      id: "asc",
                    },
                  },
                },
              },
            },
          },
        },
      },
      topicSupervisors: {
        include: {
          lecturer: {
            select: {
              fullName: true,
              lecturerCode: true,
            },
          },
        },
      },
    },
    orderBy: { topicCode: "asc" },
  });
};

/**
 * Get dashboard stats for a lecturer — redesigned for at-a-glance actionability
 */
export const getLecturerDashboardStats = async (
  lecturerId: number,
): Promise<any> => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // ── 1. Current active semester ───────────────────────────────────────────
  const currentSemester = await prisma.semester.findFirst({
    where: { status: SemesterStatus.Ongoing },
    select: { id: true, name: true, semesterCode: true },
    orderBy: { id: "desc" },
  });

  // ── 2. Today's councils ──────────────────────────────────────────────────
  const todayCouncilMembers = await prisma.councilBoardMember.findMany({
    where: {
      lecturerId,
      councilBoard: {
        defenseDay: { dayDate: { gte: todayStart, lte: todayEnd } },
      },
    },
    include: {
      councilBoard: {
        include: {
          defenseDay: {
            include: { defense: { select: { name: true, defenseCode: true } } },
          },
          defenseCouncils: {
            orderBy: { startTime: "asc" },
            include: {
              topicDefense: {
                include: {
                  topic: { select: { topicCode: true, title: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const todayCouncils = todayCouncilMembers.map((m) => ({
    boardCode: m.councilBoard!.boardCode,
    name: m.councilBoard!.name,
    role: m.role,
    defenseName: m.councilBoard!.defenseDay?.defense?.name ?? null,
    dayDate: m.councilBoard!.defenseDay?.dayDate ?? null,
    slots: m.councilBoard!.defenseCouncils.map((dc) => ({
      startTime: dc.startTime,
      endTime: dc.endTime,
      topicCode: dc.topicDefense?.topic?.topicCode ?? null,
      topicTitle: dc.topicDefense?.topic?.title ?? null,
    })),
  }));

  // ── 3. Upcoming councils (from tomorrow, next 5) ─────────────────────────
  const upcomingMembers = await prisma.councilBoardMember.findMany({
    where: {
      lecturerId,
      councilBoard: {
        defenseDay: { dayDate: { gte: tomorrow } },
      },
    },
    include: {
      councilBoard: {
        include: {
          defenseDay: {
            include: { defense: { select: { name: true, defenseCode: true } } },
          },
          defenseCouncils: {
            orderBy: { startTime: "asc" },
            include: {
              topicDefense: {
                include: {
                  topic: { select: { topicCode: true, title: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { councilBoard: { defenseDay: { dayDate: "asc" } } },
    take: 5,
  });

  const upcomingCouncils = upcomingMembers.map((m) => ({
    boardCode: m.councilBoard!.boardCode,
    name: m.councilBoard!.name,
    role: m.role,
    defenseName: m.councilBoard!.defenseDay?.defense?.name ?? null,
    dayDate: m.councilBoard!.defenseDay?.dayDate ?? null,
    slots: m.councilBoard!.defenseCouncils.map((dc) => ({
      startTime: dc.startTime,
      endTime: dc.endTime,
      topicCode: dc.topicDefense?.topic?.topicCode ?? null,
      topicTitle: dc.topicDefense?.topic?.title ?? null,
    })),
  }));

  // ── 4. Pending availability registrations ────────────────────────────────
  // Defenses where lecturer is configured, availability is open, but has unregistered days
  const configuredDefenses = await prisma.lecturerDefenseConfig.findMany({
    where: { lecturerId },
    select: { defenseId: true },
  });
  const configuredDefenseIds = configuredDefenses
    .map((c) => c.defenseId)
    .filter((id): id is number => id !== null);

  const openDefenses = await prisma.defense.findMany({
    where: {
      id: { in: configuredDefenseIds },
      isAvailabilityPublished: true,
      availabilityEndDate: { gte: now },
    },
    include: {
      defenseDays: {
        select: {
          id: true,
          dayDate: true,
          lecturerDayAvailability: {
            where: { lecturerId },
            select: { id: true },
          },
        },
        orderBy: { dayDate: "asc" },
      },
    },
  });

  const pendingAvailability = openDefenses
    .map((defense) => {
      const unregisteredDays = defense.defenseDays.filter(
        (day) => day.lecturerDayAvailability.length === 0,
      );
      if (unregisteredDays.length === 0) return null;

      const endDate = defense.availabilityEndDate
        ? new Date(defense.availabilityEndDate)
        : null;
      const daysLeft = endDate
        ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        defenseId: defense.id,
        defenseCode: defense.defenseCode,
        defenseName: defense.name,
        availabilityEndDate: defense.availabilityEndDate,
        daysLeft,
        unregisteredDays: unregisteredDays.map((d) => ({
          defenseDayId: d.id,
          dayDate: d.dayDate,
        })),
      };
    })
    .filter(Boolean);

  // ── 5. Stats (scoped to current semester) ───────────────────────────────
  const semesterFilter = currentSemester
    ? { semesterId: currentSemester.id }
    : {};

  const [
    totalSupervisedThisSemester,
    totalBoardsThisSemester,
    topicResultGroups,
  ] = await Promise.all([
    prisma.topicSupervisor.count({
      where: { lecturerId, topic: semesterFilter },
    }),
    prisma.councilBoardMember.count({
      where: {
        lecturerId,
        councilBoard: currentSemester ? { semesterId: currentSemester.id } : {},
      },
    }),
    prisma.topicDefense.groupBy({
      by: ["finalResult"],
      where: {
        topic: {
          topicSupervisors: { some: { lecturerId } },
          ...semesterFilter,
        },
      },
      _count: { id: true },
    }),
  ]);

  const topicResultSummary: Record<string, number> = {
    pending: 0,
    passed: 0,
    failed: 0,
  };
  topicResultGroups.forEach((g) => {
    const key = (g.finalResult ?? "pending").toLowerCase();
    if (key in topicResultSummary) topicResultSummary[key] = g._count.id;
  });

  // ── 6. Recent supervised topics (current semester, latest 5) ────────────
  const recentSupervisedTopics = await prisma.topic.findMany({
    where: {
      topicSupervisors: { some: { lecturerId } },
      ...semesterFilter,
    },
    include: {
      topicType: { select: { name: true } },
      topicDefenses: {
        select: { finalResult: true, defenseId: true },
        orderBy: { id: "desc" },
        take: 1,
      },
    },
    orderBy: { id: "desc" },
    take: 5,
  });

  return {
    currentSemester,
    todayCouncils,
    upcomingCouncils,
    pendingAvailability,
    stats: {
      totalSupervisedTopicsThisSemester: totalSupervisedThisSemester,
      totalCouncilBoardsThisSemester: totalBoardsThisSemester,
      topicResultSummary,
    },
    recentSupervisedTopics: recentSupervisedTopics.map((t) => ({
      id: t.id,
      topicCode: t.topicCode,
      title: t.title,
      topicType: t.topicType?.name ?? null,
      latestDefenseResult: t.topicDefenses[0]?.finalResult ?? null,
    })),
  };
};

/**
 * Find detailed defense schedule for a lecturer
 */
export const findPersonalSchedule = async (
  lecturerId: number,
  filters: { semesterId?: number } = {},
): Promise<any[]> => {
  const where: Prisma.CouncilBoardMemberWhereInput = {
    lecturerId,
  };

  if (filters.semesterId) {
    where.councilBoard = {
      semesterId: filters.semesterId,
    };
  }

  return await prisma.councilBoardMember.findMany({
    where,
    include: {
      councilBoard: {
        include: {
          defenseDay: {
            include: {
              defense: {
                select: {
                  name: true,
                  defenseCode: true,
                },
              },
            },
          },
          semester: {
            select: {
              name: true,
              semesterCode: true,
            },
          },
          councilBoardMembers: {
            include: {
              lecturer: {
                select: {
                  id: true,
                  fullName: true,
                  lecturerCode: true,
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
                          lecturer: {
                            select: {
                              fullName: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            orderBy: {
              startTime: "asc",
            },
          },
        },
      },
    },
    orderBy: {
      councilBoard: {
        defenseDay: {
          dayDate: "asc",
        },
      },
    },
  });
};

/**
 * Check if qualification exists
 */
export const qualificationExists = async (
  qualificationId: number,
): Promise<boolean> => {
  const count = await prisma.qualification.count({
    where: { id: qualificationId },
  });
  return count > 0;
};

/**
 * Upsert a lecturer's suitability score for a specific council role
 */
export const upsertLecturerRoleSuitability = async (
  lecturerId: number,
  role: CouncilRole,
  suitability: number,
): Promise<LecturerRoleSuitability> => {
  return await prisma.lecturerRoleSuitability.upsert({
    where: { lecturerId_role: { lecturerId, role } },
    update: { suitability },
    create: { lecturerId, role, suitability },
  });
};

/**
 * Get all role suitability scores for a lecturer
 */
export const getLecturerRoleSuitabilities = async (
  lecturerId: number,
): Promise<LecturerRoleSuitability[]> => {
  return await prisma.lecturerRoleSuitability.findMany({
    where: { lecturerId },
    orderBy: { role: "asc" },
  });
};

/**
 * Get role suitability scores for multiple lecturers (batch)
 */
export const getManyLecturerRoleSuitabilities = async (
  lecturerIds: number[],
): Promise<LecturerRoleSuitability[]> => {
  return await prisma.lecturerRoleSuitability.findMany({
    where: { lecturerId: { in: lecturerIds } },
  });
};
