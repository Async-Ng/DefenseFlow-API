import * as topicTypeRepository from "../repositories/topicTypeRepository.js";
import type {
  CreateTopicTypeInput,
  UpdateTopicTypeInput,
  PaginatedResult,
  TopicTypeFilters,
} from "../types/index.js";
import type { TopicTypeWithQualifications } from "../repositories/topicTypeRepository.js";

export const createTopicType = async (
  input: CreateTopicTypeInput,
): Promise<TopicTypeWithQualifications> => {
  const existing = await topicTypeRepository.findByName(input.name);
  if (existing) {
    throw new Error(`Loại đề tài với tên '${input.name}' đã tồn tại`);
  }

  // Validate priorityWeight range (1-10)
  if (input.qualifications) {
    for (const q of input.qualifications) {
      if (q.priorityWeight !== undefined) {
        if (!Number.isInteger(q.priorityWeight) || q.priorityWeight < 1 || q.priorityWeight > 10) {
          throw new Error(`Trọng số ưu tiên (priorityWeight) phải là số nguyên từ 1 đến 10`);
        }
      }
    }
  }

  return await topicTypeRepository.create(input);
};

export const getAllTopicTypes = async (
  pagination: { page: number; limit: number },
  filters: TopicTypeFilters = {},
): Promise<PaginatedResult<TopicTypeWithQualifications>> => {
  return await topicTypeRepository.findAll(pagination.page, pagination.limit, filters);
};

export const getTopicTypeById = async (id: number): Promise<TopicTypeWithQualifications | null> => {
  return await topicTypeRepository.findById(id);
};

export const updateTopicType = async (
  id: number,
  input: UpdateTopicTypeInput,
): Promise<TopicTypeWithQualifications> => {
  const existing = await topicTypeRepository.findById(id);
  if (!existing) {
    throw new Error(`Không tìm thấy loại đề tài với ID ${id}`);
  }

  if (input.name && input.name !== existing.name) {
    const duplicate = await topicTypeRepository.findByName(input.name);
    if (duplicate) {
      throw new Error(`Loại đề tài với tên '${input.name}' đã tồn tại`);
    }
  }

  // Validate priorityWeight range (1-10)
  if (input.qualifications) {
    for (const q of input.qualifications) {
      if (q.priorityWeight !== undefined) {
        if (!Number.isInteger(q.priorityWeight) || q.priorityWeight < 1 || q.priorityWeight > 10) {
          throw new Error(`Trọng số ưu tiên (priorityWeight) phải là số nguyên từ 1 đến 10`);
        }
      }
    }
  }

  return await topicTypeRepository.update(id, input);
};

export const deleteTopicType = async (id: number): Promise<void> => {
  const existing = await topicTypeRepository.findById(id);
  if (!existing) {
    throw new Error(`Không tìm thấy loại đề tài với ID ${id}`);
  }
  await topicTypeRepository.deleteTopicType(id);
};
