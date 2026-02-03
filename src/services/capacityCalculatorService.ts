/**
 * Capacity Calculator Service
 * Calculates session capacity and provides planning recommendations
 */

import { prisma } from "../config/prisma.js";
import type {
  CapacityCalculationRequest,
  CapacityCalculationResponse,
  CapacityAnalysis,
  CapacityRecommendations,
  SessionDayAdjustment,
} from "../types/index.js";

/**
 * Default configuration values
 */
const DEFAULT_TIME_PER_TOPIC = 90; // minutes
const DEFAULT_WORK_HOURS_PER_DAY = 480; // 8 hours in minutes
const DEFAULT_COUNCIL_SIZE = 5; // 1 President + 1 Secretary + 3 Members
const DEFAULT_MIN_TOPICS_PER_LECTURER = 5;
const DEFAULT_MAX_TOPICS_PER_LECTURER = 20;

/**
 * Calculate session capacity and provide recommendations
 * Auto-derives parameters from semester's sessions or uses defaults
 */
export async function calculateCapacity(
  request: CapacityCalculationRequest
): Promise<CapacityCalculationResponse> {
  const { semesterId, sessionId, plannedDays } = request;

  // Validate semester exists and fetch with sessions
  const semester = await prisma.semester.findUnique({
    where: { id: semesterId },
    include: {
      sessions: {
        include: {
          sessionDays: true,
        },
      },
    },
  });

  if (!semester) {
    throw new Error(`Semester with ID ${semesterId} not found`);
  }

  // Get session data - priority: specified sessionId > first session from semester > null
  let session = null;
  let currentSessionDays = null;

  if (sessionId) {
    // Use specified session
    session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        sessionDays: true,
      },
    });

    if (!session) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }

    currentSessionDays = session.sessionDays.length;
  } else if (semester.sessions && semester.sessions.length > 0) {
    // Auto-select first session from semester if exists
    session = semester.sessions[0];
    currentSessionDays = session.sessionDays?.length || null;
  }

  // Auto-derive configuration values with priority:
  // 1. Explicit request parameter
  // 2. Session data (if session exists)
  // 3. Default constant
  const timePerTopic =
    request.timePerTopic || session?.timePerTopic || DEFAULT_TIME_PER_TOPIC;

  const workHoursPerDay =
    request.workHoursPerDay || DEFAULT_WORK_HOURS_PER_DAY;

  const councilSize = request.councilSize || DEFAULT_COUNCIL_SIZE;

  // Count topics in semester
  const totalTopics = await prisma.topic.count({
    where: { semesterId },
  });

  // Build analysis object
  const analysis: CapacityAnalysis = {
    totalTopics,
    timePerTopic,
    workHoursPerDay,
    councilSize,
  };

  // Calculate recommendations
  const recommendations = calculateRecommendations(
    analysis,
    currentSessionDays,
    plannedDays
  );

  // Generate warnings and suggestions
  const warnings = generateWarnings(analysis, recommendations);
  const suggestions = generateSuggestions(analysis, recommendations);

  return {
    semesterId,
    sessionId: session?.id || null,
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
  currentSessionDays: number | null,
  plannedDays?: number
): CapacityRecommendations {
  const { totalTopics, timePerTopic, workHoursPerDay, councilSize } = analysis;

  // Calculate topics per council per day
  const maxTopicsPerCouncilPerDay = Math.floor(workHoursPerDay / timePerTopic);
  const minTopicsPerCouncilPerDay = Math.max(
    1,
    Math.floor(maxTopicsPerCouncilPerDay * 0.8)
  ); // 80% of max
  const avgTopicsPerCouncilPerDay = Math.floor(
    (minTopicsPerCouncilPerDay + maxTopicsPerCouncilPerDay) / 2
  );

  // Calculate minimum days required
  // Assume we can run multiple councils per day
  const estimatedCouncilsPerDay = Math.max(1, Math.floor(totalTopics / 50)); // Rough estimate
  const minimumDaysRequired = Math.ceil(
    totalTopics / (maxTopicsPerCouncilPerDay * estimatedCouncilsPerDay)
  );

  // Calculate recommended days (add buffer)
  const recommendedDays = Math.max(
    minimumDaysRequired,
    Math.ceil(minimumDaysRequired * 1.2)
  );

  // Use planned days or current session days or recommended days
  const effectiveDays =
    currentSessionDays || plannedDays || recommendedDays;

  // Calculate councils per day needed
  const councilsPerDay = Math.ceil(
    totalTopics / (avgTopicsPerCouncilPerDay * effectiveDays)
  );

  // Calculate lecturer requirements
  // Each council needs councilSize lecturers
  // Each lecturer can participate in multiple councils but has min/max limits
  const totalCouncilSlots = totalTopics * councilSize;

  // Minimum lecturers (if everyone works at max capacity)
  const minLecturersRequired = Math.ceil(
    totalCouncilSlots / DEFAULT_MAX_TOPICS_PER_LECTURER
  );

  // Maximum lecturers (if everyone works at min capacity)
  const maxLecturersNeeded = Math.ceil(
    totalCouncilSlots / DEFAULT_MIN_TOPICS_PER_LECTURER
  );

  // Recommended lecturers (balanced workload)
  const idealTopicsPerLecturer = Math.floor(
    (DEFAULT_MIN_TOPICS_PER_LECTURER + DEFAULT_MAX_TOPICS_PER_LECTURER) / 2
  );
  const recommendedLecturers = Math.ceil(
    totalCouncilSlots / idealTopicsPerLecturer
  );

  // Calculate lecturer workload recommendations
  const lecturerWorkload = {
    recommendedMin: Math.floor(idealTopicsPerLecturer * 0.7),
    recommendedMax: Math.ceil(idealTopicsPerLecturer * 1.3),
    idealAverage: idealTopicsPerLecturer,
  };

  // Calculate session day adjustment if session exists
  let sessionDayAdjustment: SessionDayAdjustment | null = null;
  if (currentSessionDays !== null) {
    const difference = recommendedDays - currentSessionDays;
    if (Math.abs(difference) >= 1) {
      sessionDayAdjustment = {
        shouldAdjust: true,
        suggestedChange: difference,
        reason: generateAdjustmentReason(
          currentSessionDays,
          recommendedDays,
          totalTopics,
          difference
        ),
      };
    } else {
      sessionDayAdjustment = {
        shouldAdjust: false,
        suggestedChange: 0,
        reason: "Số ngày hiện tại phù hợp với số lượng đề tài.",
      };
    }
  }

  return {
    minimumDaysRequired,
    recommendedDays,
    currentSessionDays,
    sessionDayAdjustment,
    minLecturersRequired,
    recommendedLecturers,
    maxLecturersNeeded,
    topicsPerCouncilPerDay: {
      minimum: minTopicsPerCouncilPerDay,
      maximum: maxTopicsPerCouncilPerDay,
      average: avgTopicsPerCouncilPerDay,
    },
    councilsPerDay,
    lecturerWorkload,
  };
}

/**
 * Generate reason for session day adjustment
 */
function generateAdjustmentReason(
  currentDays: number,
  recommendedDays: number,
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
  const { currentSessionDays, minimumDaysRequired, councilsPerDay } =
    recommendations;

  // Warning if no topics
  if (totalTopics === 0) {
    warnings.push("Học kỳ chưa có đề tài nào. Vui lòng import đề tài trước.");
  }

  // Warning if session days insufficient
  if (currentSessionDays !== null && currentSessionDays < minimumDaysRequired) {
    warnings.push(
      `Session hiện tại chỉ có ${currentSessionDays} ngày, không đủ để chấm ${totalTopics} đề tài (cần tối thiểu ${minimumDaysRequired} ngày).`
    );
  }

  // Warning if too many topics
  if (totalTopics > 200) {
    warnings.push(
      `Số lượng đề tài rất lớn (${totalTopics}). Cần lập kế hoạch kỹ lưỡng và đảm bảo đủ giảng viên tham gia.`
    );
  }

  // Warning if too many councils per day
  if (councilsPerDay > 5) {
    warnings.push(
      `Cần chạy ${councilsPerDay} hội đồng mỗi ngày, có thể gây khó khăn về logistics và phòng học.`
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
  const { totalTopics, councilSize } = analysis;
  const {
    recommendedLecturers,
    topicsPerCouncilPerDay,
    sessionDayAdjustment,
    currentSessionDays,
    recommendedDays,
  } = recommendations;

  // Suggest lecturer count
  if (totalTopics > 0) {
    suggestions.push(
      `Nên có ít nhất ${recommendedLecturers} giảng viên tham gia để cân bằng workload (mỗi hội đồng cần ${councilSize} thành viên).`
    );
  }

  // Suggest topics per council per day
  suggestions.push(
    `Mỗi hội đồng nên chấm khoảng ${topicsPerCouncilPerDay.minimum}-${topicsPerCouncilPerDay.maximum} đề tài mỗi ngày.`
  );

  // Suggest session day adjustment
  if (sessionDayAdjustment?.shouldAdjust) {
    const change = sessionDayAdjustment.suggestedChange;
    if (change > 0) {
      suggestions.push(
        `Đề xuất tăng số ngày từ ${currentSessionDays} lên ${recommendedDays} ngày để giảm áp lực cho giảng viên và hội đồng.`
      );
    } else {
      suggestions.push(
        `Có thể giảm số ngày từ ${currentSessionDays} xuống ${recommendedDays} ngày để tối ưu hóa thời gian.`
      );
    }
  }

  // Suggest buffer days for large sessions
  if (totalTopics > 100 && recommendedDays < 5) {
    suggestions.push(
      `Với ${totalTopics} đề tài, nên cân nhắc thêm 1-2 ngày dự phòng để xử lý các trường hợp bất ngờ.`
    );
  }

  return suggestions;
}
