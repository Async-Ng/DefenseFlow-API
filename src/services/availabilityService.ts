/**
 * Availability Service
 * Business logic layer for Lecturer Availability operations
 */

import * as availabilityRepository from "../repositories/availabilityRepository.js";
import type {
  DefenseDay,
  DefenseDayWithAvailability,
  LecturerDayAvailability,
  LecturerStatusResponse,
  BatchUpdateAvailabilityInput,
  AvailabilityStatus,
} from "../types/index.js";

/**
 * Get all defense days for a specific defense (for active defense)
 */
export const getDefenseDays = async (
  defenseId: number,
): Promise<DefenseDay[]> => {
  // Verify defense exists
  const defense = await availabilityRepository.getDefenseById(defenseId);
  if (!defense) {
    throw new Error(`Defense with ID ${defenseId} not found`);
  }

  // Get all defense days for this defense
  return await availabilityRepository.getDefenseDaysByDefenseId(defenseId);
};

/**
 * Get defense days with lecturer's availability
 */
export const getDefenseDaysWithAvailability = async (
  defenseId: number,
  lecturerId: number,
): Promise<DefenseDayWithAvailability[]> => {
  // Verify defense exists
  const defense = await availabilityRepository.getDefenseById(defenseId);
  if (!defense) {
    throw new Error(`Defense with ID ${defenseId} not found`);
  }

  // Verify lecturer exists
  const lecturer = await availabilityRepository.getLecturerById(lecturerId);
  if (!lecturer) {
    throw new Error(`Lecturer with ID ${lecturerId} not found`);
  }

  return await availabilityRepository.getDefenseDaysWithAvailability(
    defenseId,
    lecturerId,
  );
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
    throw new Error(`Defense with ID ${defenseId} not found`);
  }

  // Verify lecturer exists
  const lecturer = await availabilityRepository.getLecturerById(lecturerId);
  if (!lecturer) {
    throw new Error(`Lecturer with ID ${lecturerId} not found`);
  }

  // Get lecturer's defense configuration
  const defenseConfig = await availabilityRepository.getLecturerDefenseConfig(
    lecturerId,
    defenseId,
  );

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
): Promise<LecturerDayAvailability> => {
  // Verify lecturer exists
  const lecturer = await availabilityRepository.getLecturerById(lecturerId);
  if (!lecturer) {
    throw new Error(`Lecturer with ID ${lecturerId} not found`);
  }

  // Verify defense day exists
  const defenseDay =
    await availabilityRepository.getDefenseDayById(defenseDayId);
  if (!defenseDay) {
    throw new Error(`Defense day with ID ${defenseDayId} not found`);
  }

  // Get the defense to check if it's locked
  const defense = await availabilityRepository.getDefenseById(
    defenseDay.defenseId,
  );
  if (!defense) {
    throw new Error(`Defense not found`);
  }

  if (defense.status === "Locked") {
    throw new Error("Registration is closed for scheduling processing");
  }

  validateAvailabilityWindow(defense);

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
): Promise<LecturerDayAvailability[]> => {
  // Verify lecturer exists
  const lecturer = await availabilityRepository.getLecturerById(lecturerId);
  if (!lecturer) {
    throw new Error(`Lecturer with ID ${lecturerId} not found`);
  }

  // Validate all defense days exist and belong to the same defense
  const defenseDayIds = data.availabilities.map((a) => a.defenseDayId);
  let defenseId: number | null = null;

  for (const defenseDayId of defenseDayIds) {
    const defenseDay =
      await availabilityRepository.getDefenseDayById(defenseDayId);
    if (!defenseDay) {
      throw new Error(`Defense day with ID ${defenseDayId} not found`);
    }

    if (defenseId === null) {
      defenseId = defenseDay.defenseId;
    } else if (defenseId !== defenseDay.defenseId) {
      throw new Error("All defense days must belong to the same defense");
    }
  }

  // Check if defense is locked
  if (defenseId) {
    const defense = await availabilityRepository.getDefenseById(defenseId);
    if (!defense) {
      throw new Error(`Defense not found`);
    }

    if (defense.status === "Locked") {
      throw new Error("Registration is closed for scheduling processing");
    }

    validateAvailabilityWindow(defense);
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
): Promise<void> => {
  // Verify lecturer exists
  const lecturer = await availabilityRepository.getLecturerById(lecturerId);
  if (!lecturer) {
    throw new Error(`Lecturer with ID ${lecturerId} not found`);
  }

  // Verify defense day exists
  const defenseDay =
    await availabilityRepository.getDefenseDayById(defenseDayId);
  if (!defenseDay) {
    throw new Error(`Defense day with ID ${defenseDayId} not found`);
  }

  // Check if defense is locked
  const defense = await availabilityRepository.getDefenseById(
    defenseDay.defenseId,
  );
  if (!defense) {
    throw new Error(`Defense not found`);
  }

  if (defense.status === "Locked") {
    throw new Error("Registration is closed for scheduling processing");
  }

  validateAvailabilityWindow(defense);

  // Delete the availability record
  await availabilityRepository.deleteAvailability(lecturerId, defenseDayId);
};

const validateAvailabilityWindow = (defense: any) => {
  const now = new Date();
  
  if (defense.availabilityStartDate) {
    const start = new Date(defense.availabilityStartDate);
    start.setHours(0, 0, 0, 0);
    if (now < start) {
      throw new Error("Registration period has not started yet");
    }
  }

  if (defense.availabilityEndDate) {
    const end = new Date(defense.availabilityEndDate);
    end.setHours(23, 59, 59, 999);
    if (now > end) {
      throw new Error("Registration period has ended");
    }
  }
};
