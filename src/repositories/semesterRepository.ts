/**
 * Semester Repository
 * Data access layer for Semester entity (Functional)
 */

import prisma from "@config/prisma.js";
import { Prisma } from "@prisma/client";
import type {
  Semester,
  CreateSemesterInput,
  UpdateSemesterInput,
  PaginatedResult,
  SemesterFilters,
  IncludeOptions,
} from "../types/index.js";

/**
 * Create a new semester
 */
export const create = async (data: CreateSemesterInput): Promise<Semester> => {
  return await prisma.semester.create({
    data: {
      semesterCode: data.semesterCode,
      name: data.name,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
  });
};

/**
 * Find all semesters with pagination and filters
 */
export const findAll = async (
  page: number = 1,
  limit: number = 10,
  filters: SemesterFilters = {},
): Promise<PaginatedResult<Semester>> => {
  const skip = (page - 1) * limit;
  const where: Prisma.SemesterWhereInput = {};

  // Apply filters
  if (filters.semesterCode) {
    where.semesterCode = { contains: filters.semesterCode };
  }
  if (filters.name) {
    where.name = { contains: filters.name };
  }

  const [data, total] = await Promise.all([
    prisma.semester.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: "desc" },
    }),
    prisma.semester.count({ where }),
  ]);

  return { data, total, page, limit };
};

/**
 * Find semester by ID
 */
export const findById = async (
  id: number,
  include: IncludeOptions = {},
): Promise<Semester | null> => {
  const includeOptions: Prisma.SemesterInclude = {};

  if (include.sessions) {
    includeOptions.sessions = include.sessionDays
      ? { include: { sessionDays: true } }
      : true;
  }
  if (include.topics) {
    includeOptions.topics = true;
  }
  if (include.councils) {
    includeOptions.councils = true;
  }

  return await prisma.semester.findUnique({
    where: { id },
    include:
      Object.keys(includeOptions).length > 0 ? includeOptions : undefined,
  });
};

/**
 * Find semester by code
 */
export const findByCode = async (
  semesterCode: string,
): Promise<Semester | null> => {
  return await prisma.semester.findUnique({
    where: { semesterCode },
  });
};

/**
 * Update semester
 */
export const update = async (
  id: number,
  data: UpdateSemesterInput,
): Promise<Semester> => {
  const updateData: Prisma.SemesterUpdateInput = {};

  if (data.semesterCode !== undefined)
    updateData.semesterCode = data.semesterCode;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.startDate !== undefined) {
    updateData.startDate = data.startDate ? new Date(data.startDate) : null;
  }
  if (data.endDate !== undefined) {
    updateData.endDate = data.endDate ? new Date(data.endDate) : null;
  }

  return await prisma.semester.update({
    where: { id },
    data: updateData,
  });
};

/**
 * Delete semester
 */
export const deleteSemester = async (id: number): Promise<Semester> => {
  return await prisma.semester.delete({
    where: { id },
  });
};

/**
 * Check if semester has active sessions
 */
export const hasActiveSessions = async (
  semesterId: number,
): Promise<boolean> => {
  const count = await prisma.session.count({
    where: { semesterId },
  });
  return count > 0;
};

/**
 * Get sessions for date conflict checking
 */
export const getSessionsWithDays = async (
  semesterId: number,
): Promise<any[]> => {
  return await prisma.session.findMany({
    where: { semesterId },
    include: { sessionDays: true },
  });
};
