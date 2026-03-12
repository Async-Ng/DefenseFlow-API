import * as qualificationGroupRepository from "../repositories/qualificationGroupRepository.js";
import type { QualificationGroupWithQualifications } from "../repositories/qualificationGroupRepository.js";

export const createGroup = async (data: {
  code: string;
  name: string;
  description?: string;
  qualificationIds?: number[];
}): Promise<QualificationGroupWithQualifications> => {
  const existingCode = await qualificationGroupRepository.findByCode(data.code);
  if (existingCode) throw new Error(`Nhóm chuyên môn với mã '${data.code}' đã tồn tại`);

  const existingName = await qualificationGroupRepository.findByName(data.name);
  if (existingName) throw new Error(`Nhóm chuyên môn với tên '${data.name}' đã tồn tại`);

  return await qualificationGroupRepository.create(data);
};

export const getAllGroups = async (
  pagination: { page: number; limit: number },
  search?: string
) => {
  return await qualificationGroupRepository.findAll(pagination.page, pagination.limit, search);
};

export const getGroupById = async (id: number): Promise<QualificationGroupWithQualifications> => {
  const group = await qualificationGroupRepository.findById(id);
  if (!group) throw new Error(`Không tìm thấy nhóm chuyên môn với ID ${id}`);
  return group;
};

export const updateGroup = async (
  id: number,
  data: { name?: string; code?: string; description?: string; qualificationIds?: number[] }
): Promise<QualificationGroupWithQualifications> => {
  const existing = await qualificationGroupRepository.findById(id);
  if (!existing) throw new Error(`Không tìm thấy nhóm chuyên môn với ID ${id}`);

  if (data.code && data.code !== existing.code) {
    const dup = await qualificationGroupRepository.findByCode(data.code);
    if (dup) throw new Error(`Nhóm chuyên môn với mã '${data.code}' đã tồn tại`);
  }
  if (data.name && data.name !== existing.name) {
    const dup = await qualificationGroupRepository.findByName(data.name);
    if (dup) throw new Error(`Nhóm chuyên môn với tên '${data.name}' đã tồn tại`);
  }

  return await qualificationGroupRepository.update(id, data);
};

export const deleteGroup = async (id: number): Promise<void> => {
  const existing = await qualificationGroupRepository.findById(id);
  if (!existing) throw new Error(`Không tìm thấy nhóm chuyên môn với ID ${id}`);
  await qualificationGroupRepository.deleteGroup(id);
};
