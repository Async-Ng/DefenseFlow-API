import { prisma } from "../config/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import type {
  TopicType,
  CreateTopicTypeInput,
  UpdateTopicTypeInput,
  PaginatedResult,
  TopicTypeFilters,
} from "../types/index.js";

// Shape of a qualification group nested in the junction row
export type NestedQualificationGroup = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  qualifications: { id: number; name: string; qualificationCode: string }[];
};

// Junction row shape (Group ↔ TopicType)
export type QualificationGroupTopicTypeRow = {
  id: number;
  qualificationGroupId: number;
  topicTypeId: number;
  priorityWeight: number;
  qualificationGroup: NestedQualificationGroup;
};

// Full TopicType including linked qualification groups
export type TopicTypeWithGroups = TopicType & {
  qualificationGroupTopicTypes: QualificationGroupTopicTypeRow[];
};

const groupInclude = {
  qualificationGroupTopicTypes: {
    include: {
      qualificationGroup: {
        include: {
          qualifications: { select: { id: true, name: true, qualificationCode: true }, orderBy: { name: "asc" } },
        },
      },
    },
    orderBy: { qualificationGroup: { name: "asc" as const } },
  },
} satisfies Prisma.TopicTypeInclude;

// ─── Create ──────────────────────────────────────────────────────────────────

export const create = async (data: CreateTopicTypeInput): Promise<TopicTypeWithGroups> => {
  const topicType = await prisma.topicType.create({
    data: { name: data.name },
    include: groupInclude,
  });

  if (data.groups?.length) {
    await prisma.qualificationGroupTopicType.createMany({
      data: data.groups.map((g) => ({
        qualificationGroupId: g.groupId,
        topicTypeId: topicType.id,
        priorityWeight: g.priorityWeight ?? 1,
      })),
      skipDuplicates: true,
    });
    return (await findById(topicType.id))!;
  }

  return topicType;
};

// ─── Read ─────────────────────────────────────────────────────────────────────

export const findAll = async (
  page: number = 1,
  limit: number = 10,
  filters: TopicTypeFilters = {},
): Promise<PaginatedResult<TopicTypeWithGroups>> => {
  const skip = (page - 1) * limit;
  const where: Prisma.TopicTypeWhereInput = {};

  if (filters.search) where.name = { contains: filters.search, mode: "insensitive" };
  if (filters.name) where.name = { contains: filters.name, mode: "insensitive" };

  const [data, total] = await Promise.all([
    prisma.topicType.findMany({ where, skip, take: limit, orderBy: { name: "asc" }, include: groupInclude }),
    prisma.topicType.count({ where }),
  ]);

  return { data, total, page, limit };
};

export const findById = async (id: number): Promise<TopicTypeWithGroups | null> => {
  return await prisma.topicType.findUnique({ where: { id }, include: groupInclude });
};

export const findByName = async (name: string): Promise<TopicTypeWithGroups | null> => {
  return await prisma.topicType.findUnique({ where: { name }, include: groupInclude });
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const update = async (id: number, data: UpdateTopicTypeInput): Promise<TopicTypeWithGroups> => {
  if (data.name !== undefined) {
    await prisma.topicType.update({ where: { id }, data: { name: data.name } });
  }

  // Sync groups if provided (replace all)
  if (data.groups !== undefined) {
    await prisma.qualificationGroupTopicType.deleteMany({ where: { topicTypeId: id } });
    if (data.groups.length > 0) {
      await prisma.qualificationGroupTopicType.createMany({
        data: data.groups.map((g) => ({
          qualificationGroupId: g.groupId,
          topicTypeId: id,
          priorityWeight: g.priorityWeight ?? 1,
        })),
        skipDuplicates: true,
      });
    }
  }

  return (await findById(id))!;
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteTopicType = async (id: number): Promise<TopicType> => {
  await prisma.qualificationGroupTopicType.deleteMany({ where: { topicTypeId: id } });
  return await prisma.topicType.delete({ where: { id } });
};
