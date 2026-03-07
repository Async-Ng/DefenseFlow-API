/**
 * Lecturer Service
 * Business logic layer for Lecturer operations (Functional)
 */

import { supabase } from "../config/supabase.js";
import * as lecturerRepository from "../repositories/lecturerRepository.js";
import type {
  Lecturer,
  LecturerWithQualifications,
  UpdateLecturerQualificationsInput,
  PaginatedResult,
  LecturerFilters,
  CreateLecturerInput,
  UpdateLecturerInput,
  UpdateLecturerRolesInput,
} from "../types/index.js";

/**
 * Get lecturer by ID with qualifications
 */
export const getLecturerById = async (
  id: number,
): Promise<LecturerWithQualifications> => {
  const lecturer = await lecturerRepository.findById(id, true);
  if (!lecturer) {
    throw new Error(`Lecturer with ID ${id} not found`);
  }

  return lecturer as LecturerWithQualifications;
};

/**
 * Get all lecturers with pagination
 */
export const getAllLecturers = async (
  page: number = 1,
  limit: number = 10,
  filters: LecturerFilters = {},
): Promise<PaginatedResult<Lecturer>> => {
  const result = await lecturerRepository.findAll(page, limit, filters);

  return {
    ...result,
    data: result.data,
  };
};

/**
 * Create a new lecturer
 */
export const createLecturer = async (data: CreateLecturerInput): Promise<Lecturer> => {
  const existing = await lecturerRepository.findByCode(data.lecturerCode);
  if (existing) {
    throw new Error(`Lecturer with code ${data.lecturerCode} already exists`);
  }

  // 1. Create in Database first to get the local ID
  const lecturer = await lecturerRepository.create(data);

  try {
    // Default password is 000000
    const defaultPassword = "000000";
    
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: data.email || "",
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
      },
      app_metadata: {
        roles: ["lecturer"],
        lecturerId: lecturer.id,
        fullName: data.fullName,
      }
    });

    if (authError) {
      // Rollback: Delete the lecturer if auth creation fails
      console.error("Supabase Auth creation failed, rolling back lecturer record:", authError.message);
      await lecturerRepository.deleteLecturer(lecturer.id);
      throw new Error(`Lỗi tạo tài khoản Auth: ${authError.message}`);
    }

    // 3. Link Supabase auth_id back to our Lecturer record
    const updated = await lecturerRepository.update(lecturer.id, {
      authId: authUser.user.id
    });

    return updated;
  } catch (error: any) {
    throw error;
  }
};

/**
 * Update a lecturer's details
 */
export const updateLecturer = async (id: number, data: UpdateLecturerInput): Promise<Lecturer> => {
  const lecturer = await lecturerRepository.findById(id);
  if (!lecturer) {
    throw new Error(`Lecturer with ID ${id} not found`);
  }
  
  if (data.lecturerCode && data.lecturerCode !== lecturer.lecturerCode) {
    const existing = await lecturerRepository.findByCode(data.lecturerCode);
    if (existing) {
      throw new Error(`Lecturer with code ${data.lecturerCode} already exists`);
    }
  }
  
  return await lecturerRepository.update(id, data);
};

/**
 * Delete a lecturer
 */
export const deleteLecturer = async (id: number): Promise<void> => {
  const lecturer = await lecturerRepository.findById(id);
  if (!lecturer) {
    throw new Error(`Lecturer with ID ${id} not found`);
  }

  await lecturerRepository.deleteLecturer(id);
};

/**
 * Update lecturer qualifications
 */
export const updateLecturerQualifications = async (
  id: number,
  data: UpdateLecturerQualificationsInput,
): Promise<LecturerWithQualifications> => {
  // Check if lecturer exists
  const existing = await lecturerRepository.findById(id);
  if (!existing) {
    throw new Error(`Lecturer with ID ${id} not found`);
  }

  // Validate qualification scores
  for (const qualificationInput of data.qualifications) {
    if (qualificationInput.score < 0 || qualificationInput.score > 5) {
      throw new Error(
        `Invalid qualification score ${qualificationInput.score} for qualification ID ${qualificationInput.qualificationId}. Score must be between 0 and 5.`,
      );
    }

    // Check if qualification exists
    const qualificationExists = await lecturerRepository.qualificationExists(
      qualificationInput.qualificationId,
    );
    if (!qualificationExists) {
      throw new Error(`Qualification with ID ${qualificationInput.qualificationId} not found`);
    }
  }

  // Update qualifications
  await Promise.all(
    data.qualifications.map((qualificationInput) =>
      lecturerRepository.upsertLecturerQualification(
        id,
        qualificationInput.qualificationId,
        qualificationInput.score,
      ),
    ),
  );

  // Return updated lecturer with qualifications
  const updated = await lecturerRepository.findById(id, true);
  if (!updated) {
    throw new Error(`Failed to retrieve updated lecturer`);
  }

  return updated as LecturerWithQualifications;
};

/**
 * Add qualifications to lecturer (Batch)
 */
export const addLecturerQualifications = async (
  id: number,
  qualifications: { qualificationId: number; score: number }[]
): Promise<LecturerWithQualifications> => {
  // Check if lecturer exists
  const existing = await lecturerRepository.findById(id);
  if (!existing) {
    throw new Error(`Lecturer with ID ${id} not found`);
  }

  // Validate and Upsert
  for (const q of qualifications) {
    if (q.score < 0 || q.score > 5) {
      throw new Error(
        `Invalid qualification score ${q.score} for qualification ID ${q.qualificationId}. Score must be between 0 and 5.`
      );
    }

    const exists = await lecturerRepository.qualificationExists(q.qualificationId);
    if (!exists) {
      throw new Error(`Qualification with ID ${q.qualificationId} not found`);
    }

    await lecturerRepository.upsertLecturerQualification(id, q.qualificationId, q.score);
  }

  // Return updated lecturer
  const updated = await lecturerRepository.findById(id, true);
  return updated as LecturerWithQualifications;
};

/**
 * Delete a qualification from a lecturer
 */
export const deleteLecturerQualification = async (
  lecturerId: number,
  qualificationId: number
): Promise<void> => {
   // Check if lecturer exists
   const existingLecturer = await lecturerRepository.findById(lecturerId);
   if (!existingLecturer) {
     throw new Error(`Lecturer with ID ${lecturerId} not found`);
   }
 
  try {
    await lecturerRepository.deleteLecturerQualification(lecturerId, qualificationId);
  } catch (error: any) {
    if (error.code === "P2025") {
       throw new Error(`Qualification with ID ${qualificationId} not assigned to lecturer ${lecturerId}`);
    }
    throw error;
  }
};

/**
 * Get all topics supervised by a lecturer
 */
export const getSupervisedTopics = async (lecturerId: number, filters: { semesterId?: number } = {}) => {
  const lecturer = await lecturerRepository.findById(lecturerId);
  if (!lecturer) {
    throw new Error(`Lecturer with ID ${lecturerId} not found`);
  }
  return await lecturerRepository.findSupervisedTopics(lecturerId, filters);
};

/**
 * Get dashboard stats for a lecturer
 */
export const getLecturerDashboard = async (lecturerId: number) => {
  const lecturer = await lecturerRepository.findById(lecturerId);
  if (!lecturer) {
    throw new Error(`Lecturer with ID ${lecturerId} not found`);
  }
  return await lecturerRepository.getLecturerDashboardStats(lecturerId);
};

/**
 * Reset a lecturer's password to their lecturerCode (padded to 6 chars).
 * Only accessible by Admin.
 */
export const resetLecturerPassword = async (id: number): Promise<void> => {
  const lecturer = await lecturerRepository.findById(id);
  if (!lecturer) {
    throw new Error(`Lecturer with ID ${id} not found`);
  }

  if (!lecturer.authId) {
    throw new Error(`Giảng viên ${lecturer.lecturerCode} chưa có tài khoản Auth để reset.`);
  }

  // Default password is 000000
  const defaultPassword = "000000";

  const { error } = await supabase.auth.admin.updateUserById(lecturer.authId, {
    password: defaultPassword,
  });

  if (error) {
    throw new Error(`Reset mật khẩu thất bại: ${error.message}`);
  }
};

/**
 * Update the roles for a lecturer in Supabase Auth via boolean flags.
 * Only accessible by Admin.
 */
export const updateLecturerRoles = async (id: number, rolesInput: UpdateLecturerRolesInput): Promise<void> => {
  const lecturer = await lecturerRepository.findById(id);
  if (!lecturer) {
    throw new Error(`Lecturer with ID ${id} not found`);
  }

  if (!lecturer.authId) {
    throw new Error(`Giảng viên ${lecturer.lecturerCode} chưa có tài khoản Auth để cập nhật quyền.`);
  }

  // Fetch current user details from Supabase admin
  const { data: { user }, error: getUserError } = await supabase.auth.admin.getUserById(lecturer.authId);
  
  if (getUserError || !user) {
    throw new Error(`Lỗi khi lấy thông tin tài khoản: ${getUserError?.message}`);
  }

  const appMeta = user.app_metadata || {};
  
  // Construct new roles array based on flags
  const newRoles: string[] = [];
  if (rolesInput.isLecturer) newRoles.push("lecturer");
  if (rolesInput.isAdmin) newRoles.push("admin");
  
  // Always ensure they have at least one role (fallback to lecturer or don't allow empty, but let's just use what's passed)
  if (newRoles.length === 0) {
     throw new Error(`Một tài khoản phải có ít nhất một quyền.`);
  }

  // Update Supabase Auth metadata
  const { error: updateError } = await supabase.auth.admin.updateUserById(lecturer.authId, {
    app_metadata: {
      ...appMeta,
      roles: newRoles,
    }
  });

  if (updateError) {
    throw new Error(`Cập nhật quyền thất bại: ${updateError.message}`);
  }
};
/**
 * Get detailed defense schedule for a lecturer
 */
export const getPersonalSchedule = async (
  lecturerId: number,
  filters: { semesterId?: number } = {},
) => {
  const lecturer = await lecturerRepository.findById(lecturerId);
  if (!lecturer) {
    throw new Error(`Lecturer with ID ${lecturerId} not found`);
  }
  return await lecturerRepository.findPersonalSchedule(lecturerId, filters);
};
