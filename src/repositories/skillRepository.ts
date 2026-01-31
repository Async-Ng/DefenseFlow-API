import { prisma } from "../config/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import type {
  Skill,
  CreateSkillInput,
  UpdateSkillInput,
  PaginatedResult,
} from "../types/index.js";

/**
 * Create a new skill
 */
export const create = async (data: CreateSkillInput): Promise<Skill> => {
  return await prisma.skill.create({
    data: {
      skillCode: data.skillCode,
      name: data.name,
    },
  });
};

/**
 * Find all skills with pagination and filters
 */
export const findAll = async (
  page: number = 1,
  limit: number = 10,
  filters: { skillCode?: string; name?: string } = {},
): Promise<PaginatedResult<Skill>> => {
  const skip = (page - 1) * limit;
  const where: Prisma.SkillWhereInput = {};

  // Apply filters
  if (filters.skillCode) {
    where.skillCode = { contains: filters.skillCode, mode: 'insensitive' };
  }
  if (filters.name) {
    where.name = { contains: filters.name, mode: 'insensitive' };
  }

  const [data, total] = await Promise.all([
    prisma.skill.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: "desc" },
    }),
    prisma.skill.count({ where }),
  ]);

  return { data, total, page, limit };
};

/**
 * Find skill by ID
 */
export const findById = async (id: number): Promise<Skill | null> => {
  return await prisma.skill.findUnique({
    where: { id },
  });
};

/**
 * Find skill by Code
 */
export const findByCode = async (skillCode: string): Promise<Skill | null> => {
  return await prisma.skill.findUnique({
    where: { skillCode },
  });
};

/**
 * Update skill
 */
export const update = async (
  id: number,
  data: UpdateSkillInput,
): Promise<Skill> => {
  const updateData: Prisma.SkillUpdateInput = {};

  if (data.skillCode !== undefined) updateData.skillCode = data.skillCode;
  if (data.name !== undefined) updateData.name = data.name;

  return await prisma.skill.update({
    where: { id },
    data: updateData,
  });
};

/**
 * Delete skill
 */
export const deleteSkill = async (id: number): Promise<Skill> => {
  return await prisma.skill.delete({
    where: { id },
  });
};
