import * as topicTypeRepository from "../repositories/topicTypeRepository.js";
import type {
  CreateTopicTypeInput,
  UpdateTopicTypeInput,
  PaginatedResult,
  TopicTypeFilters,
} from "../types/index.js";
import type { TopicTypeWithGroups } from "../repositories/topicTypeRepository.js";

/**
 * Validate danh sách nhóm chuyên môn của một TopicType:
 * 1. Mỗi priorityWeight phải là số nguyên từ 1 đến 100.
 * 2. Tổng các priorityWeight phải bằng đúng 100.
 */
const validateGroupWeights = (
  groups: { groupId: number; priorityWeight?: number }[]
): void => {
  if (!groups || groups.length === 0) return;

  for (const g of groups) {
    const w = g.priorityWeight ?? 1;
    if (!Number.isInteger(w) || w < 1 || w > 100) {
      throw new Error(
        `Trọng số ưu tiên phải là số nguyên từ 1 đến 100 (nhận được: ${w})`
      );
    }
  }

  const total = groups.reduce((sum, g) => sum + (g.priorityWeight ?? 1), 0);
  if (total !== 100) {
    throw new Error(
      `Tổng trọng số ưu tiên của tất cả nhóm phải bằng 100 (hiện tại: ${total}). ` +
      `Vui lòng điều chỉnh lại các trọng số để tổng = 100.`
    );
  }
};

export const createTopicType = async (
  input: CreateTopicTypeInput,
): Promise<TopicTypeWithGroups> => {
  const existing = await topicTypeRepository.findByName(input.name);
  if (existing) {
    throw new Error(`Loại đề tài với tên '${input.name}' đã tồn tại`);
  }

  // Validate group weights: mỗi giá trị 1-100, tổng = 100
  if (input.groups) {
    validateGroupWeights(input.groups);
  }

  return await topicTypeRepository.create(input);
};

export const getAllTopicTypes = async (
  pagination: { page: number; limit: number },
  filters: TopicTypeFilters = {},
): Promise<PaginatedResult<TopicTypeWithGroups>> => {
  return await topicTypeRepository.findAll(pagination.page, pagination.limit, filters);
};

export const getTopicTypeById = async (id: number): Promise<TopicTypeWithGroups | null> => {
  return await topicTypeRepository.findById(id);
};

export const updateTopicType = async (
  id: number,
  input: UpdateTopicTypeInput,
): Promise<TopicTypeWithGroups> => {
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

  // Validate group weights: mỗi giá trị 1-100, tổng = 100
  if (input.groups) {
    validateGroupWeights(input.groups);
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
