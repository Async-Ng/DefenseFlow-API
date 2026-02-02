import { prisma } from "../config/prisma.js";
import { LecturerSessionConfigInput } from "../types/index.js";
import { LecturerSessionConfig } from "../types/index.js";

export const getByLecturerAndSession = async (
  lecturerId: number,
  sessionId: number
): Promise<LecturerSessionConfig | null> => {
  return prisma.lecturerSessionConfig.findFirst({
    where: {
      lecturerId,
      sessionId,
    },
  });
};

export const getById = async (id: number): Promise<LecturerSessionConfig | null> => {
  return prisma.lecturerSessionConfig.findUnique({
    where: { id },
  });
};

export const create = async (
  input: LecturerSessionConfigInput
): Promise<LecturerSessionConfig> => {
  const { lecturerId, sessionId, minTopics, maxTopics } = input;
  return prisma.lecturerSessionConfig.create({
    data: {
      lecturerId,
      sessionId,
      minTopics: minTopics ?? 5,
      maxTopics: maxTopics ?? 20,
    },
  });
};

export const update = async (
  id: number,
  input: Partial<LecturerSessionConfigInput>
): Promise<LecturerSessionConfig> => {
  const { minTopics, maxTopics } = input;
  return prisma.lecturerSessionConfig.update({
    where: { id },
    data: {
      minTopics,
      maxTopics,
    },
  });
};

export const getAll = async (
  options: { skip?: number; take?: number },
  filters: { lecturerId?: number; sessionId?: number }
) => {
  const { skip, take } = options;
  const where = {
    ...(filters.lecturerId ? { lecturerId: filters.lecturerId } : {}),
    ...(filters.sessionId ? { sessionId: filters.sessionId } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.lecturerSessionConfig.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'asc' }, // Consistent ordering
    }),
    prisma.lecturerSessionConfig.count({ where }),
  ]);

  return { data, total };
};

