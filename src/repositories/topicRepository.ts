import { prisma } from "../config/prisma.js";
import {
  DefenseResult,
  TopicDefense,
  Topic,
  Prisma,
} from "../../generated/prisma/client.js";
import {
  PaginatedResult,
  TopicFilters,
  UpdateTopicInput,
  CreateTopicInput,
} from "../types/index.js";

/**
 * Find all topics with pagination and filters
 */
export const findAll = async (
  page: number = 1,
  limit: number = 10,
  filters: TopicFilters = {},
): Promise<PaginatedResult<Topic>> => {
  const skip = (page - 1) * limit;
  const where: Prisma.TopicWhereInput = {};

  // Apply search
  if (filters.search) {
    where.OR = [
      { topicCode: { contains: filters.search, mode: "insensitive" } },
      { title: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  // Apply filters
  if (filters.topicCode) {
    where.topicCode = { contains: filters.topicCode };
  }
  if (filters.groupCode) {
    where.groupCode = { contains: filters.groupCode, mode: "insensitive" };
  }
  if (filters.title) {
    where.title = { contains: filters.title, mode: "insensitive" };
  }
  if (filters.semesterId) {
    where.semesterId = filters.semesterId;
  }
  if (filters.supervisorIds && filters.supervisorIds.length > 0) {
    where.topicSupervisors = {
      some: {
        lecturerId: { in: filters.supervisorIds },
      },
    };
  }

  const [data, total] = await Promise.all([
    prisma.topic.findMany({
      where,
      skip,
      take: limit,
      orderBy: { topicCode: "asc" },
      include: {
        semester: true,
        topicSupervisors: {
          include: {
            lecturer: true,
          },
          orderBy: {
            lecturer: {
              fullName: "asc",
            },
          },
        },
      },
    }),
    prisma.topic.count({ where }),
  ]);

  return { data, total, page, limit };
};

/**
 * Create a new topic
 */
export const create = async (data: CreateTopicInput): Promise<Topic> => {
  const { supervisorIds, ...topicData } = data;
  return await prisma.topic.create({
    data: {
      ...topicData,
      topicSupervisors: supervisorIds?.length
        ? { createMany: { data: supervisorIds.map((lecturerId) => ({ lecturerId })) } }
        : undefined,
    },
    include: {
      semester: true,
      topicSupervisors: { include: { lecturer: true } },
    },
  });
};

/**
 * Find topic by ID
 */
export const findById = async (id: number) => {
  return await prisma.topic.findUnique({
    where: { id },
    include: {
      semester: true,
      topicSupervisors: {
        include: {
          lecturer: true,
        },
      },
    },
  });
};

/**
 * Find topic by code
 */
export const findByCode = async (topicCode: string) => {
  return await prisma.topic.findUnique({
    where: { topicCode },
  });
};

/**
 * Update topic
 */
export const update = async (
  id: number,
  data: UpdateTopicInput,
): Promise<Topic> => {
  return await prisma.topic.update({
    where: { id },
    data,
  });
};

/**
 * Update topic supervisors
 */
export const updateSupervisors = async (
  topicId: number,
  supervisorIds: number[],
): Promise<void> => {
  // Delete existing supervisors and create new ones in a transaction
  await prisma.$transaction([
    prisma.topicSupervisor.deleteMany({
      where: { topicId },
    }),
    prisma.topicSupervisor.createMany({
      data: supervisorIds.map((lecturerId) => ({
        topicId,
        lecturerId,
      })),
    }),
  ]);
};

/**
 * Delete topic and all its associated records
 */
export const deleteTopic = async (topicId: number): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    // 1. Get all topic defense IDs for this topic
    const topicDefenses = await tx.topicDefense.findMany({
      where: { topicId },
      select: { id: true },
    });
    const topicDefenseIds = topicDefenses.map((td) => td.id);

    // 2. Delete DefenseCouncil records associated with these registrations
    if (topicDefenseIds.length > 0) {
      await tx.defenseCouncil.deleteMany({
        where: { registrationId: { in: topicDefenseIds } },
      });
    }

    // 3. Delete all TopicDefense records
    await tx.topicDefense.deleteMany({
      where: { topicId },
    });

    // 4. Delete all TopicSupervisor records
    await tx.topicSupervisor.deleteMany({
      where: { topicId },
    });

    // 5. Delete the Topic record
    await tx.topic.delete({
      where: { id: topicId },
    });
  });
};

/**
 * Remove a topic from its latest defense session registration
 */
export const removeTopicFromDefense = async (topicId: number): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    // 1. Get the latest topic defense for this topic
    const topicDefense = await tx.topicDefense.findFirst({
      where: { topicId },
      orderBy: { id: "desc" },
    });

    if (!topicDefense) return;

    // 2. Delete DefenseCouncil records associated with this registration
    await tx.defenseCouncil.deleteMany({
      where: { registrationId: topicDefense.id }
    });

    // 3. Delete TopicDefense record
    await tx.topicDefense.delete({
      where: { id: topicDefense.id }
    });
  });
};

/**
 * Find the latest topic defense for a topic
 */
export const findLatestTopicDefense = async (topicId: number) => {
  return await prisma.topicDefense.findFirst({
    where: { topicId },
    orderBy: { id: "desc" },
    include: { defense: true }, // Changed from session to defense
  });
};

/**
 * Update the final result of a topic defense
 */
export const updateTopicDefenseResult = async (
  topicDefenseId: number,
  result: DefenseResult,
): Promise<TopicDefense> => {
  return await prisma.topicDefense.update({
    where: { id: topicDefenseId },
    data: { finalResult: result },
  });
};
/**
 * Update the final result of topic defenses by topic codes for a specific defense session
 */
export const updateTopicDefenseResultByCodes = async (
  defenseId: number,
  topicResults: { topicCode: string; result: DefenseResult }[]
): Promise<{ count: number }> => {
  return await prisma.$transaction(async (tx) => {
    let count = 0;
    
    // 1. Fetch all matching registrations in one query
    const topicCodes = topicResults.map(r => r.topicCode);
    const registrations = await tx.topicDefense.findMany({
      where: {
        defenseId,
        topic: { topicCode: { in: topicCodes } }
      },
      include: { topic: true },
      orderBy: { id: "asc" }
    });

    // 2. Map topicCode to registration id
    const regMap = new Map<string, number>();
    for (const reg of registrations) {
      if (reg.topic) {
        regMap.set(reg.topic.topicCode, reg.id);
      }
    }

    // 3. Update sequentially but much faster since we don't query each time
    for (const item of topicResults) {
      const regId = regMap.get(item.topicCode);
      if (regId) {
        await tx.topicDefense.update({
          where: { id: regId },
          data: { finalResult: item.result },
        });
        count++;
      }
    }
    
    return { count };
  }, {
    timeout: 30000, // 30 seconds timeout for bulk operations
  });
};
