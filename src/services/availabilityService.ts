/**
 * Availability Service
 * Business logic layer for Lecturer Availability operations
 */

import * as availabilityRepository from "../repositories/availabilityRepository.js";
import type {
  DefenseDayWithAvailability,
  LecturerDayAvailability,
  LecturerStatusResponse,
  BatchUpdateAvailabilityInput,
  AvailabilityStatus,
  EnhancedDefenseDay,
  DefenseDayWithRelations,
} from "../types/index.js";
import { calculateEnhancedDefenseDay } from "../utils/defenseDayStatus.js";
import { ensureDefenseNotLocked } from "../utils/lockUtils.js";

/**
 * Get all defense days for a specific defense (for active defense)
 */
export const getDefenseDays = async (
  defenseId: number,
): Promise<EnhancedDefenseDay[]> => {
  // Verify defense exists
  const defense = await availabilityRepository.getDefenseById(defenseId);
  if (!defense) {
    throw new Error(`Không tìm thấy đợt bảo vệ với ID ${defenseId}`);
  }

  // Get enhanced defense days with counts
  const days =
    await availabilityRepository.getEnhancedDefenseDaysByDefenseId(defenseId);

  return days.map((day) => calculateEnhancedDefenseDay(day));
};

/**
 * Get defense days with lecturer's availability
 */
export const getDefenseDaysWithAvailability = async (
  defenseId: number,
  lecturerId: number,
  isAdmin = false,
): Promise<DefenseDayWithAvailability[]> => {
  // Verify defense exists
  const defense = await availabilityRepository.getDefenseById(defenseId);
  if (!defense) {
    throw new Error(`Không tìm thấy đợt bảo vệ với ID ${defenseId}`);
  }

  // Admin can bypass publication/window checks
  if (!isAdmin && !defense.isAvailabilityPublished) {
    throw new Error(
      "Lịch bảo vệ chưa được công bố. Vui lòng chờ admin mở đợt đăng ký.",
    );
  }

  // Check if current time is within the availability registration window
  if (!isAdmin) {
    validateAvailabilityWindow(defense);
  }

  // Verify lecturer exists
  const lecturer = await availabilityRepository.getLecturerById(lecturerId);
  if (!lecturer) {
    throw new Error(`Không tìm thấy giảng viên với ID ${lecturerId}`);
  }

  // Check if lecturer is configured for this defense
  await validateLecturerConfigured(lecturerId, defenseId);

  // Get defense days with availability
  const dayData =
    await availabilityRepository.getDefenseDaysWithAvailability(defenseId);

  return dayData.map((day: DefenseDayWithRelations) => {
    const enhanced = calculateEnhancedDefenseDay(day);
    return {
      ...enhanced,
      lecturerDayAvailability: (day.lecturerDayAvailability || []).filter(
        (a) => a.lecturerId === lecturerId,
      ),
    } as DefenseDayWithAvailability;
  });
};

/**
 * Get current lecturer's registered status
 */
export const getLecturerStatus = async (
  lecturerId: number,
  defenseId: number,
): Promise<LecturerStatusResponse> => {
  // Verify defense exists
  const defense = await availabilityRepository.getDefenseById(defenseId);
  if (!defense) {
    throw new Error(`Không tìm thấy đợt bảo vệ với ID ${defenseId}`);
  }

  // Verify lecturer exists
  const lecturer = await availabilityRepository.getLecturerById(lecturerId);
  if (!lecturer) {
    throw new Error(`Không tìm thấy giảng viên với ID ${lecturerId}`);
  }

  // Get lecturer's defense configuration
  const defenseConfig = await availabilityRepository.getLecturerDefenseConfig(
    lecturerId,
    defenseId,
  );

  if (!defenseConfig) {
    throw new Error(
      "Bạn không có tên trong danh sách tham gia đợt bảo vệ này.",
    );
  }

  // Get lecturer's availability records
  const availabilities = await availabilityRepository.getLecturerAvailability(
    lecturerId,
    defenseId,
  );

  // Determine if registration is open (defense not locked)
  const isRegistrationOpen = defense.status !== "Locked";

  return {
    lecturerId,
    defenseId,
    isRegistrationOpen,
    defenseConfig,
    availabilities,
  };
};

/**
 * Update lecturer availability for a specific day
 */
export const updateAvailability = async (
  lecturerId: number,
  defenseDayId: number,
  status: AvailabilityStatus,
  isAdmin = false,
): Promise<LecturerDayAvailability> => {
  // Verify lecturer exists
  const lecturer = await availabilityRepository.getLecturerById(lecturerId);
  if (!lecturer) {
    throw new Error(`Không tìm thấy giảng viên với ID ${lecturerId}`);
  }

  // Verify defense day exists
  const defenseDay =
    await availabilityRepository.getDefenseDayById(defenseDayId);
  if (!defenseDay) {
    throw new Error(`Không tìm thấy ngày bảo vệ với ID ${defenseDayId}`);
  }

  // Get the defense to check if it's published and not locked
  const defense = await availabilityRepository.getDefenseById(
    defenseDay.defenseId,
  );
  if (!defense) {
    throw new Error(`Không tìm thấy đợt bảo vệ`);
  }

  // Check if defense is locked
  await ensureDefenseNotLocked(defenseDay.defenseId);

  if (!isAdmin && !defense.isAvailabilityPublished) {
    throw new Error(
      "Lịch bảo vệ chưa được công bố. Vui lòng chờ admin mở đợt đăng ký.",
    );
  }

  if (!isAdmin) {
    validateAvailabilityWindow(defense);
  }
  await validateLecturerConfigured(lecturerId, defenseDay.defenseId);

  // Upsert the availability record
  return await availabilityRepository.upsertAvailability(
    lecturerId,
    defenseDayId,
    status,
  );
};

/**
 * Batch update lecturer availability for multiple days
 */
export const batchUpdateAvailability = async (
  lecturerId: number,
  data: BatchUpdateAvailabilityInput,
  isAdmin = false,
): Promise<LecturerDayAvailability[]> => {
  // Verify lecturer exists
  const lecturer = await availabilityRepository.getLecturerById(lecturerId);
  if (!lecturer) {
    throw new Error(`Không tìm thấy giảng viên với ID ${lecturerId}`);
  }

  // Validate all defense days exist and belong to the same defense
  const defenseDayIds = data.availabilities.map((a) => a.defenseDayId);
  let defenseId: number | null = null;

  for (const defenseDayId of defenseDayIds) {
    const defenseDay =
      await availabilityRepository.getDefenseDayById(defenseDayId);
    if (!defenseDay) {
      throw new Error(`Không tìm thấy ngày bảo vệ với ID ${defenseDayId}`);
    }

    if (defenseId === null) {
      defenseId = defenseDay.defenseId;
    } else if (defenseId !== defenseDay.defenseId) {
      throw new Error("Tất cả các ngày đăng ký phải thuộc cùng một đợt bảo vệ");
    }
  }

  // Check if defense is published and not locked
  if (defenseId) {
    const defense = await availabilityRepository.getDefenseById(defenseId);
    if (!defense) {
      throw new Error(`Không tìm thấy đợt bảo vệ`);
    }

    if (!isAdmin && !defense.isAvailabilityPublished) {
      throw new Error(
        "Lịch bảo vệ chưa được công bố. Vui lòng chờ admin mở đợt đăng ký.",
      );
    }

    if (!isAdmin) {
      validateAvailabilityWindow(defense);
    }
    await validateLecturerConfigured(lecturerId, defenseId);
  }

  // Perform batch update
  return await availabilityRepository.batchUpdateAvailability(
    lecturerId,
    data.availabilities,
  );
};

/**
 * Remove availability record (revert to Available)
 */
export const removeAvailability = async (
  lecturerId: number,
  defenseDayId: number,
  isAdmin = false,
): Promise<void> => {
  // Verify lecturer exists
  const lecturer = await availabilityRepository.getLecturerById(lecturerId);
  if (!lecturer) {
    throw new Error(`Không tìm thấy giảng viên với ID ${lecturerId}`);
  }

  // Verify defense day exists
  const defenseDay =
    await availabilityRepository.getDefenseDayById(defenseDayId);
  if (!defenseDay) {
    throw new Error(`Không tìm thấy ngày bảo vệ với ID ${defenseDayId}`);
  }

  // Check if defense is published and not locked
  const defense = await availabilityRepository.getDefenseById(
    defenseDay.defenseId,
  );
  if (!defense) {
    throw new Error(`Không tìm thấy đợt bảo vệ`);
  }

  // Check if defense is locked
  await ensureDefenseNotLocked(defenseDay.defenseId);

  if (!isAdmin && !defense.isAvailabilityPublished) {
    throw new Error(
      "Lịch bảo vệ chưa được công bố. Vui lòng chờ admin mở đợt đăng ký.",
    );
  }

  if (!isAdmin) {
    validateAvailabilityWindow(defense);
  }
  await validateLecturerConfigured(lecturerId, defenseDay.defenseId);

  // Delete the availability record
  await availabilityRepository.deleteAvailability(lecturerId, defenseDayId);
};

const validateAvailabilityWindow = (defense: any) => {
  const now = new Date();

  const start = defense.availabilityStartDate
    ? new Date(defense.availabilityStartDate)
    : null;
  const end = defense.availabilityEndDate
    ? new Date(defense.availabilityEndDate)
    : null;

  // If neither date is set, no window restriction — skip
  if (!start && !end) return;

  if (start) {
    start.setHours(0, 0, 0, 0);
    if (now < start) {
      const dateStr = start.toLocaleDateString("vi-VN");
      throw new Error(
        `Thời gian đăng ký nguyện vọng chưa bắt đầu. Hệ thống sẽ mở vào ${dateStr}.`,
      );
    }
  }

  if (end) {
    end.setHours(23, 59, 59, 999);
    if (now > end) {
      const dateStr = end.toLocaleDateString("vi-VN");
      throw new Error(
        `Thời gian đăng ký nguyện vọng đã kết thúc (đóng vào ngày ${dateStr}).`,
      );
    }
  }
};

const validateLecturerConfigured = async (
  lecturerId: number,
  defenseId: number,
) => {
  const config = await availabilityRepository.getLecturerDefenseConfig(
    lecturerId,
    defenseId,
  );
  if (!config) {
    throw new Error(
      "Bạn không có tên trong danh sách tham gia đợt bảo vệ này.",
    );
  }
};
/**
 * Get available lecturers for a specific day
 */
export const getAvailableLecturers = async (defenseDayId: number) => {
  // Verify defense day exists
  const defenseDay =
    await availabilityRepository.getDefenseDayById(defenseDayId);
  if (!defenseDay) {
    throw new Error(`Không tìm thấy ngày bảo vệ với ID ${defenseDayId}`);
  }

  return await availabilityRepository.getAvailableLecturersForDay(defenseDayId);
};
