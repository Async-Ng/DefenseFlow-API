import { prisma } from "../config/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import type {
  TopicType,
  CreateTopicTypeInput,
  UpdateTopicTypeInput,
  PaginatedResult,
} from "../types/index.js";

// Shape of a qualification nested inside the junction row
export type NestedQualification = {
  id: number;
  qualificationCode: string;
  name: string;
  isCommon: boolean;
};

// Junction row shape
export type QualificationTopicTypeRow = {
  id: number;
  qualificationId: number;
  topicTypeId: number;
  qualification: NestedQualification;
};

// Full TopicType including linked qualifications via junction table
export type TopicTypeWithQualifications = TopicType & {
  qualificationTopicTypes: QualificationTopicTypeRow[];
};

const qualificationInclude = {
  qualificationTopicTypes: {
    include: { qualification: true },
    orderBy: { qualification: { name: "asc" as const } },
  },
} satisfies Prisma.TopicTypeInclude;

// ─── Create ──────────────────────────────────────────────────────────────────

export const create = async (data: CreateTopicTypeInput): Promise<TopicTypeWithQualifications> => {
  const topicType = await prisma.topicType.create({
    data: { name: data.name },
    include: qualificationInclude,
  });

  // Link qualifications if provided
  if (data.qualificationIds?.length) {
    await prisma.qualificationTopicType.createMany({
      data: data.qualificationIds.map((qualificationId) => ({
        qualificationId,
        topicTypeId: topicType.id,
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
  filters: { name?: string } = {},
): Promise<PaginatedResult<TopicTypeWithQualifications>> => {
  const skip = (page - 1) * limit;
  const where: Prisma.TopicTypeWhereInput = {};

  if (filters.name) {
    where.name = { contains: filters.name, mode: "insensitive" };
  }

  const [data, total] = await Promise.all([
    prisma.topicType.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      include: qualificationInclude,
    }),
    prisma.topicType.count({ where }),
  ]);

  return { data, total, page, limit };
};

export const findById = async (id: number): Promise<TopicTypeWithQualifications | null> => {
  return await prisma.topicType.findUnique({
    where: { id },
    include: qualificationInclude,
  });
};

export const findByName = async (name: string): Promise<TopicTypeWithQualifications | null> => {
  return await prisma.topicType.findUnique({
    where: { name },
    include: qualificationInclude,
  });
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const update = async (
  id: number,
  data: UpdateTopicTypeInput,
): Promise<TopicTypeWithQualifications> => {
  // Update name if provided
  if (data.name !== undefined) {
    await prisma.topicType.update({
      where: { id },
      data: { name: data.name },
    });
  }

  // Sync qualifications if provided (replace all)
  if (data.qualificationIds !== undefined) {
    await prisma.qualificationTopicType.deleteMany({ where: { topicTypeId: id } });
    if (data.qualificationIds.length > 0) {
      await prisma.qualificationTopicType.createMany({
        data: data.qualificationIds.map((qualificationId) => ({ qualificationId, topicTypeId: id })),
        skipDuplicates: true,
      });
    }
  }

  return (await findById(id))!;
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteTopicType = async (id: number): Promise<TopicType> => {
  // Delete junction rows first to avoid FK constraint errors
  await prisma.qualificationTopicType.deleteMany({ where: { topicTypeId: id } });
  return await prisma.topicType.delete({ where: { id } });
};
