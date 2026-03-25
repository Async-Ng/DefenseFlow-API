import { prisma } from "../config/prisma.js";
import { DefenseDay } from "../../generated/prisma/client.js";

/**
 * Find a DefenseDay by ID
 */
export const findById = async (id: number): Promise<DefenseDay | null> => {
  return await prisma.defenseDay.findUnique({
    where: { id },
  });
};

/**
 * Update a DefenseDay
 */
export const update = async (
  id: number,
  data: { dayDate?: Date; note?: string; maxCouncils?: number },
): Promise<DefenseDay> => {
  return await prisma.defenseDay.update({
    where: { id },
    data,
  });
};

/**
 * Delete a DefenseDay
 */
export const remove = async (id: number): Promise<DefenseDay> => {
  return await prisma.defenseDay.delete({
    where: { id },
  });
};

/**
 * Check if a date is already used on a specific defense
 */
export const findByDefenseAndDate = async (
  defenseId: number,
  dayDate: Date,
): Promise<DefenseDay | null> => {
  // Reset time part of date for accurate comparison if needed
  const searchDate = new Date(dayDate);
  searchDate.setHours(0, 0, 0, 0);

  return await prisma.defenseDay.findFirst({
    where: {
      defenseId,
      dayDate: searchDate,
    },
  });
};
