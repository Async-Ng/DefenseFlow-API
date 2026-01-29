/**
 * Availability Service
 * Business logic layer for Lecturer Availability operations
 */

import * as availabilityRepository from "../repositories/availabilityRepository.js";
import type {
  SessionDay,
  SessionDayWithAvailability,
  LecturerDayAvailability,
  LecturerStatusResponse,
  BatchUpdateAvailabilityInput,
  AvailabilityStatus,
} from "../types/index.js";

/**
 * Get all session days for a specific session (for active session)
 * Acceptance Criteria: API to retrieve all valid SessionDays for the active Session
 */
export const getSessionDays = async (
  sessionId: number,
): Promise<SessionDay[]> => {
  // Verify session exists
  const session = await availabilityRepository.getSessionById(sessionId);
  if (!session) {
    throw new Error(`Session with ID ${sessionId} not found`);
  }

  // Get all session days for this session
  return await availabilityRepository.getSessionDaysBySessionId(sessionId);
};

/**
 * Get session days with lecturer's availability
 */
export const getSessionDaysWithAvailability = async (
  sessionId: number,
  lecturerId: number,
): Promise<SessionDayWithAvailability[]> => {
  // Verify session exists
  const session = await availabilityRepository.getSessionById(sessionId);
  if (!session) {
    throw new Error(`Session with ID ${sessionId} not found`);
  }

  // Verify lecturer exists
  const lecturer = await availabilityRepository.getLecturerById(lecturerId);
  if (!lecturer) {
    throw new Error(`Lecturer with ID ${lecturerId} not found`);
  }

  return await availabilityRepository.getSessionDaysWithAvailability(
    sessionId,
    lecturerId,
  );
};

/**
 * Get current lecturer's registered status
 * Acceptance Criteria: API to get the current lecturer's registered status
 */
export const getLecturerStatus = async (
  lecturerId: number,
  sessionId: number,
): Promise<LecturerStatusResponse> => {
  // Verify session exists
  const session = await availabilityRepository.getSessionById(sessionId);
  if (!session) {
    throw new Error(`Session with ID ${sessionId} not found`);
  }

  // Verify lecturer exists
  const lecturer = await availabilityRepository.getLecturerById(lecturerId);
  if (!lecturer) {
    throw new Error(`Lecturer with ID ${lecturerId} not found`);
  }

  // Get lecturer's session configuration
  const sessionConfig = await availabilityRepository.getLecturerSessionConfig(
    lecturerId,
    sessionId,
  );

  // Get lecturer's availability records
  const availabilities = await availabilityRepository.getLecturerAvailability(
    lecturerId,
    sessionId,
  );

  // Determine if registration is open (session not locked)
  const isRegistrationOpen = session.status !== "Locked";

  return {
    lecturerId,
    sessionId,
    isRegistrationOpen,
    sessionConfig,
    availabilities,
  };
};

/**
 * Update lecturer availability for a specific day
 * Acceptance Criteria: Endpoint to save/update the "Busy" status for specific days
 */
export const updateAvailability = async (
  lecturerId: number,
  sessionDayId: number,
  status: AvailabilityStatus,
): Promise<LecturerDayAvailability> => {
  // Verify lecturer exists
  const lecturer = await availabilityRepository.getLecturerById(lecturerId);
  if (!lecturer) {
    throw new Error(`Lecturer with ID ${lecturerId} not found`);
  }

  // Verify session day exists
  const sessionDay =
    await availabilityRepository.getSessionDayById(sessionDayId);
  if (!sessionDay) {
    throw new Error(`Session day with ID ${sessionDayId} not found`);
  }

  // Get the session to check if it's locked
  const session = await availabilityRepository.getSessionById(
    sessionDay.sessionId,
  );
  if (!session) {
    throw new Error(`Session not found`);
  }

  // Acceptance Criteria: Add logic to prevent updates if the session is "Locked" by Admin
  if (session.status === "Locked") {
    throw new Error("Registration is closed for scheduling processing");
  }

  // Upsert the availability record
  return await availabilityRepository.upsertAvailability(
    lecturerId,
    sessionDayId,
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

  // Validate all session days exist and belong to the same session
  const sessionDayIds = data.availabilities.map((a) => a.sessionDayId);
  let sessionId: number | null = null;

  for (const sessionDayId of sessionDayIds) {
    const sessionDay =
      await availabilityRepository.getSessionDayById(sessionDayId);
    if (!sessionDay) {
      throw new Error(`Session day with ID ${sessionDayId} not found`);
    }

    if (sessionId === null) {
      sessionId = sessionDay.sessionId;
    } else if (sessionId !== sessionDay.sessionId) {
      throw new Error("All session days must belong to the same session");
    }
  }

  // Check if session is locked
  if (sessionId) {
    const session = await availabilityRepository.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Session not found`);
    }

    if (session.status === "Locked") {
      throw new Error("Registration is closed for scheduling processing");
    }
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
  sessionDayId: number,
): Promise<void> => {
  // Verify lecturer exists
  const lecturer = await availabilityRepository.getLecturerById(lecturerId);
  if (!lecturer) {
    throw new Error(`Lecturer with ID ${lecturerId} not found`);
  }

  // Verify session day exists
  const sessionDay =
    await availabilityRepository.getSessionDayById(sessionDayId);
  if (!sessionDay) {
    throw new Error(`Session day with ID ${sessionDayId} not found`);
  }

  // Check if session is locked
  const session = await availabilityRepository.getSessionById(
    sessionDay.sessionId,
  );
  if (!session) {
    throw new Error(`Session not found`);
  }

  if (session.status === "Locked") {
    throw new Error("Registration is closed for scheduling processing");
  }

  // Delete the availability record
  await availabilityRepository.deleteAvailability(lecturerId, sessionDayId);
};
