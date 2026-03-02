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
  if (filters.title) {
    where.title = { contains: filters.title };
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
 * Delete topic
 */
export const deleteTopic = async (id: number): Promise<Topic> => {
  return await prisma.topic.delete({
    where: { id },
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
