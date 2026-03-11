import * as topicRepository from "../repositories/topicRepository.js";
import { prisma } from "../config/prisma.js";
import {
  UpdateTopicResultInput,
  TopicFilters,
  UpdateTopicInput,
  CreateTopicInput,
} from "../types/index.js";

/**
 * Create a new topic
 */
export const createTopic = async (data: CreateTopicInput) => {
  // Validate semesterId exists
  const semester = await prisma.semester.findUnique({ where: { id: data.semesterId } });
  if (!semester) {
    throw new Error(`Không tìm thấy học kỳ với ID ${data.semesterId}`);
  }

  // Validate unique topicCode
  const existing = await topicRepository.findByCode(data.topicCode);
  if (existing) {
    throw new Error(`Đề tài với mã ${data.topicCode} đã tồn tại`);
  }

  return await topicRepository.create(data);
};

/**
 * Get all topics
 */
export const getAllTopics = async (
  page: number,
  limit: number,
  filters: TopicFilters,
) => {
  return await topicRepository.findAll(page, limit, filters);
};

/**
 * Get topic by ID
 */
export const getTopicById = async (id: number) => {
  const topic = await topicRepository.findById(id);
  if (!topic) {
    throw new Error("Không tìm thấy đề tài");
  }
  return topic;
};

/**
 * Update topic
 */
export const updateTopic = async (id: number, data: UpdateTopicInput) => {
  const topic = await topicRepository.findById(id);
  if (!topic) {
    throw new Error("Không tìm thấy đề tài");
  }

  // Check unique constraints if topicCode is being updated
  if (data.topicCode && data.topicCode !== topic.topicCode) {
    const existing = await topicRepository.findByCode(data.topicCode);
    if (existing) {
      throw new Error(`Đề tài với mã ${data.topicCode} đã tồn tại`);
    }
  }

  // Update supervisors if provided
  if (data.supervisorIds !== undefined) {
    if (data.supervisorIds.length === 0) {
      throw new Error("Đề tài phải có ít nhất một giảng viên hướng dẫn");
    }
    await topicRepository.updateSupervisors(id, data.supervisorIds);
    delete (data as any).supervisorIds; // Remove from data object to avoid Prisma error
  }

  return await topicRepository.update(id, data);
};

/**
 * Delete topic
 */
export const deleteTopic = async (id: number) => {
  const topic = await topicRepository.findById(id);
  if (!topic) {
    throw new Error("Không tìm thấy đề tài");
  }

  // Check for dependencies (simplified: relying on foreign key constraints for now or check registration)
  const topicDefense = await topicRepository.findLatestTopicDefense(id);
  if (topicDefense) {
    // If we want to block deletion if registered:
    // throw new Error("Cannot delete topic that is registered in a defense");
  }

  // If we rely on Prisma cascade or just try-catch in controller for FK error
  return await topicRepository.deleteTopic(id);
};

/**
 * Update the result of a topic
 */
export const updateTopicResult = async (
  id: number,
  data: UpdateTopicResultInput,
) => {
  const topic = await topicRepository.findById(id);
  if (!topic) {
    throw new Error("Không tìm thấy đề tài");
  }

  const topicDefense = await topicRepository.findLatestTopicDefense(id);
  if (!topicDefense) {
    throw new Error("Đề tài chưa được đăng ký vào đợt bảo vệ nào");
  }

  return await topicRepository.updateTopicDefenseResult(
    topicDefense.id,
    data.result,
  );
};
/**
 * Update results of multiple topics for a specific defense
 */
export const updateTopicResultsBulk = async (
  defenseId: number,
  topicResults: { topicCode: string; result: any }[]
) => {
  // Simple validation for result values
  for (const item of topicResults) {
    if (!["Pending", "Passed", "Failed"].includes(item.result)) {
      throw new Error(`Kết quả '${item.result}' không hợp lệ cho đề tài ${item.topicCode}`);
    }
  }

  return await topicRepository.updateTopicDefenseResultByCodes(defenseId, topicResults);
};
