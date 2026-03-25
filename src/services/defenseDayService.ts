import * as defenseDayRepository from "../repositories/defenseDayRepository.js";
import * as councilBoardRepository from "../repositories/councilBoardRepository.js";
import { DefenseDay } from "../../generated/prisma/client.js";
import { ensureDefenseNotLocked } from "../utils/lockUtils.js";

/**
 * Update a defense day
 */
export const updateDefenseDay = async (
  id: number,
  data: { dayDate?: string; note?: string; maxCouncils?: number },
): Promise<DefenseDay> => {
  const existing = await defenseDayRepository.findById(id);
  if (!existing) {
    throw new Error(`DefenseDay with ID ${id} not found`);
  }

  // Check if defense is locked
  await ensureDefenseNotLocked(existing.defenseId);

  const updateData: any = {};
  if (data.dayDate) updateData.dayDate = new Date(data.dayDate);
  if (data.note !== undefined) updateData.note = data.note;
  if (data.maxCouncils !== undefined) {
    if (data.maxCouncils < 1) throw new Error("maxCouncils must be at least 1");
    
    // Check if new maxCouncils is less than existing boards
    const currentBoardCount = await councilBoardRepository.countByDefenseDay(id);
    if (data.maxCouncils < currentBoardCount) {
      throw new Error(
        `Không thể giảm số hội đồng xuống ${data.maxCouncils} vì ngày này đang có ${currentBoardCount} hội đồng đã được xếp lịch. Vui lòng xóa bớt hội đồng trước.`
      );
    }
    
    updateData.maxCouncils = data.maxCouncils;
  }

  // Validate constraint if updating date
  if (updateData.dayDate) {
    const defenseId = existing.defenseId;
    const dateToCheck = updateData.dayDate;

    const dateInUse = await defenseDayRepository.findByDefenseAndDate(
      defenseId,
      dateToCheck,
    );
    if (dateInUse && dateInUse.id !== id) {
      throw new Error(`The date is already scheduled for defense ${defenseId}.`);
    }
  }

  return await defenseDayRepository.update(id, updateData);
};

/**
 * Delete a defense day
 */
export const deleteDefenseDay = async (id: number): Promise<DefenseDay> => {
  const existing = await defenseDayRepository.findById(id);
  if (!existing) {
    throw new Error(`DefenseDay with ID ${id} not found`);
  }

  // Check if defense is locked
  await ensureDefenseNotLocked(existing.defenseId);

  // Optional dependency check before delete (like related schedules)
  return await defenseDayRepository.remove(id);
};
