import { prisma } from "../config/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import type {
  Lecturer,
  LecturerSkill,
  UpdateLecturerRolesInput,
  PaginatedResult,
  LecturerFilters,
  LecturerWithSkills,
} from "../types/index.js";

/**
 * Find lecturer by ID
 */
export const findById = async (
  id: number,
  includeSkills: boolean = false,
): Promise<LecturerWithSkills | Lecturer | null> => {
  const include: Prisma.LecturerInclude = {};

  if (includeSkills) {
    include.lecturerSkills = {
      include: {
        skill: true,
      },
    };
  }

  return await prisma.lecturer.findUnique({
    where: { id },
    include: Object.keys(include).length > 0 ? include : undefined,
  });
};

/**
 * Find all lecturers with pagination and filters
 */
export const findAll = async (
  page: number = 1,
  limit: number = 10,
  filters: LecturerFilters = {},
): Promise<PaginatedResult<Lecturer>> => {
  const skip = (page - 1) * limit;
  const where: Prisma.LecturerWhereInput = {};

  // Apply filters
  if (filters.lecturerCode) {
    where.lecturerCode = {
      contains: filters.lecturerCode,
    };
  }
  if (filters.fullName) {
    where.fullName = { contains: filters.fullName };
  }
  if (filters.email) {
    where.email = { contains: filters.email };
  }

  const [data, total] = await Promise.all([
    prisma.lecturer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: "asc" },
      include: {
        lecturerSkills: {
          include: {
            skill: true,
          },
        },
      },
    }),
    prisma.lecturer.count({ where }),
  ]);

  return { data, total, page, limit };
};

/**
 * Update lecturer roles
 */
export const updateRoles = async (
  id: number,
  data: UpdateLecturerRolesInput,
): Promise<Lecturer> => {
  const updateData: Prisma.LecturerUpdateInput = {};

  if (data.isPresidentQualified !== undefined) {
    updateData.isPresidentQualified = data.isPresidentQualified;
  }
  if (data.isSecretaryQualified !== undefined) {
    updateData.isSecretaryQualified = data.isSecretaryQualified;
  }

  return await prisma.lecturer.update({
    where: { id },
    data: updateData,
  });
};

/**
 * Upsert lecturer skill (create or update)
 */
export const upsertLecturerSkill = async (
  lecturerId: number,
  skillId: number,
  score: number,
): Promise<LecturerSkill> => {
  return await prisma.lecturerSkill.upsert({
    where: {
      lecturerId_skillId: {
        lecturerId,
        skillId,
      },
    },
    update: {
      score,
    },
    create: {
      lecturerId,
      skillId,
      score,
    },
  });
};

/**
 * Delete lecturer skill
 */
export const deleteLecturerSkill = async (
  lecturerId: number,
  skillId: number,
): Promise<LecturerSkill> => {
  return await prisma.lecturerSkill.delete({
    where: {
      lecturerId_skillId: {
        lecturerId,
        skillId,
      },
    },
  });
};

/**
 * Find all skills for a lecturer
 */
export const findLecturerSkills = async (
  lecturerId: number,
): Promise<LecturerSkill[]> => {
  return await prisma.lecturerSkill.findMany({
    where: { lecturerId },
    include: {
      skill: true,
    },
  });
};

/**
 * Check if skill exists
 */
export const skillExists = async (skillId: number): Promise<boolean> => {
  const count = await prisma.skill.count({
    where: { id: skillId },
  });
  return count > 0;
};
