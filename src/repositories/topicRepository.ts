import { prisma } from "../config/prisma.js";
import {
  SessionResult,
  TopicSessionRegistration,
  Topic,
  Prisma,
} from "../../generated/prisma/client.js";
import {
  PaginatedResult,
  TopicFilters,
  UpdateTopicInput,
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
  if (filters.supervisorId) {
    where.supervisorId = filters.supervisorId;
  }

  const [data, total] = await Promise.all([
    prisma.topic.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: "desc" },
      include: {
        semester: true,
        supervisor: true,
      },
    }),
    prisma.topic.count({ where }),
  ]);

  return { data, total, page, limit };
};

/**
 * Find topic by ID
 */
export const findById = async (id: number) => {
  return await prisma.topic.findUnique({
    where: { id },
    include: {
      semester: true,
      supervisor: true,
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
 * Delete topic
 */
export const deleteTopic = async (id: number): Promise<Topic> => {
  return await prisma.topic.delete({
    where: { id },
  });
};

/**
 * Find the latest topic session registration for a topic
 */
export const findLatestRegistration = async (topicId: number) => {
  return await prisma.topicSessionRegistration.findFirst({
    where: { topicId },
    orderBy: { id: "desc" },
    include: { session: true },
  });
};

/**
 * Update the final result of a topic session registration
 */
export const updateRegistrationResult = async (
  registrationId: number,
  result: SessionResult,
): Promise<TopicSessionRegistration> => {
  return await prisma.topicSessionRegistration.update({
    where: { id: registrationId },
    data: { finalResult: result },
  });
};
