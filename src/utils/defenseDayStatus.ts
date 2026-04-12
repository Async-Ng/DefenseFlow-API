/**
 * Defense Day Status Utility
 * Shared logic for calculating granular statuses and counts for defense days
 */

import type { 
  DefenseDayStatus, 
  EnhancedDefenseDay,
  DefenseDayWithRelations
} from "../types/index.js";

/**
 * Calculates the status and counts for a defense day
 */
export const calculateEnhancedDefenseDay = (
  day: DefenseDayWithRelations,
  now: Date = new Date()
): EnhancedDefenseDay => {
  const def = day.defense;
  const cb = day.councilBoards || [];
  const lda = day.lecturerDayAvailability || [];
  
  let status: DefenseDayStatus = "Chờ mở đăng ký";

  if (!def || !def.isAvailabilityPublished) {
    status = "Chờ mở đăng ký";
  } else if (def.isSchedulePublished) {
    status = "Đã công bố lịch";
  } else if (cb.length > 0) {
    status = "Đã xếp lịch nháp";
  } else if (def.status === "Locked") {
    status = "Đã khóa đăng ký";
  } else {
    // Check for expired status
    const endDate = def.availabilityEndDate ? new Date(def.availabilityEndDate) : null;
    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
    }
    
    if (endDate && now > endDate) {
      status = "Hết hạn đăng ký";
    } else {
      status = "Đang nhận đăng ký";
    }
  }

  return {
    ...day,
    status,
    boardCount: cb.length,
    availableLecturerCount: lda.filter((a) => a.status === "Available").length,
    busyLecturerCount: (def?.lecturerDefenseConfigs?.length || 0) - lda.filter((a) => a.status === "Available").length,
    totalConfiguredLecturers: def?.lecturerDefenseConfigs?.length || 0,
  };
};
