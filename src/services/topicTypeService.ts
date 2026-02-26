import * as topicTypeRepository from "../repositories/topicTypeRepository.js";
import type {
  CreateTopicTypeInput,
  UpdateTopicTypeInput,
  PaginatedResult,
} from "../types/index.js";
import type { TopicTypeWithQualifications } from "../repositories/topicTypeRepository.js";

export const createTopicType = async (
  input: CreateTopicTypeInput,
): Promise<TopicTypeWithQualifications> => {
  const existing = await topicTypeRepository.findByName(input.name);
  if (existing) {
    throw new Error(`Topic type with name '${input.name}' already exists`);
  }
  return await topicTypeRepository.create(input);
};

export const getAllTopicTypes = async (
  pagination: { page: number; limit: number },
  filters: { name?: string } = {},
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
    throw new Error(`Topic type with id ${id} not found`);
  }

  if (input.name && input.name !== existing.name) {
    const duplicate = await topicTypeRepository.findByName(input.name);
    if (duplicate) {
      throw new Error(`Topic type with name '${input.name}' already exists`);
    }
  }

  return await topicTypeRepository.update(id, input);
};

export const deleteTopicType = async (id: number): Promise<void> => {
  const existing = await topicTypeRepository.findById(id);
  if (!existing) {
    throw new Error(`Topic type with id ${id} not found`);
  }
  await topicTypeRepository.deleteTopicType(id);
};
