import { prisma } from "../config/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";

export type QualificationGroupWithQualifications = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  qualifications: {
    id: number;
    qualificationCode: string;
    name: string;
  }[];
};

const qualificationInclude = {
  qualifications: {
    select: { id: true, qualificationCode: true, name: true },
    orderBy: { name: "asc" as const },
  },
} satisfies Prisma.QualificationGroupInclude;

// ─── Create ───────────────────────────────────────────────────────────────────

export const create = async (data: {
  code: string;
  name: string;
  description?: string;
}): Promise<QualificationGroupWithQualifications> => {
  return await prisma.qualificationGroup.create({
    data: { code: data.code, name: data.name, description: data.description },
    include: qualificationInclude,
  });
};

// ─── Read ─────────────────────────────────────────────────────────────────────

export const findAll = async (
  page: number = 1,
  limit: number = 10,
  search?: string
): Promise<{ data: QualificationGroupWithQualifications[]; total: number; page: number; limit: number }> => {
  const skip = (page - 1) * limit;
  const where: Prisma.QualificationGroupWhereInput = search
    ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { code: { contains: search, mode: "insensitive" } }] }
    : {};

  const [data, total] = await Promise.all([
    prisma.qualificationGroup.findMany({ where, skip, take: limit, orderBy: { name: "asc" }, include: qualificationInclude }),
    prisma.qualificationGroup.count({ where }),
  ]);

  return { data, total, page, limit };
};

export const findById = async (id: number): Promise<QualificationGroupWithQualifications | null> => {
  return await prisma.qualificationGroup.findUnique({ where: { id }, include: qualificationInclude });
};

export const findByCode = async (code: string): Promise<QualificationGroupWithQualifications | null> => {
  return await prisma.qualificationGroup.findUnique({ where: { code }, include: qualificationInclude });
};

export const findByName = async (name: string): Promise<QualificationGroupWithQualifications | null> => {
  return await prisma.qualificationGroup.findUnique({ where: { name }, include: qualificationInclude });
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const update = async (
  id: number,
  data: { name?: string; code?: string; description?: string }
): Promise<QualificationGroupWithQualifications> => {
  return await prisma.qualificationGroup.update({
    where: { id },
    data,
    include: qualificationInclude,
  });
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteGroup = async (id: number): Promise<void> => {
  // Check if group is used by any TopicType
  const usedByTopicType = await prisma.qualificationGroupTopicType.findFirst({ where: { qualificationGroupId: id } });
  if (usedByTopicType) {
    throw new Error("Không thể xóa nhóm đang được sử dụng bởi một hoặc nhiều Loại đề tài.");
  }
  // Unlink all qualifications from this group
  await prisma.qualification.updateMany({ where: { groupId: id }, data: { groupId: null } });
  await prisma.qualificationGroup.delete({ where: { id } });
};
