import * as topicDefenseRepository from "../repositories/topicDefenseRepository.js";
import { prisma } from "../config/prisma.js";
import { CreateTopicDefenseInput, TopicDefenseFilters } from "../types/index.js";

/**
 * Register a topic into a defense
 */
export const createTopicDefense = async (data: CreateTopicDefenseInput) => {
  // Validate topic exists
  const topic = await prisma.topic.findUnique({ where: { id: data.topicId } });
  if (!topic) throw new Error(`Topic with id ${data.topicId} not found`);

  // Validate defense exists
  const defense = await prisma.defense.findUnique({ where: { id: data.defenseId } });
  if (!defense) throw new Error(`Defense with id ${data.defenseId} not found`);

  // Validate defense is open
  if (defense.status !== "Open") {
    throw new Error(`Defense is not open for registration (status: ${defense.status})`);
  }

  // Validate topic is not already registered in this defense
  const existing = await topicDefenseRepository.findByTopicAndDefense(
    data.topicId,
    data.defenseId,
  );
  if (existing) {
    throw new Error(
      `Topic ${data.topicId} is already registered in defense ${data.defenseId}`,
    );
  }

  return await topicDefenseRepository.create(data);
};

/**
 * Get all topic defenses with optional filters
 */
export const getTopicDefenses = async (filters: TopicDefenseFilters) => {
  return await topicDefenseRepository.findAll(filters);
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
