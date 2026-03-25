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
 * Default configuration values
 */
const DEFAULT_TIME_PER_TOPIC = 90; // minutes
const DEFAULT_WORK_HOURS_PER_DAY = 480; // 8 hours in minutes
const DEFAULT_COUNCIL_BOARD_SIZE = 5; // 1 President + 1 Secretary + 3 Members
const DEFAULT_MIN_TOPICS_PER_LECTURER = 5;
const DEFAULT_MAX_TOPICS_PER_LECTURER = 20;

/**
 * Calculate defense capacity and provide recommendations
 * Auto-derives parameters from semester's defenses or uses defaults
 */
export async function calculateCapacity(
  request: CapacityCalculationRequest
): Promise<CapacityCalculationResponse> {
  const { semesterId, defenseId } = request;

  // Validate semester exists and fetch with defenses
  const semester = await prisma.semester.findUnique({
    where: { id: semesterId },
    include: {
      defenses: {
        include: {
          defenseDays: true,
        },
      },
    },
  });

  if (!semester) {
    throw new Error(`Semester with ID ${semesterId} not found`);
  }

  // Get defense data - priority: specified defenseId > first defense from semester > null
  let defense = null;

  if (defenseId) {
    // Use specified defense
    defense = await prisma.defense.findUnique({
      where: { id: defenseId },
      include: {
        defenseDays: true,
      },
    });

    if (!defense) {
      throw new Error(`Defense with ID ${defenseId} not found`);
    }

  } else if (semester.defenses && semester.defenses.length > 0) {
    // Auto-select first defense from semester if exists
    defense = semester.defenses[0];
  }

  // Calculate total configured councils and per-day analysis
  const timePerTopic = defense?.timePerTopic || DEFAULT_TIME_PER_TOPIC;
  const workHoursPerDay = DEFAULT_WORK_HOURS_PER_DAY;
  const councilBoardSize = DEFAULT_COUNCIL_BOARD_SIZE;
  const topicsPerBoard = Math.floor(workHoursPerDay / timePerTopic);

  const days: DayCapacityAnalysis[] = [];
  let totalConfiguredCouncils = 0;

  if (defense?.defenseDays) {
    for (const day of defense.defenseDays) {
      // Count available lecturers for this specific day
      const availableLecturers = await prisma.lecturerDayAvailability.count({
        where: {
          defenseDayId: day.id,
          status: "Available",
        },
      });

      const maxCouncils = day.maxCouncils || 1;
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

  // Count topics in semester
  const totalTopics = await prisma.topic.count({
    where: { semesterId },
  });

  // Build analysis object
  const analysis: CapacityAnalysis = {
    totalTopics,
    timePerTopic,
    workHoursPerDay,
    councilBoardSize,
    totalConfiguredCouncils,
    days,
  };

  // Calculate recommendations
  const recommendations = calculateRecommendations(
    analysis,
    defense?.defenseDays?.length || null
  );

  // Generate warnings and suggestions
  const warnings = generateWarnings(analysis, recommendations);
  const suggestions = generateSuggestions(analysis, recommendations);

  return {
    semesterId: semester.id,
    defenseId: defense?.id || null,
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
  } = analysis;

  // Calculate topics per board per day
  const maxTopicsPerBoardPerDay = Math.floor(workHoursPerDay / timePerTopic);
  const minTopicsPerBoardPerDay = Math.max(
    1,
    Math.floor(maxTopicsPerBoardPerDay * 0.8)
  ); // 80% of max
  const avgTopicsPerBoardPerDay = Math.floor(
    (minTopicsPerBoardPerDay + maxTopicsPerBoardPerDay) / 2
  );

  // Calculate minimum days required based on a HYPOTHETICAL default of 2 parallel boards if not specified
  // Calculate minimum days required based on a HYPOTHETICAL default of 2 parallel boards if not specified
  const assumedCouncilsPerDay = 2; 
  const maxCapacityPerDay = maxTopicsPerBoardPerDay * assumedCouncilsPerDay;
  const minimumDaysRequired = Math.ceil(totalTopics / maxCapacityPerDay);

  const totalCapacity = (analysis as any).totalConfiguredCouncils * maxTopicsPerBoardPerDay;

  // Calculate recommended days (add buffer 20%)
  const recommendedDays = Math.max(
    minimumDaysRequired,
    Math.ceil(minimumDaysRequired * 1.2)
  );

  // Use current defense days or recommended days
  const effectiveDays =
    currentDefenseDays || recommendedDays;

  // Calculate boards per day needed
  const boardsPerDay = Math.ceil(
    totalTopics / (avgTopicsPerBoardPerDay * effectiveDays)
  );

  // Calculate lecturer requirements
  // Each board needs councilBoardSize lecturers
  // Each lecturer can participate in multiple boards but has min/max limits
  const totalBoardSlots = totalTopics * councilBoardSize;

  // Minimum lecturers (if everyone works at max capacity)
  const minLecturersRequired = Math.ceil(
    totalBoardSlots / DEFAULT_MAX_TOPICS_PER_LECTURER
  );

  // Maximum lecturers (if everyone works at min capacity)
  const maxLecturersNeeded = Math.ceil(
    totalBoardSlots / DEFAULT_MIN_TOPICS_PER_LECTURER
  );

  // Recommended lecturers (balanced workload)
  const idealTopicsPerLecturer = Math.floor(
    (DEFAULT_MIN_TOPICS_PER_LECTURER + DEFAULT_MAX_TOPICS_PER_LECTURER) / 2
  );
  const recommendedLecturers = Math.ceil(
    totalBoardSlots / idealTopicsPerLecturer
  );

  // Calculate lecturer workload recommendations
  const lecturerWorkload = {
    recommendedMin: Math.floor(idealTopicsPerLecturer * 0.7),
    recommendedMax: Math.ceil(idealTopicsPerLecturer * 1.3),
    idealAverage: idealTopicsPerLecturer,
  };

  // Calculate defense day adjustment if defense exists
  let defenseDayAdjustment: DefenseDayAdjustment | null = null;
  if (currentDefenseDays !== null) {
    const difference = recommendedDays - currentDefenseDays;
    if (Math.abs(difference) >= 1) {
      defenseDayAdjustment = {
        shouldAdjust: true,
        suggestedChange: difference,
        reason: generateAdjustmentReason(
          currentDefenseDays,
          totalTopics,
          difference
        ),
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
    return `Số ngày hiện tại (${currentDays}) nhiều hơn cần thiết. Có thể giảm ${Math.abs(
      difference
    )} ngày để tối ưu hóa thời gian mà vẫn đảm bảo chất lượng chấm.`;
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

  // Warning if no topics
  if (totalTopics === 0) {
    warnings.push("Học kỳ chưa có đề tài nào. Vui lòng import đề tài trước.");
  }

  // Warning for understaffed days
  let totalPracticalCapacity = 0;
  const firstDay = days[0];
  const topicsPerBoard = firstDay && firstDay.maxCouncils > 0 
    ? firstDay.maxTopics / firstDay.maxCouncils 
    : (analysis.workHoursPerDay / analysis.timePerTopic);

  for (const day of days) {
    const practicalCouncils = Math.min(day.maxCouncils, day.potentialCouncils);
    totalPracticalCapacity += practicalCouncils * topicsPerBoard;

    if (day.isUnderstaffed) {
      const dateStr = new Date(day.date).toLocaleDateString("vi-VN");
      warnings.push(
        `Ngày ${dateStr}: Cấu hình ${day.maxCouncils} hội đồng nhưng chỉ đủ giảng viên cho ${day.potentialCouncils} hội đồng.`
      );
    }
  }

  // Warning if defense capacity insufficient
  if (totalTopics > totalCapacity) {
    warnings.push(
      `Tổng công suất cấu hình (${totalCapacity} đề tài) không đủ cho ${totalTopics} đề tài thực tế.`
    );
  } else if (totalTopics > totalPracticalCapacity) {
    warnings.push(
      `Mặc dù cấu hình đủ, nhưng do thiếu giảng viên ở một số ngày, công suất thực tế chỉ đạt ${Math.floor(totalPracticalCapacity)} đề tài, không đủ cho ${totalTopics} đề tài.`
    );
  }

  // Warning if too many topics
  if (totalTopics > 200) {
    warnings.push(
      `Số lượng đề tài rất lớn (${totalTopics}). Cần lập kế hoạch cực kỳ kỹ lưỡng.`
    );
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

  // Suggest lecturer count
  if (totalTopics > 0) {
    suggestions.push(
      `Nên có ít nhất ${recommendedLecturers} giảng viên tham gia để cân bằng workload (mỗi hội đồng cần ${councilBoardSize} thành viên).`
    );
  }

  // Suggest topics per board per day
  suggestions.push(
    `Mỗi hội đồng nên chấm khoảng ${topicsPerCouncilBoardPerDay.minimum}-${topicsPerCouncilBoardPerDay.maximum} đề tài mỗi ngày.`
  );

  // Suggestions for understaffed days
  for (const day of days) {
    if (day.isUnderstaffed) {
      const dateStr = new Date(day.date).toLocaleDateString("vi-VN");
      suggestions.push(
        `Ngày ${dateStr}: Hãy kêu gọi thêm ít nhất ${day.maxCouncils * 5 - day.availableLecturers} giảng viên rảnh hoặc giảm số hội đồng xuống ${day.potentialCouncils}.`
      );
    }
  }

  // Suggest defense day adjustment
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
