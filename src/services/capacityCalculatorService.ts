/**
 * Capacity Calculator Service
 * Calculates defense capacity and provides planning recommendations
 */

import { prisma } from "../config/prisma.js";
import type {
  CapacityCalculationRequest,
  CapacityCalculationResponse,
  CapacityAnalysis,
  DayCapacityAnalysis,
  CapacityRecommendations,
  DefenseDayAdjustment,
} from "../types/index.js";

/**
 * Fallback values used only when defense has no configuration
 */
const DEFAULT_TIME_PER_TOPIC = 120; // minutes — consistent with createDefenseCouncil
const DEFAULT_WORK_HOURS_PER_DAY = 480; // 8 hours in minutes
const DEFAULT_COUNCIL_BOARD_SIZE = 5; // 1 President + 1 Secretary + 3 Members
const DEFAULT_MIN_TOPICS_PER_LECTURER = 5;
const DEFAULT_MAX_TOPICS_PER_LECTURER = 20;

/**
 * Calculate defense capacity and provide recommendations
 * All parameters are derived from actual defense configuration.
 */
export async function calculateCapacity(
  request: CapacityCalculationRequest
): Promise<CapacityCalculationResponse> {
  const { semesterId, defenseId } = request;

  // Validate semester exists
  const semester = await prisma.semester.findUnique({
    where: { id: semesterId },
    include: {
      defenses: {
        include: { defenseDays: true },
      },
    },
  });

  if (!semester) {
    throw new Error(`Semester with ID ${semesterId} not found`);
  }

  // Get defense — priority: specified defenseId > first defense in semester > null
  let defense = null;

  if (defenseId) {
    defense = await prisma.defense.findUnique({
      where: { id: defenseId },
      include: { defenseDays: true },
    });
    if (!defense) throw new Error(`Defense with ID ${defenseId} not found`);
  } else if (semester.defenses.length > 0) {
    defense = semester.defenses[0];
  }

  // --- Derive configuration from actual defense data ---

  // timePerTopic: from defense config, fallback to default
  const timePerTopic = defense?.timePerTopic ?? DEFAULT_TIME_PER_TOPIC;

  // workHoursPerDay: no workEndTime in schema, keep default
  const workHoursPerDay = DEFAULT_WORK_HOURS_PER_DAY;

  // councilBoardSize: fixed by domain rule (1 president + 1 secretary + 3 members)
  const councilBoardSize = DEFAULT_COUNCIL_BOARD_SIZE;

  // Lecturer min/max topics: from LecturerDefenseConfig records for this defense
  let minTopicsPerLecturer = DEFAULT_MIN_TOPICS_PER_LECTURER;
  let maxTopicsPerLecturer = DEFAULT_MAX_TOPICS_PER_LECTURER;

  if (defense) {
    const configs = await prisma.lecturerDefenseConfig.findMany({
      where: { defenseId: defense.id },
      select: { minTopics: true, maxTopics: true },
    });

    if (configs.length > 0) {
      const totalMin = configs.reduce((s, c) => s + (c.minTopics ?? DEFAULT_MIN_TOPICS_PER_LECTURER), 0);
      const totalMax = configs.reduce((s, c) => s + (c.maxTopics ?? DEFAULT_MAX_TOPICS_PER_LECTURER), 0);
      minTopicsPerLecturer = Math.floor(totalMin / configs.length);
      maxTopicsPerLecturer = Math.floor(totalMax / configs.length);
    }
  }

  // Total topics: count TopicDefense registrations for this defense (not all semester topics)
  const totalTopics = defense
    ? await prisma.topicDefense.count({ where: { defenseId: defense.id } })
    : await prisma.topic.count({ where: { semesterId } });

  // Supervisor IDs: lecturers who cannot serve as council members for topics in this defense
  const supervisorIds: number[] = [];
  if (defense) {
    const supervisors = await prisma.topicSupervisor.findMany({
      where: {
        topic: {
          topicDefenses: { some: { defenseId: defense.id } },
        },
      },
      select: { lecturerId: true },
    });
    supervisors.forEach((s) => {
      if (!supervisorIds.includes(s.lecturerId)) supervisorIds.push(s.lecturerId);
    });
  }

  // --- Per-day analysis ---
  const topicsPerBoard = Math.floor(workHoursPerDay / timePerTopic);
  const days: DayCapacityAnalysis[] = [];
  let totalConfiguredCouncils = 0;

  if (defense?.defenseDays) {
    for (const day of defense.defenseDays) {
      // Available lecturers: status=Available (Supervisors are still available for other boards)
      const availableLecturers = await prisma.lecturerDayAvailability.count({
        where: {
          defenseDayId: day.id,
          status: "Available",
        },
      });

      const maxCouncils = day.maxCouncils ?? 1;
      const potentialCouncils = Math.floor(availableLecturers / councilBoardSize);
      const isUnderstaffed = potentialCouncils < maxCouncils;

      days.push({
        defenseDayId: day.id,
        date: day.dayDate,
        maxCouncils,
        availableLecturers,
        potentialCouncils,
        isUnderstaffed,
        maxTopics: maxCouncils * topicsPerBoard,
      });

      totalConfiguredCouncils += maxCouncils;
    }
  }

  const analysis: CapacityAnalysis = {
    totalTopics,
    timePerTopic,
    workHoursPerDay,
    councilBoardSize,
    totalConfiguredCouncils,
    minTopicsPerLecturer,
    maxTopicsPerLecturer,
    days,
  };

  const recommendations = calculateRecommendations(
    analysis,
    defense?.defenseDays?.length ?? null
  );

  const warnings = generateWarnings(analysis, recommendations);
  const suggestions = generateSuggestions(analysis, recommendations);

  return {
    semesterId: semester.id,
    defenseId: defense?.id ?? null,
    analysis,
    recommendations,
    warnings,
    suggestions,
  };
}

/**
 * Calculate all recommendations based on analysis
 */
function calculateRecommendations(
  analysis: CapacityAnalysis,
  currentDefenseDays: number | null
): CapacityRecommendations {
  const {
    totalTopics,
    timePerTopic,
    workHoursPerDay,
    councilBoardSize,
    minTopicsPerLecturer,
    maxTopicsPerLecturer,
    days,
  } = analysis;

  // Topics per board per day — derived from actual timePerTopic
  const maxTopicsPerBoardPerDay = Math.floor(workHoursPerDay / timePerTopic);
  const minTopicsPerBoardPerDay = Math.max(1, Math.floor(maxTopicsPerBoardPerDay * 0.8));
  const avgTopicsPerBoardPerDay = Math.floor((minTopicsPerBoardPerDay + maxTopicsPerBoardPerDay) / 2);

  // Total capacity: sum of each day's actual configured capacity
  const totalCapacity = days.reduce((sum, d) => sum + d.maxTopics, 0);

  // Minimum days required:
  // If days are configured → derive average capacity per day from real data
  // If no days yet → assume 2 parallel councils as planning baseline
  let minimumDaysRequired: number;
  if (days.length > 0 && totalCapacity > 0) {
    const avgCapacityPerDay = totalCapacity / days.length;
    minimumDaysRequired = Math.ceil(totalTopics / avgCapacityPerDay);
  } else {
    const fallbackCouncilsPerDay = 2;
    minimumDaysRequired = Math.ceil(totalTopics / (maxTopicsPerBoardPerDay * fallbackCouncilsPerDay));
  }

  // Recommended days: minimum + 20% buffer
  const recommendedDays = Math.max(minimumDaysRequired, Math.ceil(minimumDaysRequired * 1.2));

  // Boards per day needed
  const effectiveDays = currentDefenseDays || recommendedDays;
  const boardsPerDay = Math.ceil(totalTopics / (avgTopicsPerBoardPerDay * effectiveDays));

  // Lecturer requirements — use actual per-defense min/max configs
  // Each topic needs `councilBoardSize` seats. A lecturer can hold 1 seat per topic.
  const totalBoardSlots = totalTopics * councilBoardSize;

  const minLecturersRequired = Math.ceil(totalBoardSlots / maxTopicsPerLecturer);
  const maxLecturersNeeded = Math.ceil(totalBoardSlots / minTopicsPerLecturer);
  const idealTopicsPerLecturer = Math.floor((minTopicsPerLecturer + maxTopicsPerLecturer) / 2);
  const recommendedLecturers = Math.ceil(totalBoardSlots / idealTopicsPerLecturer);

  const lecturerWorkload = {
    recommendedMin: Math.floor(idealTopicsPerLecturer * 0.7),
    recommendedMax: Math.ceil(idealTopicsPerLecturer * 1.3),
    idealAverage: idealTopicsPerLecturer,
  };

  // Defense day adjustment
  let defenseDayAdjustment: DefenseDayAdjustment | null = null;
  if (currentDefenseDays !== null) {
    const difference = recommendedDays - currentDefenseDays;
    if (Math.abs(difference) >= 1) {
      defenseDayAdjustment = {
        shouldAdjust: true,
        suggestedChange: difference,
        reason: generateAdjustmentReason(currentDefenseDays, totalTopics, difference),
      };
    } else {
      defenseDayAdjustment = {
        shouldAdjust: false,
        suggestedChange: 0,
        reason: "Số ngày hiện tại phù hợp với số lượng đề tài.",
      };
    }
  }

  return {
    minimumDaysRequired,
    recommendedDays,
    currentDefenseDays,
    totalCapacity,
    defenseDayAdjustment,
    minLecturersRequired,
    recommendedLecturers,
    maxLecturersNeeded,
    topicsPerCouncilBoardPerDay: {
      minimum: minTopicsPerBoardPerDay,
      maximum: maxTopicsPerBoardPerDay,
      average: avgTopicsPerBoardPerDay,
    },
    councilBoardsPerDay: boardsPerDay,
    lecturerWorkload,
  };
}

/**
 * Generate reason for defense day adjustment
 */
function generateAdjustmentReason(
  currentDays: number,
  totalTopics: number,
  difference: number
): string {
  if (difference > 0) {
    return `Số ngày hiện tại (${currentDays}) không đủ để chấm ${totalTopics} đề tài. Cần tăng thêm ${difference} ngày để đảm bảo workload hợp lý và tránh quá tải cho giảng viên.`;
  } else {
    return `Số ngày hiện tại (${currentDays}) nhiều hơn cần thiết. Có thể giảm ${Math.abs(difference)} ngày để tối ưu hóa thời gian mà vẫn đảm bảo chất lượng chấm.`;
  }
}

/**
 * Generate warnings based on analysis
 */
function generateWarnings(
  analysis: CapacityAnalysis,
  recommendations: CapacityRecommendations
): string[] {
  const warnings: string[] = [];
  const { totalTopics, days } = analysis;
  const { totalCapacity } = recommendations;

  if (totalTopics === 0) {
    warnings.push("Đợt bảo vệ chưa có đề tài nào được đăng ký.");
  }

  let totalPracticalCapacity = 0;
  const topicsPerBoard = days[0]?.maxCouncils > 0
    ? days[0].maxTopics / days[0].maxCouncils
    : analysis.workHoursPerDay / analysis.timePerTopic;

  for (const day of days) {
    const practicalCouncils = Math.min(day.maxCouncils, day.potentialCouncils);
    totalPracticalCapacity += practicalCouncils * topicsPerBoard;

    if (day.isUnderstaffed) {
      const dateStr = new Date(day.date).toLocaleDateString("vi-VN");
      warnings.push(
        `Ngày ${dateStr}: Cấu hình ${day.maxCouncils} hội đồng nhưng hiện chỉ có đủ giảng viên rảnh cho ${day.potentialCouncils} hội đồng.`
      );
    }
  }

  if (totalTopics > totalCapacity && totalCapacity > 0) {
    warnings.push(
      `Tổng công suất cấu hình (${totalCapacity} đề tài) không đủ cho ${totalTopics} đề tài đã đăng ký.`
    );
  } else if (totalTopics > totalPracticalCapacity && totalPracticalCapacity > 0) {
    warnings.push(
      `Cấu hình đủ nhưng do thiếu giảng viên rảnh thực tế, công suất chỉ đạt ${Math.floor(totalPracticalCapacity)} đề tài, không đủ cho ${totalTopics} đề tài.`
    );
  }


  if (totalTopics > 200) {
    warnings.push(`Số lượng đề tài rất lớn (${totalTopics}). Cần lập kế hoạch cực kỳ kỹ lưỡng.`);
  }

  return warnings;
}

/**
 * Generate suggestions based on analysis
 */
function generateSuggestions(
  analysis: CapacityAnalysis,
  recommendations: CapacityRecommendations
): string[] {
  const suggestions: string[] = [];
  const { totalTopics, councilBoardSize, days } = analysis;
  const {
    recommendedLecturers,
    topicsPerCouncilBoardPerDay,
    defenseDayAdjustment,
    recommendedDays,
  } = recommendations;

  const currentDefenseDays = days.length;

  if (totalTopics > 0) {
    suggestions.push(
      `Nên có ít nhất ${recommendedLecturers} giảng viên tham gia (sau khi loại giảng viên hướng dẫn) để cân bằng workload — mỗi hội đồng cần ${councilBoardSize} thành viên.`
    );
  }

  suggestions.push(
    `Mỗi hội đồng nên chấm khoảng ${topicsPerCouncilBoardPerDay.minimum}–${topicsPerCouncilBoardPerDay.maximum} đề tài mỗi ngày (dựa trên ${analysis.timePerTopic} phút/đề tài).`
  );

  for (const day of days) {
    if (day.isUnderstaffed) {
      const dateStr = new Date(day.date).toLocaleDateString("vi-VN");
      const needed = day.maxCouncils * councilBoardSize - day.availableLecturers;
      suggestions.push(
        `Ngày ${dateStr}: Cần thêm ít nhất ${needed} giảng viên rảnh (không phải người hướng dẫn), hoặc giảm số hội đồng xuống ${day.potentialCouncils}.`
      );
    }
  }

  if (defenseDayAdjustment?.shouldAdjust) {
    const change = defenseDayAdjustment.suggestedChange;
    if (change > 0) {
      suggestions.push(
        `Đề xuất tăng thêm ${change} ngày bảo vệ (tổng ${recommendedDays} ngày) hoặc tăng số hội đồng trên các ngày có nhiều giảng viên rảnh.`
      );
    } else {
      suggestions.push(
        `Có thể giảm số ngày từ ${currentDefenseDays} xuống ${recommendedDays} ngày để tối ưu hóa thời gian.`
      );
    }
  }

  return suggestions;
}
