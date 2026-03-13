import { prisma } from "../config/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import type {
  Qualification,
  CreateQualificationInput,
  UpdateQualificationInput,
  PaginatedResult,
  QualificationFilters,
} from "../types/index.js";

/**
 * Create a new qualification
 */
export const create = async (data: CreateQualificationInput): Promise<Qualification> => {
  return await prisma.qualification.create({
    data: {
      qualificationCode: data.qualificationCode,
      name: data.name,
      component: data.component,
      descHigh: data.descHigh,
      descGood: data.descGood,
      descAcceptable: data.descAcceptable,
      descFail: data.descFail,
      evaluationGuidelines: data.evaluationGuidelines,
      groupId: data.groupId,
    },
  });
};

/**
 * Find all qualifications with pagination and filters
 */
export const findAll = async (
  page: number = 1,
  limit: number = 10,
  filters: QualificationFilters = {},
): Promise<PaginatedResult<Qualification>> => {
  const skip = (page - 1) * limit;
  const where: Prisma.QualificationWhereInput = {};

  // Apply search
  if (filters.search) {
    where.OR = [
      { qualificationCode: { contains: filters.search, mode: "insensitive" } },
      { name: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  // Apply filters
  if (filters.qualificationCode) {
    where.qualificationCode = { contains: filters.qualificationCode, mode: 'insensitive' };
  }
  if (filters.name) {
    where.name = { contains: filters.name, mode: 'insensitive' };
  }

  const [data, total] = await Promise.all([
    prisma.qualification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.qualification.count({ where }),
  ]);

  return { data, total, page, limit };
};

/**
 * Find qualification by ID
 */
export const findById = async (id: number): Promise<Qualification | null> => {
  return await prisma.qualification.findUnique({
    where: { id },
  });
};

/**
 * Find qualification by Code
 */
export const findByCode = async (qualificationCode: string): Promise<Qualification | null> => {
  return await prisma.qualification.findUnique({
    where: { qualificationCode },
  });
};

/**
 * Update qualification
 */
export const update = async (
  id: number,
  data: UpdateQualificationInput,
): Promise<Qualification> => {
  const updateData: Prisma.QualificationUpdateInput = {};

  if (data.qualificationCode !== undefined) updateData.qualificationCode = data.qualificationCode;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.component !== undefined) updateData.component = data.component;
  if (data.descHigh !== undefined) updateData.descHigh = data.descHigh;
  if (data.descGood !== undefined) updateData.descGood = data.descGood;
  if (data.descAcceptable !== undefined) updateData.descAcceptable = data.descAcceptable;
  if (data.descFail !== undefined) updateData.descFail = data.descFail;
  if (data.evaluationGuidelines !== undefined) updateData.evaluationGuidelines = data.evaluationGuidelines;
  
  if (data.groupId !== undefined) {
    if (data.groupId === null) {
      updateData.group = { disconnect: true };
    } else {
      updateData.group = { connect: { id: data.groupId } };
    }
  }

  return await prisma.qualification.update({
    where: { id },
    data: updateData,
  });
};

/**
 * Delete qualification
 */
export const deleteQualification = async (id: number): Promise<Qualification> => {
  return await prisma.qualification.delete({
    where: { id },
  });
};
