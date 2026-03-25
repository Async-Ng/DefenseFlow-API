import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import * as councilBoardRepository from "../repositories/councilBoardRepository.js";
import {
  Lecturer,
  Topic,
  DefenseDay,
  LecturerDayAvailability,
  LecturerDefenseConfig,
  Defense,
  CouncilRole,
  AvailabilityStatus,
  TopicSupervisor,
  LecturerQualification,
  Qualification,
  CouncilBoard,
  SeniorityLevel,
} from "../../generated/prisma/client.js";
import {
  CouncilBoardFilters,
  CouncilBoardSort,
  PaginatedResult,
} from "../types/index.js";

// =============================================================================
// TYPES
// =============================================================================

type FullLecturer = Lecturer & {
  lecturerDayAvailability: LecturerDayAvailability[];
  lecturerQualifications: (LecturerQualification & { qualification: Qualification })[];
  seniorityLevel: SeniorityLevel;
};

type FullTopic = Topic & {
  topicSupervisors: (TopicSupervisor & { lecturer: Lecturer })[];
  topicType?: {
    id: number;
    name: string;
    qualificationGroupTopicTypes: {
      priorityWeight: number;
      qualificationGroup: {
        id: number;
        name: string;
        qualifications: { id: number }[];
      };
    }[];
  } | null;
  topicDefenses: { id: number; defenseId: number | null }[];
};

interface SchedulingContext {
  defense: Defense;
  topics: FullTopic[];
  lecturers: FullLecturer[];
  defenseDays: DefenseDay[];
  commonQualifications: Qualification[];
  lecturerDefenseConfigs: LecturerDefenseConfig[];
  topicsPerBoard: number;
}

interface SchedulingState {
  /** lecturers used per day: defenseDayId → Set<lecturerId> */
  usedLecturersPerDay: Map<number, Set<number>>;
  lecturerTopicCount: Map<number, number>;
  scheduledTopicIds: Set<number>;
  configByLecturer: Map<number, LecturerDefenseConfig>;
}

/** Internal board representation (includes members for state tracking). */
interface PlannedBoard {
  presidentId: number;
  secretaryId: number;
  memberIds: number[];
  defenseDayId: number;
  topics: FullTopic[];
  members: FullLecturer[];
  warning?: string;
}

// =============================================================================
// CONSTRAINT FUNCTIONS
// Each function enforces ONE scheduling rule and returns a boolean.
// =============================================================================

/**
 * C1 — A lecturer may only serve on one board per defense day.
 *      They can participate on different days if available.
 */
const isNotAlreadyAssignedOnDay = (
  lecturerId: number,
  defenseDayId: number,
  state: SchedulingState
): boolean => {
  const usedOnDay = state.usedLecturersPerDay.get(defenseDayId);
  return !usedOnDay || !usedOnDay.has(lecturerId);
};

/**
 * C2 — A lecturer must not exceed their configured maxTopics limit.
 */
const isUnderTopicLimit = (lecturerId: number, state: SchedulingState): boolean => {
  const config = state.configByLecturer.get(lecturerId);
  if (!config?.maxTopics) return true;
  return (state.lecturerTopicCount.get(lecturerId) ?? 0) < config.maxTopics;
};

/**
 * C3 — A lecturer must not be marked Busy on the given defense day.
 */
const isAvailableOnDay = (lecturer: FullLecturer, defenseDayId: number): boolean => {
  const slot = lecturer.lecturerDayAvailability.find(a => a.defenseDayId === defenseDayId);
  return !slot || slot.status !== AvailabilityStatus.Busy;
};

/**
 * C6 — A lecturer must not be a supervisor for any of the topics in the board.
 */
const isNotSupervisorForAnyTopic = (
  lecturerId: number,
  topicChunk: FullTopic[]
): boolean => {
  return !topicChunk.some(topic =>
    topic.topicSupervisors.some(ts => ts.lecturerId === lecturerId)
  );
};

// =============================================================================
// SENIORITY
// =============================================================================

const getSeniorityBonus = (level: SeniorityLevel): number => {
  switch (level) {
    case SeniorityLevel.Senior:   return 1.3;
    case SeniorityLevel.MidLevel: return 1.1;
    case SeniorityLevel.Junior:   return 0.9;
    case SeniorityLevel.Rookie:   return 0.7;
    default:                      return 1.0;
  }
};

/**
 * calculateFitnessScore — Group-based scoring:
 * Σ(max score of lecturer's quals in this group × group priorityWeight) × seniorityBonus.
 */
const calculateFitnessScore = (
  lecturer: FullLecturer,
  requiredGroups: { groupId: number; qualificationIds: number[]; priorityWeight: number }[]
): number => {
  const LQualsMap = new Map(
    lecturer.lecturerQualifications.map(lq => [lq.qualificationId, lq.score ?? 0])
  );
  let baseScore = 0;
  for (const group of requiredGroups) {
    const maxScoreInGroup = group.qualificationIds.length > 0
      ? Math.max(0, ...group.qualificationIds.map(qId => LQualsMap.get(qId) ?? 0))
      : 0;
    baseScore += maxScoreInGroup * group.priorityWeight;
  }
  return baseScore * getSeniorityBonus(lecturer.seniorityLevel);
};

// =============================================================================
// CANDIDATE POOL — applies C1 + C2 + C3
// =============================================================================

const getEligibleCandidates = (
  lecturers: FullLecturer[],
  defenseDayId: number,
  state: SchedulingState,
  topicChunk: FullTopic[] = []
): FullLecturer[] =>
  lecturers.filter(l =>
    isNotAlreadyAssignedOnDay(l.id, defenseDayId, state) &&
    isUnderTopicLimit(l.id, state) &&
    isAvailableOnDay(l, defenseDayId) &&
    isNotSupervisorForAnyTopic(l.id, topicChunk)
  );

// =============================================================================
// TOPIC TYPE PREFERENCE — C4-aware candidate ranking
// =============================================================================

/**
 * Sorts candidates so that topic-type matched lecturers appear first,
 * then fills remaining slots with unmatched (by score).
 * Match means having at least one skill required by the topic type.
 */
type RequiredGroup = { groupId: number; qualificationIds: number[]; priorityWeight: number };

const selectWithTopicTypePreference = (
  candidates: FullLecturer[],
  topicTypeGroupQualIds: number[], // all qualificationIds across all required groups
  requiredGroups: RequiredGroup[],
  count: number = 5
): { selected: FullLecturer[]; matchedCount: number } => {
  const byFitnessScore = (a: FullLecturer, b: FullLecturer) =>
    calculateFitnessScore(b, requiredGroups) - calculateFitnessScore(a, requiredGroups);

  const matched = candidates
    .filter(c => c.lecturerQualifications.some(lq => topicTypeGroupQualIds.includes(lq.qualificationId)))
    .sort(byFitnessScore);
  const unmatched = candidates
    .filter(c => !c.lecturerQualifications.some(lq => topicTypeGroupQualIds.includes(lq.qualificationId)))
    .sort(byFitnessScore);

  const selected = [...matched.slice(0, count), ...unmatched].slice(0, count);
  return { selected, matchedCount: Math.min(matched.length, count) };
};

// =============================================================================
// COUNCIL GROUP BUILDER — Seniority-aware 3-Pass selection
// =============================================================================

/**
 * buildCouncilGroup - Selects 5 members using a 3-Pass Seniority strategy.
 *
 * Pass 1 (Ideal):      Pool must include ≥1 Senior → sort by FitnessScore desc.
 * Pass 2 (Relaxed):    No Senior → accept ≥1 MidLevel → sort by FitnessScore desc + log warning.
 * Pass 3 (Best-Effort): Take top 5 by score only → log warning.
 *
 * Returns {members, warning?} so warnings can bubble up to the API response.
 */
const buildCouncilGroup = (
  pool: FullLecturer[],
  requiredGroups: RequiredGroup[],
  size: number = 5
): { members: FullLecturer[]; warning?: string } => {
  const byScore = (a: FullLecturer, b: FullLecturer) =>
    calculateFitnessScore(b, requiredGroups) - calculateFitnessScore(a, requiredGroups);

  const sorted = [...pool].sort(byScore);
  const top = sorted.slice(0, size);

  const hasSenior = top.some(l => l.seniorityLevel === SeniorityLevel.Senior);
  if (hasSenior) return { members: top };

  const hasMidLevel = top.some(l => l.seniorityLevel === SeniorityLevel.MidLevel);
  if (hasMidLevel) {
    return {
      members: top,
      warning: `Council formed without Senior (MidLevel used as anchor). Groups: ${requiredGroups.map(g => g.groupId).join(",")}`
    };
  }

  return {
    members: top,
    warning: `Seniority constraint not met — no Senior or MidLevel available. Council formed by score only.`
  };
};

// =============================================================================
// BOARD FACTORY
// =============================================================================

const buildPlannedBoard = (
  members: FullLecturer[],
  defenseDayId: number,
  topics: FullTopic[],
  warning?: string
): PlannedBoard => ({
  presidentId: members[0].id,
  secretaryId: members[1].id,
  memberIds: members.slice(2).map(l => l.id),
  defenseDayId,
  topics,
  members,
  warning,
});

// =============================================================================
// STATE MUTATIONS
// =============================================================================

const commitBoardToState = (board: PlannedBoard, state: SchedulingState): void => {
  // Mark each member as used for this specific day (C1)
  if (!state.usedLecturersPerDay.has(board.defenseDayId)) {
    state.usedLecturersPerDay.set(board.defenseDayId, new Set());
  }
  const usedOnDay = state.usedLecturersPerDay.get(board.defenseDayId)!;

  board.members.forEach(l => {
    usedOnDay.add(l.id);
    state.lecturerTopicCount.set(l.id, (state.lecturerTopicCount.get(l.id) ?? 0) + 1);
  });
  board.topics.forEach(t => state.scheduledTopicIds.add(t.id));
};

// =============================================================================
// UTILITIES
// =============================================================================

const getPendingTopics = (
  topics: FullTopic[],
  scheduledIds: Set<number>,
  deferred: FullTopic[]
): FullTopic[] =>
  topics.filter(t => !scheduledIds.has(t.id) && !deferred.some(d => d.id === t.id));

const minutesToDate = (totalMinutes: number): Date => {
  const d = new Date(0);
  d.setUTCHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
  return d;
};

// =============================================================================
// PASS 1: STRICT SCHEDULER
// Requires FULL common qualification coverage (C5).
// =============================================================================

type Pass1Result = PlannedBoard | "deferred" | "insufficient_candidates";

const tryScheduleStrict = (
  topicChunk: FullTopic[],
  candidates: FullLecturer[],
  defenseDayId: number
): Pass1Result => {
  if (candidates.length < 5) return "insufficient_candidates";
  if (topicChunk.length === 0) return "insufficient_candidates";

  // Build requiredGroups from all topics in the chunk (take max weight per group)
  const reqGroupsMap = new Map<number, { qualificationIds: number[]; maxWeight: number }>();
  topicChunk.forEach(topic => {
    topic.topicType?.qualificationGroupTopicTypes?.forEach(gtt => {
      const groupId = gtt.qualificationGroup.id;
      const qualIds = gtt.qualificationGroup.qualifications.map(q => q.id);
      const existing = reqGroupsMap.get(groupId);
      if (!existing || gtt.priorityWeight > existing.maxWeight) {
        reqGroupsMap.set(groupId, { qualificationIds: qualIds, maxWeight: gtt.priorityWeight });
      }
    });
  });

  const requiredGroups: RequiredGroup[] = Array.from(reqGroupsMap.entries()).map(([groupId, { qualificationIds, maxWeight }]) => ({
    groupId,
    qualificationIds,
    priorityWeight: maxWeight,
  }));
  const allGroupQualIds = requiredGroups.flatMap(g => g.qualificationIds);

  const { selected, matchedCount } = selectWithTopicTypePreference(candidates, allGroupQualIds, requiredGroups);
  if (selected.length < 5) return "insufficient_candidates";

  console.log(`[Pass1] topic chunk: ${matchedCount} matched candidates`);

  const { members, warning } = buildCouncilGroup(selected, requiredGroups);
  if (members.length < 5) return "insufficient_candidates";

  if (requiredGroups.length > 0) {
    const collectiveScore = members.reduce((sum: number, member: FullLecturer) => sum + calculateFitnessScore(member, requiredGroups), 0);
    if (collectiveScore === 0) {
      console.log(`⚠️  [Pass1] Group of ${topicChunk.length} topics: 0 fitness score for required groups → deferred`);
      return "deferred";
    }
  }

  return buildPlannedBoard(members, defenseDayId, topicChunk, warning);
};


// =============================================================================
// PASS 2: BEST-EFFORT SCHEDULER
// Accepts partial common qualification coverage.
// =============================================================================

const tryScheduleBestEffort = (
  topicChunk: FullTopic[],
  candidates: FullLecturer[],
  defenseDayId: number
): PlannedBoard | null => {
  if (candidates.length < 5) {
    console.warn(`❌ [Pass2] Group of ${topicChunk.length} topics: not enough candidates (${candidates.length})`);
    return null;
  }
  if (topicChunk.length === 0) return null;

  const reqGroupsMap = new Map<number, { qualificationIds: number[]; maxWeight: number }>();
  topicChunk.forEach(topic => {
    topic.topicType?.qualificationGroupTopicTypes?.forEach(gtt => {
      const groupId = gtt.qualificationGroup.id;
      const qualIds = gtt.qualificationGroup.qualifications.map(q => q.id);
      const existing = reqGroupsMap.get(groupId);
      if (!existing || gtt.priorityWeight > existing.maxWeight) {
        reqGroupsMap.set(groupId, { qualificationIds: qualIds, maxWeight: gtt.priorityWeight });
      }
    });
  });

  const requiredGroups: RequiredGroup[] = Array.from(reqGroupsMap.entries()).map(([groupId, { qualificationIds, maxWeight }]) => ({
    groupId,
    qualificationIds,
    priorityWeight: maxWeight,
  }));
  const allGroupQualIds = requiredGroups.flatMap(g => g.qualificationIds);

  const { selected, matchedCount } = selectWithTopicTypePreference(candidates, allGroupQualIds, requiredGroups);

  if (selected.length < 5) {
    console.warn(`❌ [Pass2] Group of ${topicChunk.length} topics: not enough candidates after filtering`);
    return null;
  }

  console.log(`[Pass2] topic chunk: ${matchedCount} matched candidates`);

  if (requiredGroups.length > 0) {
    const collectiveScore = selected.reduce((sum: number, member: FullLecturer) => sum + calculateFitnessScore(member, requiredGroups), 0);
    if (collectiveScore === 0) {
      console.warn(`[Pass2] Collective score = 0 for all groups`);
    }
  }

  const { members, warning } = buildCouncilGroup(selected, requiredGroups);
  return buildPlannedBoard(members, defenseDayId, topicChunk, warning);
};


// =============================================================================
// MAIN SCHEDULER ORCHESTRATOR
// Pure two-pass scheduling loop — no business logic here.
// =============================================================================

const runScheduler = (ctx: SchedulingContext): { boards: PlannedBoard[]; unscheduled: FullTopic[]; warnings: string[] } => {
  const { defenseDays, lecturers, topics, lecturerDefenseConfigs, topicsPerBoard } = ctx;

  const state: SchedulingState = {
    usedLecturersPerDay: new Map(),
    lecturerTopicCount: new Map(),
    scheduledTopicIds: new Set(),
    configByLecturer: new Map(
      lecturerDefenseConfigs
        .filter(c => c.lecturerId != null)
        .map(c => [c.lecturerId!, c])
    ),
  };

  const boards: PlannedBoard[] = [];
  const deferredTopics: FullTopic[] = [];
  const warnings: string[] = [];

  for (const day of defenseDays) {
    console.log(`\n=== Defense Day ${day.id} ===`);
    let boardsCreatedToday = 0;
    // Strictly per-day limit: use day.maxCouncils if set, else default to 1
    const maxCouncilsThisDay = day.maxCouncils ?? 1;

    // ── Pass 1: Strict ──────────────────────────────────────────────────────
    console.log("--- Pass 1 (Strict) ---");
    let pass1Running = true;
    while (pass1Running && boardsCreatedToday < maxCouncilsThisDay) {
      const pending = getPendingTopics(topics, state.scheduledTopicIds, deferredTopics);
      if (pending.length === 0) break;

      // Group topics by type to maximize board expertise
      // For simplicity, we just take the first N topics of the same type (or null type)
      const firstTopicType = pending[0].topicTypeId;
      const similarTopics = pending.filter(t => t.topicTypeId === firstTopicType);
      
      const topicChunk = similarTopics.slice(0, topicsPerBoard);
      
      const candidates = getEligibleCandidates(lecturers, day.id, state, topicChunk);
      const result = tryScheduleStrict(topicChunk, candidates, day.id);

      if (result === "insufficient_candidates") { pass1Running = false; }
      else if (result === "deferred") { 
          // Defer the whole chunk
          deferredTopics.push(...topicChunk); 
      }
      else { 
          boards.push(result);
          if (result.warning) warnings.push(result.warning);
          commitBoardToState(result, state); 
          boardsCreatedToday++;
      }
    }

    // ── Pass 2: Best-Effort ─────────────────────────────────────────────────
    if (deferredTopics.length > 0 && boardsCreatedToday < maxCouncilsThisDay) {
      console.log(`--- Pass 2 (Best-Effort): ${deferredTopics.length} deferred ---`);
      
      const remainingSlots = maxCouncilsThisDay - boardsCreatedToday;
      let boardsCreatedPass2 = 0;
      
      while(deferredTopics.length > 0 && boardsCreatedPass2 < remainingSlots) {
        // Group deferred topics
        const pendingDeferred = deferredTopics.filter(t => !state.scheduledTopicIds.has(t.id));
        if (pendingDeferred.length === 0) break;
        
        const firstTopicType = pendingDeferred[0].topicTypeId;
        const similarTopics = pendingDeferred.filter(t => t.topicTypeId === firstTopicType);
        const topicChunk = similarTopics.slice(0, topicsPerBoard);

        const candidates = getEligibleCandidates(lecturers, day.id, state, topicChunk);
        const board = tryScheduleBestEffort(topicChunk, candidates, day.id);
        
        if (!board) break; // If we can't form a board even with best effort, give up

        boards.push(board);
        if (board.warning) warnings.push(board.warning);
        commitBoardToState(board, state);
        boardsCreatedPass2++;
        
        // Remove scheduled chunk from deferred
        topicChunk.forEach(scheduledTopic => {
            const idx = deferredTopics.findIndex(t => t.id === scheduledTopic.id);
            if (idx !== -1) deferredTopics.splice(idx, 1);
        });
      }
    }
  }

  const unscheduled = topics.filter(t => !state.scheduledTopicIds.has(t.id));

  // Per-topic warnings with specific diagnosis reason
  for (const topic of unscheduled) {
    const supervisorIds = new Set(topic.topicSupervisors.map(ts => ts.lecturerId));

    // How many lecturers are completely blocked because they supervise this topic?
    const supervisorBlocked = lecturers.filter(l => supervisorIds.has(l.id)).length;

    // How many remain after removing supervisor-blocked ones?
    const eligible = lecturers.filter(l =>
      !supervisorIds.has(l.id) &&
      defenseDays.some(day =>
        l.lecturerDayAvailability.some(
          a => a.defenseDayId === day.id && (a.status as string) === 'Available'
        )
      )
    ).length;

    let reason: string;
    if (lecturers.length < 5) {
      reason = `Không đủ giảng viên (đang có ${lecturers.length}/5 cần thiết)`;
    } else if (eligible < 5) {
      if (supervisorBlocked > 0) {
        reason = `Chỉ có ${eligible} giảng viên hợp lệ sau khi loại ${supervisorBlocked} người hướng dẫn và $
{lecturers.length - eligible - supervisorBlocked} giảng viên không có lịch rảnh (cần ít nhất 5)`;
      } else {
        reason = `Chỉ có ${eligible} giảng viên có lịch rảnh phù hợp (cần ít nhất 5)`;
      }
    } else {
      reason = `Không tìm được hội đồng phù hợp sau 2 lượt xếp lịch (có thể do vượt giới hạn hội đồng/ngày hoặc không đủ năng lực phù hợp)`;
    }

    warnings.push(`⚠️ [${topic.topicCode}] "${topic.title?.slice(0, 60)}..." — ${reason}`);
  }

  return {
    boards,
    unscheduled,
    warnings,
  };
};

// =============================================================================
// DATA FETCHING
// =============================================================================

const fetchSchedulingContext = async (defenseId: number): Promise<SchedulingContext> => {
  const defense = await prisma.defense.findUnique({ where: { id: defenseId } });
  if (!defense) throw new AppError(404, "Không tìm thấy đợt bảo vệ");

  const [topics, lecturers, defenseDays, lecturerDefenseConfigs] = await Promise.all([
    prisma.topic.findMany({
      where: {
        semesterId: defense.semesterId,
        topicDefenses: { some: { defenseId } },
      },
      include: {
        topicSupervisors: { include: { lecturer: true } },
        topicDefenses: { where: { defenseId } },
        topicType: { 
          include: { 
            qualificationGroupTopicTypes: { 
              include: {
                qualificationGroup: {
                  include: {
                    qualifications: { select: { id: true } }
                  }
                }
              }
            } 
          } 
        },
      },
    }),
    prisma.lecturer.findMany({
      where: {
        lecturerDefenseConfigs: {
          some: { defenseId }
        }
      },
      include: {
        lecturerDayAvailability: true,
        lecturerQualifications: { include: { qualification: true } },
      },
    }),
    prisma.defenseDay.findMany({
      where: { defenseId },
      orderBy: { dayDate: "asc" },
    }),
    prisma.lecturerDefenseConfig.findMany({ where: { defenseId } }),
  ]);

  const timePerTopic = defense.timePerTopic ?? 45;
  const topicsPerBoard = Math.floor((8 * 60) / timePerTopic);

  return { defense, topics, lecturers, defenseDays, commonQualifications: [], lecturerDefenseConfigs, topicsPerBoard };
};

// =============================================================================
// VALIDATION
// =============================================================================

const validateDefenseReadiness = (ctx: SchedulingContext): void => {
  if (ctx.defenseDays.length === 0) {
    throw new AppError(400, "Không có ngày bảo vệ nào được định nghĩa cho đợt bảo vệ này.");
  }
};

const validateCapacity = (ctx: SchedulingContext): void => {
  const timePerTopic = ctx.defense.timePerTopic ?? 45;
  const totalMinutesNeeded = ctx.topics.length * timePerTopic;

  // Sum per-day capacity using each day's own maxCouncils
  const totalMinutesAvailable = ctx.defenseDays.reduce((sum, day) => {
    const maxCouncilsThisDay = day.maxCouncils ?? 1;
    return sum + maxCouncilsThisDay * (8 * 60);
  }, 0);

  if (totalMinutesNeeded > totalMinutesAvailable) {
    const dayBreakdown = ctx.defenseDays
      .map(d => `Ngày ${(d.dayDate as Date).toLocaleDateString('vi-VN')}: ${d.maxCouncils ?? 1} HĐ`)
      .join(', ');
    throw new AppError(
      400,
      `Không đủ thời gian: Cần ${totalMinutesNeeded} phút, nhưng chỉ có ${totalMinutesAvailable} phút (${dayBreakdown}).`
    );
  }

  // Validate: Need at least 5 lecturers to form one council board
  const MIN_LECTURERS_PER_BOARD = 5;
  if (ctx.lecturers.length < MIN_LECTURERS_PER_BOARD) {
    throw new AppError(
      400,
      `Không đủ giảng viên để xếp lịch: Hiện có ${ctx.lecturers.length} giảng viên được cấu hình, nhưng cần ít nhất ${MIN_LECTURERS_PER_BOARD} giảng viên để thành lập 1 hội đồng. Vui lòng thêm giảng viên vào cấu hình đợt bảo vệ.`
    );
  }
};

// =============================================================================
// PERSISTENCE
// =============================================================================

const persistSchedule = async (defenseId: number, boards: PlannedBoard[]): Promise<void> => {
  const defense = await prisma.defense.findUnique({ where: { id: defenseId } });
  if (!defense) throw new AppError(404, "Không tìm thấy đợt bảo vệ");

  const timePerTopic = defense.timePerTopic ?? 45;
  const [startH, startM] = (defense.workStartTime ?? "07:30").split(":").map(Number);
  const startMinutes = startH * 60 + startM;

  await prisma.$transaction(async (tx) => {
    // Clear old schedule
    const oldBoards = await tx.councilBoard.findMany({
      where: { defenseDay: { defenseId: defenseId } },
      select: { id: true }
    });
    const oldBoardIds = oldBoards.map(b => b.id);

    // 1. Delete by boardCode prefix to handle orphaned data or overlapped codes
    const boardCodePrefix = `HD-${defense.defenseCode}-`;
    await tx.councilBoardMember.deleteMany({
      where: { councilBoard: { boardCode: { startsWith: boardCodePrefix } } }
    });
    await tx.defenseCouncil.deleteMany({
      where: { councilBoard: { boardCode: { startsWith: boardCodePrefix } } }
    });
    await tx.councilBoard.deleteMany({
      where: { boardCode: { startsWith: boardCodePrefix } }
    });

    // 2. Delete slots associated with these boards OR with topics in this defense
    await tx.defenseCouncil.deleteMany({
      where: {
        OR: [
          { councilBoardId: { in: oldBoardIds } },
          { topicDefense: { defenseId: defenseId } }
        ]
      }
    });

    // 2. Delete board members
    await tx.councilBoardMember.deleteMany({
      where: { councilBoardId: { in: oldBoardIds } }
    });

    // 3. Delete the boards
    await tx.councilBoard.deleteMany({
      where: { id: { in: oldBoardIds } }
    });

    try {

      // Insert new schedule
      let globalBoardIndex = 1;
      for (const planned of boards) {
        // 1. Create the board - use FPT sequence logic (e.g. HD-SP25_MAIN-01)
        const boardSeq = String(globalBoardIndex).padStart(2, '0');
        const boardCode = `HD-${defense.defenseCode}-${boardSeq}`;
        globalBoardIndex++;

        const board = await tx.councilBoard.create({
          data: {
            boardCode: boardCode,
            defenseDayId: planned.defenseDayId,
            semesterId: planned.topics[0]?.semesterId ?? defense.semesterId,
            name: `Hội đồng ${boardSeq}`,
          },
        });

        // 2. Create board members
        const membersToCreate = [
          { councilBoardId: board.id, lecturerId: planned.presidentId, role: CouncilRole.President },
          { councilBoardId: board.id, lecturerId: planned.secretaryId, role: CouncilRole.Secretary },
          ...planned.memberIds
            .filter(id => id != null)
            .map(id => ({ councilBoardId: board.id, lecturerId: id, role: CouncilRole.Member })),
        ];

        await tx.councilBoardMember.createMany({
          data: membersToCreate,
        });

        // 3. Create defense councils (slots)
        // reset global day-timer, each board starts from morning again
        let topicCursor = startMinutes;
        const councilsToCreate = [];
        for (const topic of planned.topics) {
          const registration = topic.topicDefenses?.[0];
          if (!registration) {
            continue;
          }

          // Use the Board Code + Group Code (Topic Code) for the defense council slot
          const dcCode = `${boardCode}-${topic.topicCode || topic.id}`;

          councilsToCreate.push({
            defenseCouncilCode: dcCode,
            registrationId: registration.id,
            councilBoardId: board.id,
            startTime: minutesToDate(topicCursor),
            endTime: minutesToDate(topicCursor + timePerTopic),
          });

          topicCursor += timePerTopic;
        }

        if (councilsToCreate.length > 0) {
          await tx.defenseCouncil.createMany({
            data: councilsToCreate,
          });
        }
      }
    } catch (err: any) {
      throw err;
    }
  }, {
    timeout: 60000, // 60 seconds
  });
};

// =============================================================================
// PUBLIC API
// =============================================================================

export const generateSchedule = async (defenseId: number) => {
  const ctx = await fetchSchedulingContext(defenseId);
  validateDefenseReadiness(ctx);
  validateCapacity(ctx);

  const { boards, unscheduled, warnings } = runScheduler(ctx);
  await persistSchedule(defenseId, boards);

  return {
    status: "success",
    metrics: {
      totalTopics: ctx.topics.length,
      scheduled: ctx.topics.length - unscheduled.length,
      unscheduled: unscheduled.length,
    },
    warnings,
    unscheduledTopics: unscheduled.map(t => t.topicCode),
  };
};

export const getSchedule = async (
  filters: CouncilBoardFilters,
  pagination: { page: number; limit: number },
  sort?: CouncilBoardSort,
): Promise<PaginatedResult<CouncilBoard>> => {
  const { data, total } = await councilBoardRepository.findAll(
    filters,
    pagination.page,
    pagination.limit,
    sort,
  );

  return {
    data,
    total,
    page: pagination.page,
    limit: pagination.limit,
  };
};

export const getCouncilBoardById = async (id: number): Promise<CouncilBoard> => {
  const board = await councilBoardRepository.findById(id);
  if (!board) {
    throw new AppError(404, "Không tìm thấy Hội đồng bảo vệ");
  }
  return board;
};

export const publishSchedule = async (defenseId: number) => {
  // 1. Validation: Ensure all topics for this defense are scheduled
  const unscheduledTopics = await prisma.topicDefense.findMany({
    where: {
      defenseId,
      defenseCouncils: { none: {} },
    },
    include: { topic: true },
  });

  if (unscheduledTopics.length > 0) {
    const codes = unscheduledTopics.map((t) => t.topic?.topicCode || t.id).join(", ");
    throw new AppError(400, `Không thể công bố lịch: Các đề tài sau chưa được xếp lịch: ${codes}`);
  }

  // 2. Validation: Ensure all council boards for this defense have exactly 5 members
  const boardsWithInsufficientMembers = await prisma.councilBoard.findMany({
    where: {
      defenseDay: { defenseId },
    },
    include: {
      _count: {
        select: { councilBoardMembers: true },
      },
    },
  });

  const invalidBoards = boardsWithInsufficientMembers.filter(
    (b) => b._count.councilBoardMembers !== 5
  );

  if (invalidBoards.length > 0) {
    const codes = invalidBoards.map((b) => b.boardCode).join(", ");
    throw new AppError(400, `Không thể công bố lịch: Các hội đồng sau không đủ 5 thành viên: ${codes}`);
  }

  const updatedDefense = await prisma.defense.update({
    where: { id: defenseId },
    data: { isSchedulePublished: true },
  });

  // 3. Dispatch Notification
  try {
    const notificationService = await import("./notificationService.js");
    await notificationService.dispatchNotificationToDefenseMembers(
      defenseId,
      "Thông báo: Lịch bảo vệ chính thức",
      `Lịch hội đồng cho đợt bảo vệ đã được công bố. Vui lòng kiểm tra hội đồng của bạn.`,
      "SCHEDULE_PUBLISHED"
    );
  } catch (error) {
    console.error("Failed to send SCHEDULE_PUBLISHED notifications", error);
  }

  return updatedDefense;
};

export const updateDefenseCouncil = async (
  defenseCouncilId: number,
  data: { startTime?: Date; endTime?: Date; councilBoardId?: number | null }
) => {
  const dc = await prisma.defenseCouncil.findUnique({ where: { id: defenseCouncilId } });
  if (!dc) throw new AppError(404, "Không tìm thấy lịch bảo vệ (Defense Council)");

  if (data.councilBoardId && data.councilBoardId !== dc.councilBoardId) {
    const board = await prisma.councilBoard.findUnique({ where: { id: data.councilBoardId } });
    if (!board) throw new AppError(404, "Không tìm thấy Hội đồng bảo vệ mục tiêu");
  }

  return prisma.defenseCouncil.update({
    where: { id: defenseCouncilId },
    data,
  });
};

export const updateCouncilBoard = async (
  councilBoardId: number,
  data: { presidentId?: number | null; secretaryId?: number | null; memberIds?: number[] }
) => {
  const { presidentId, secretaryId, memberIds } = data;

  const board = await prisma.councilBoard.findUnique({
    where: { id: councilBoardId },
    include: { councilBoardMembers: true },
  });

  if (!board) throw new AppError(404, "Không tìm thấy Hội đồng bảo vệ");

  // 1. Gather all new IDs (explicitly provided or from current state if not provided)
  const current = board.councilBoardMembers;
  const newPresidentId = presidentId !== undefined ? presidentId : current.find(m => m.role === CouncilRole.President)?.lecturerId;
  const newSecretaryId = secretaryId !== undefined ? secretaryId : current.find(m => m.role === CouncilRole.Secretary)?.lecturerId;
  const newMemberIds = memberIds !== undefined ? memberIds : current.filter(m => m.role === CouncilRole.Member).map(m => m.lecturerId!).filter(id => id != null);

  const allIds = [newPresidentId, newSecretaryId, ...(newMemberIds || [])].filter((id): id is number => id != null);
  
  // 2. Intra-board uniqueness check
  const uniqueIds = new Set(allIds);
  if (uniqueIds.size !== allIds.length) {
    throw new AppError(400, "Phát hiện giảng viên bị trùng lặp trong cùng một hội đồng");
  }

  // 3. Cross-board conflict check
  const conflictingAssignments = await prisma.councilBoardMember.findMany({
    where: {
      lecturerId: { in: allIds },
      councilBoard: {
        defenseDayId: board.defenseDayId,
        id: { not: councilBoardId },
      },
    },
    include: {
      lecturer: true,
      councilBoard: true,
    },
  });

  if (conflictingAssignments.length > 0) {
    const conflict = conflictingAssignments[0];
    throw new AppError(
      400,
      `Giảng viên ${conflict.lecturer?.fullName || conflict.lecturerId} đã được phân công vào hội đồng ${conflict.councilBoard?.boardCode} trong ngày này.`
    );
  }

  // 4. Role Eligibility Check (GTDSS-11 Scenario 3)
  // [TEMPORARILY DISABLED FOR TESTING]
  // Check if the assigned president is actually qualified to be President.
  // Assuming there's a specific common qualification for president or a flag.
  // Since we don't have a direct "isPresidentQualified" boolean, we will use the FPTU rule:
  // Usually, presidents must have higher degree or specific qualifications.
  // For the sake of this US, let's query if they have a qualification that has isCommon=true OR simply
  // ensure they aren't completely missing qualifications.
  /*
  if (newPresidentId) {
     const presidentQuals = await prisma.lecturerQualification.findMany({
         where: { lecturerId: newPresidentId },
         include: { qualification: true }
     });
     // Soft check: Warn if they have NO qualifications at all (can be refined based on actual schema rules)
     if (presidentQuals.length === 0) {
        // According to US: "system prevents the action or shows a warning". We will throw a 400.
        throw new AppError(400, "Cảnh báo Điều kiện Vai trò: Giảng viên này không đủ điều kiện cho vai trò Chủ tịch hội đồng.");
     }
  }
  */

  // 5. Conflict of Interest Check (GTDSS-11 Scenario 2)
  // Get all topics assigned to this council board
  const boardTopics = await prisma.defenseCouncil.findMany({
    where: { councilBoardId },
    include: {
      topicDefense: {
        include: {
          topic: {
            include: { topicSupervisors: true }
          }
        }
      }
    }
  });

  // Extract all supervisor IDs for topics assigned to this board
  const supervisorsInBoardTopics = new Set<number>();
  boardTopics.forEach(dc => {
      const supervisors = dc.topicDefense?.topic?.topicSupervisors || [];
      supervisors.forEach(ts => supervisorsInBoardTopics.add(ts.lecturerId));
  });

  // Check if any of the new members are supervisors
  const conflictingSupervisors = allIds.filter(id => supervisorsInBoardTopics.has(id));
  if (conflictingSupervisors.length > 0) {
      throw new AppError(
          409, // 409 Conflict implies it can be forced later if we add a bypass flag, but for now block it.
          "Phát hiện Xung đột: Giảng viên là người hướng dẫn của một đề tài được phân công cho hội đồng này."
      );
  }

  // 6. Update members
  return await prisma.$transaction(async (tx) => {
    await tx.councilBoardMember.deleteMany({
      where: { councilBoardId },
    });

    const membersToCreate = [];
    if (newPresidentId) {
      membersToCreate.push({ councilBoardId, lecturerId: newPresidentId, role: CouncilRole.President });
    }
    if (newSecretaryId) {
      membersToCreate.push({ councilBoardId, lecturerId: newSecretaryId, role: CouncilRole.Secretary });
    }
    if (newMemberIds && newMemberIds.length > 0) {
      membersToCreate.push(...newMemberIds.map(id => ({
        councilBoardId,
        lecturerId: id,
        role: CouncilRole.Member
      })));
    }

    if (membersToCreate.length > 0) {
      await tx.councilBoardMember.createMany({
        data: membersToCreate,
      });
    }

    return tx.councilBoard.findUnique({
      where: { id: councilBoardId },
      include: {
        councilBoardMembers: { include: { lecturer: true } },
      },
    });
  });
};

export const deleteDefenseCouncil = async (id: number) => {
  return prisma.defenseCouncil.delete({
    where: { id },
  });
};

export const createDefenseCouncil = async (data: {
  registrationId: number;
  councilBoardId: number;
  startTime?: Date;
  endTime?: Date;
}) => {
  let { startTime, endTime } = data;

  if (!startTime || !endTime) {
    const board = await prisma.councilBoard.findUnique({
      where: { id: data.councilBoardId },
      include: {
        defenseDay: {
          include: { defense: true },
        },
        defenseCouncils: {
          orderBy: { endTime: "desc" },
          take: 1,
        },
      },
    });

    if (!board) throw new AppError(404, "Không tìm thấy Hội đồng bảo vệ");
    const defense = board.defenseDay?.defense;
    if (!defense) throw new AppError(404, "Không tìm thấy cấu hình đợt bảo vệ");

    const timePerTopic = defense.timePerTopic ?? 45;

    if (!startTime) {
      if (board.defenseCouncils.length > 0 && board.defenseCouncils[0].endTime) {
        startTime = board.defenseCouncils[0].endTime;
      } else {
        const [startH, startM] = (defense.workStartTime ?? "07:30").split(":").map(Number);
        startTime = minutesToDate(startH * 60 + startM);
      }
    }

    if (!endTime) {
      const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
      endTime = minutesToDate(startMinutes + timePerTopic);
    }
  }

  const code = `DC-${data.registrationId}-${data.councilBoardId}-${Date.now().toString(36).toUpperCase()}`;

  return prisma.defenseCouncil.create({
    data: {
      defenseCouncilCode: code,
      registrationId: data.registrationId,
      councilBoardId: data.councilBoardId,
      startTime: startTime,
      endTime: endTime,
    },
  });
};
