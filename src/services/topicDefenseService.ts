import * as topicDefenseRepository from "../repositories/topicDefenseRepository.js";
import { prisma } from "../config/prisma.js";
import { CreateTopicDefenseInput, TopicDefenseFilters } from "../types/index.js";

/**
 * Register a topic into a defense
 */
export const createTopicDefense = async (data: CreateTopicDefenseInput) => {
  // Validate defense exists
  const defense = await prisma.defense.findUnique({ where: { id: data.defenseId } });
  if (!defense) throw new Error(`Defense with id ${data.defenseId} not found`);

  // Validate defense is open
  if (defense.status !== "Open") {
    throw new Error(`Defense is not open for registration (status: ${defense.status})`);
  }

  // Validate topics exist
  const topics = await prisma.topic.findMany({
    where: { id: { in: data.topicIds } }
  });
  
  if (topics.length !== data.topicIds.length) {
    const foundIds = topics.map(t => t.id);
    const missingIds = data.topicIds.filter(id => !foundIds.includes(id));
    throw new Error(`The following topic IDs were not found: ${missingIds.join(", ")}`);
  }

  // Validate topics are not already registered in this defense
  const existingRegistrations = await prisma.topicDefense.findMany({
    where: {
      defenseId: data.defenseId,
      topicId: { in: data.topicIds }
    }
  });

  if (existingRegistrations.length > 0) {
    const alreadyRegisteredIds = existingRegistrations.map(r => r.topicId);
    throw new Error(
      `The following topics are already registered in defense ${data.defenseId}: ${alreadyRegisteredIds.join(", ")}`
    );
  }

  return await topicDefenseRepository.create(data);
};

/**
 * Get all topic defenses with optional filters and pagination
 */
export const getTopicDefenses = async (
  filters: TopicDefenseFilters,
  page: number = 1,
  limit: number = 10
) => {
  const { data, total } = await topicDefenseRepository.findAndCountAll(filters, page, limit);
  
  const mappedData = data.map(record => ({
    ...record,
    isScheduled: (record as any).defenseCouncils?.length > 0
  }));

  return {
    data: mappedData,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get topic defense by ID
 */
export const getTopicDefenseById = async (id: number) => {
  const record = await topicDefenseRepository.findById(id);
  if (!record) throw new Error("TopicDefense not found");
  return record;
};

/**
 * Delete a topic defense registration
 */
export const deleteTopicDefense = async (id: number) => {
  const record = await topicDefenseRepository.findById(id);
  if (!record) throw new Error("TopicDefense not found");
  
  // Optional: Add logic to prevent deletion if schedule is already published, etc.
  if (record.defense?.isSchedulePublished) {
    throw new Error("Cannot remove registration from a defense that has published its schedule");
  }

  return await topicDefenseRepository.remove(id);
};
