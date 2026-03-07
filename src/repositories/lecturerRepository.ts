import { prisma } from "../config/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import type {
  Lecturer,
  LecturerQualification,
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
    where.lecturerCode = { contains: filters.lecturerCode, mode: "insensitive" };
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
export const findByCode = async (lecturerCode: string): Promise<Lecturer | null> => {
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
export const update = async (id: number, data: UpdateLecturerInput): Promise<Lecturer> => {
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
 * Get dashboard stats for a lecturer
 */
export const getLecturerDashboardStats = async (lecturerId: number): Promise<any> => {
  const [totalTopics, totalBoards, upcomingCouncils, supervisedTopics] = await Promise.all([
    prisma.topicSupervisor.count({ where: { lecturerId } }),
    prisma.councilBoardMember.count({ where: { lecturerId } }),
    prisma.councilBoard.findMany({
      where: {
        councilBoardMembers: { some: { lecturerId } },
        defenseDay: { dayDate: { gte: new Date() } },
      },
      include: {
        defenseDay: {
          include: {
            defense: { select: { name: true } },
          },
        },
        councilBoardMembers: {
          include: { lecturer: true },
        },
      },
      take: 5,
      orderBy: { defenseDay: { dayDate: "asc" } },
    }),
    prisma.topic.findMany({
      where: {
        topicSupervisors: { some: { lecturerId } },
      },
      include: {
        semester: { select: { name: true } },
        topicType: { select: { name: true } },
      },
      take: 5,
      orderBy: { id: "desc" },
    }),
  ]);

  return {
    totalSupervisedTopics: totalTopics,
    totalCouncilBoards: totalBoards,
    upcomingCouncils,
    supervisedTopics,
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
export const qualificationExists = async (qualificationId: number): Promise<boolean> => {
  const count = await prisma.qualification.count({
    where: { id: qualificationId },
  });
  return count > 0;
};
