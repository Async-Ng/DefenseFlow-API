import { prisma } from "../config/prisma.js";
import { LecturerDefenseConfigInput } from "../types/index.js";
import { LecturerDefenseConfig } from "../types/index.js";

export const getByLecturerAndDefense = async (
  lecturerId: number,
  defenseId: number
): Promise<LecturerDefenseConfig | null> => {
  return prisma.lecturerDefenseConfig.findFirst({
    where: {
      lecturerId,
      defenseId,
    },
  });
};

export const getById = async (id: number): Promise<LecturerDefenseConfig | null> => {
  return prisma.lecturerDefenseConfig.findUnique({
    where: { id },
  });
};

export const create = async (
  input: LecturerDefenseConfigInput
): Promise<LecturerDefenseConfig> => {
  const { lecturerId, defenseId, minTopics, maxTopics } = input;
  return prisma.lecturerDefenseConfig.create({
    data: {
      lecturerId,
      defenseId,
      minTopics: minTopics ?? 5,
      maxTopics: maxTopics ?? 20,
    },
  });
};

export const update = async (
  id: number,
  input: Partial<LecturerDefenseConfigInput>
): Promise<LecturerDefenseConfig> => {
  const { minTopics, maxTopics } = input;
  return prisma.lecturerDefenseConfig.update({
    where: { id },
    data: {
      minTopics,
      maxTopics,
    },
  });
};

export const getAll = async (
  options: { skip?: number; take?: number },
  filters: { lecturerId?: number; defenseId?: number }
) => {
  const { skip, take } = options;
  const where = {
    ...(filters.lecturerId ? { lecturerId: filters.lecturerId } : {}),
    ...(filters.defenseId ? { defenseId: filters.defenseId } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.lecturerDefenseConfig.findMany({
      where,
      skip,
      take,
      orderBy: { id: "desc" }, // Consistent ordering
    }),
    prisma.lecturerDefenseConfig.count({ where }),
  ]);

  return { data, total };
};
