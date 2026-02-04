/**
 * Capacity Calculator Service
 * Calculates defense capacity and provides planning recommendations
 */

import { prisma } from "../config/prisma.js";
import type {
  CapacityCalculationRequest,
  CapacityCalculationResponse,
  CapacityAnalysis,
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
  const { semesterId, defenseId, plannedDays } = request;

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
  let currentDefenseDays = null;

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

    currentDefenseDays = defense.defenseDays.length;
  } else if (semester.defenses && semester.defenses.length > 0) {
    // Auto-select first defense from semester if exists
    defense = semester.defenses[0];
    currentDefenseDays = defense.defenseDays?.length || null;
  }

  // Auto-derive configuration values with priority:
  // 1. Explicit request parameter
  // 2. Defense data (if defense exists)
  // 3. Default constant
  const timePerTopic =
    request.timePerTopic || defense?.timePerTopic || DEFAULT_TIME_PER_TOPIC;

  const workHoursPerDay =
    request.workHoursPerDay || DEFAULT_WORK_HOURS_PER_DAY;

  const councilBoardSize = request.councilBoardSize || DEFAULT_COUNCIL_BOARD_SIZE;

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
  };

  // Calculate recommendations
  const recommendations = calculateRecommendations(
    analysis,
    currentDefenseDays,
    plannedDays
  );

  // Generate warnings and suggestions
  const warnings = generateWarnings(analysis, recommendations);
  const suggestions = generateSuggestions(analysis, recommendations);

  return {
    semesterId,
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
  currentDefenseDays: number | null,
  plannedDays?: number
): CapacityRecommendations {
  const { totalTopics, timePerTopic, workHoursPerDay, councilBoardSize } = analysis;

  // Calculate topics per board per day
  const maxTopicsPerBoardPerDay = Math.floor(workHoursPerDay / timePerTopic);
  const minTopicsPerBoardPerDay = Math.max(
    1,
    Math.floor(maxTopicsPerBoardPerDay * 0.8)
  ); // 80% of max
  const avgTopicsPerBoardPerDay = Math.floor(
    (minTopicsPerBoardPerDay + maxTopicsPerBoardPerDay) / 2
  );

  // Calculate minimum days required
  // Assume we can run multiple boards per day
  const estimatedBoardsPerDay = Math.max(1, Math.floor(totalTopics / 50)); // Rough estimate
  const minimumDaysRequired = Math.ceil(
    totalTopics / (maxTopicsPerBoardPerDay * estimatedBoardsPerDay)
  );

  // Calculate recommended days (add buffer)
  const recommendedDays = Math.max(
    minimumDaysRequired,
    Math.ceil(minimumDaysRequired * 1.2)
  );

  // Use planned days or current defense days or recommended days
  const effectiveDays =
    currentDefenseDays || plannedDays || recommendedDays;

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
  const { totalTopics } = analysis;
  const { currentDefenseDays, minimumDaysRequired, councilBoardsPerDay } =
    recommendations;

  // Warning if no topics
  if (totalTopics === 0) {
    warnings.push("Học kỳ chưa có đề tài nào. Vui lòng import đề tài trước.");
  }

  // Warning if defense days insufficient
  if (currentDefenseDays !== null && currentDefenseDays < minimumDaysRequired) {
    warnings.push(
      `Defense hiện tại chỉ có ${currentDefenseDays} ngày, không đủ để chấm ${totalTopics} đề tài (cần tối thiểu ${minimumDaysRequired} ngày).`
    );
  }

  // Warning if too many topics
  if (totalTopics > 200) {
    warnings.push(
      `Số lượng đề tài rất lớn (${totalTopics}). Cần lập kế hoạch kỹ lưỡng và đảm bảo đủ giảng viên tham gia.`
    );
  }

  // Warning if too many boards per day
  if (councilBoardsPerDay > 5) {
    warnings.push(
      `Cần chạy ${councilBoardsPerDay} hội đồng mỗi ngày, có thể gây khó khăn về logistics và phòng học.`
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
  const { totalTopics, councilBoardSize } = analysis;
  const {
    recommendedLecturers,
    topicsPerCouncilBoardPerDay,
    defenseDayAdjustment,
    currentDefenseDays,
    recommendedDays,
  } = recommendations;

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

  // Suggest defense day adjustment
  if (defenseDayAdjustment?.shouldAdjust) {
    const change = defenseDayAdjustment.suggestedChange;
    if (change > 0) {
      suggestions.push(
        `Đề xuất tăng số ngày từ ${currentDefenseDays} lên ${recommendedDays} ngày để giảm áp lực cho giảng viên và hội đồng.`
      );
    } else {
      suggestions.push(
        `Có thể giảm số ngày từ ${currentDefenseDays} xuống ${recommendedDays} ngày để tối ưu hóa thời gian.`
      );
    }
  }

  // Suggest buffer days for large defenses
  if (totalTopics > 100 && recommendedDays < 5) {
    suggestions.push(
      `Với ${totalTopics} đề tài, nên cân nhắc thêm 1-2 ngày dự phòng để xử lý các trường hợp bất ngờ.`
    );
  }

  return suggestions;
}
