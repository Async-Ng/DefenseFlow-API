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
};

type FullTopic = Topic & {
  topicSupervisors: (TopicSupervisor & { lecturer: Lecturer })[];
  topicType?: {
    id: number;
    name: string;
    qualificationTopicTypes: { qualification: Qualification }[];
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
 * C4 (Soft) — A lecturer has at least one qualification matching the topic type.
 * Returns true when there are no type requirements (unconstrained).
 */
const matchesTopicType = (
  lecturer: FullLecturer,
  topicTypeQualifications: Qualification[]
): boolean => {
  if (topicTypeQualifications.length === 0) return true;
  const qualIds = new Set(lecturer.lecturerQualifications.map(lq => lq.qualificationId));
  return topicTypeQualifications.some(q => qualIds.has(q.id));
};

/**
 * C5 (Strict — Pass 1 only) — The council collectively covers ALL common qualifications.
 */
const coversAllCommonQualifications = (
  group: FullLecturer[],
  commonQualifications: Qualification[]
): boolean => {
  const groupQualIds = new Set(
    group.flatMap(l => l.lecturerQualifications.map(lq => lq.qualificationId))
  );
  return commonQualifications.every(q => groupQualIds.has(q.id));
};

// =============================================================================
// SCORING
// =============================================================================

/** Weighted score — common qualifications count double. */
const calculateLecturerScore = (
  lecturer: FullLecturer,
  commonQualificationIds: number[]
): number =>
  lecturer.lecturerQualifications.reduce((sum, lq) => {
    const weight = commonQualificationIds.includes(lq.qualificationId) ? 2 : 1;
    return sum + (lq.score ?? 0) * weight;
  }, 0);

// =============================================================================
// LOGGING HELPERS
// =============================================================================

const logTopicTypeMatch = (
  pass: string,
  topic: FullTopic,
  topicTypeQuals: Qualification[],
  matchedCount: number
): void => {
  if (topicTypeQuals.length > 0) {
    console.log(`[${pass}] ${topic.topicCode} (${topic.topicType?.name}): ${matchedCount}/5 with topic-type quals`);
  }
};

const logPartialCoverage = (
  topic: FullTopic,
  group: FullLecturer[],
  commonQualifications: Qualification[]
): void => {
  const covered = commonQualifications.filter(q =>
    group.some(l => l.lecturerQualifications.some(lq => lq.qualificationId === q.id))
  ).length;
  console.warn(`⚠️  [Pass2] ${topic.topicCode}: partial coverage ${covered}/${commonQualifications.length}`);
};

// =============================================================================
// CANDIDATE POOL — applies C1 + C2 + C3
// =============================================================================

const getEligibleCandidates = (
  lecturers: FullLecturer[],
  defenseDayId: number,
  state: SchedulingState
): FullLecturer[] =>
  lecturers.filter(l =>
    isNotAlreadyAssignedOnDay(l.id, defenseDayId, state) &&
    isUnderTopicLimit(l.id, state) &&
    isAvailableOnDay(l, defenseDayId)
  );

// =============================================================================
// TOPIC TYPE PREFERENCE — C4-aware candidate ranking
// =============================================================================

/**
 * Sorts candidates so that topic-type matched lecturers appear first,
 * then fills remaining slots with unmatched (by score).
 */
const selectWithTopicTypePreference = (
  candidates: FullLecturer[],
  topicTypeQualifications: Qualification[],
  commonQualificationIds: number[],
  count: number = 5
): { selected: FullLecturer[]; matchedCount: number } => {
  const byScore = (a: FullLecturer, b: FullLecturer) =>
    calculateLecturerScore(b, commonQualificationIds) - calculateLecturerScore(a, commonQualificationIds);

  const matched = candidates.filter(c => matchesTopicType(c, topicTypeQualifications)).sort(byScore);
  const unmatched = candidates.filter(c => !matchesTopicType(c, topicTypeQualifications)).sort(byScore);

  const selected = [...matched.slice(0, count), ...unmatched].slice(0, count);
  return { selected, matchedCount: Math.min(matched.length, count) };
};

// =============================================================================
// COUNCIL GROUP BUILDER — Coverage-First selection (C5 preparation)
// =============================================================================

/**
 * Builds a council group using Coverage-First strategy:
 * 1. Best-scoring lecturer per common qualification gets a seat.
 * 2. Remaining seats filled by overall score.
 */
const buildCouncilGroup = (
  pool: FullLecturer[],
  commonQualifications: Qualification[],
  commonQualificationIds: number[],
  size: number = 5
): FullLecturer[] => {
  const sorted = [...pool].sort(
    (a, b) => calculateLecturerScore(b, commonQualificationIds) - calculateLecturerScore(a, commonQualificationIds)
  );
  const group: FullLecturer[] = [];
  const assigned = new Set<number>();

  // Step 1: cover each common qualification
  for (const qual of commonQualifications) {
    const best = sorted.find(
      c => !assigned.has(c.id) &&
        c.lecturerQualifications.some(lq => lq.qualificationId === qual.id && (lq.score ?? 0) > 0)
    );
    if (best) { group.push(best); assigned.add(best.id); }
  }

  // Step 2: fill remaining seats by score
  for (const candidate of sorted) {
    if (group.length >= size) break;
    if (!assigned.has(candidate.id)) { group.push(candidate); assigned.add(candidate.id); }
  }

  return group;
};

// =============================================================================
// BOARD FACTORY
// =============================================================================

const buildPlannedBoard = (
  members: FullLecturer[],
  defenseDayId: number,
  topics: FullTopic[]
): PlannedBoard => ({
  presidentId: members[0].id,
  secretaryId: members[1].id,
  memberIds: members.slice(2).map(l => l.id),
  defenseDayId,
  topics,
  members,
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
  const d = new Date();
  d.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
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
  commonQualifications: Qualification[],
  commonQualificationIds: number[],
  defenseDayId: number
): Pass1Result => {
  if (candidates.length < 5) return "insufficient_candidates";
  if (topicChunk.length === 0) return "insufficient_candidates";

  // Gather all required qualifications from the chunk of topics
  const allTopicQuals = new Set<number>();
  const topicTypeQuals: Qualification[] = [];
  
  topicChunk.forEach(topic => {
      topic.topicType?.qualificationTopicTypes?.forEach(q => {
          if (!allTopicQuals.has(q.qualification.id)) {
              allTopicQuals.add(q.qualification.id);
              topicTypeQuals.push(q.qualification);
          }
      });
  });

  const { selected, matchedCount } = selectWithTopicTypePreference(candidates, topicTypeQuals, commonQualificationIds);

  if (selected.length < 5) return "insufficient_candidates";

  logTopicTypeMatch("Pass1", topicChunk[0], topicTypeQuals, matchedCount);

  const members = buildCouncilGroup(selected, commonQualifications, commonQualificationIds);
  if (members.length < 5) return "insufficient_candidates";

  if (!coversAllCommonQualifications(members, commonQualifications)) {
    console.log(`⚠️  [Pass1] Group of ${topicChunk.length} topics: incomplete coverage → deferred`);
    return "deferred";
  }

  return buildPlannedBoard(members, defenseDayId, topicChunk);
};



// =============================================================================
// PASS 2: BEST-EFFORT SCHEDULER
// Accepts partial common qualification coverage.
// =============================================================================

const tryScheduleBestEffort = (
  topicChunk: FullTopic[],
  candidates: FullLecturer[],
  commonQualifications: Qualification[],
  commonQualificationIds: number[],
  defenseDayId: number
): PlannedBoard | null => {
  if (candidates.length < 5) {
    console.warn(`❌ [Pass2] Group of ${topicChunk.length} topics: not enough candidates (${candidates.length})`);
    return null;
  }
  if (topicChunk.length === 0) return null;

  // Gather all required qualifications from the chunk of topics
  const allTopicQuals = new Set<number>();
  const topicTypeQuals: Qualification[] = [];
  
  topicChunk.forEach(topic => {
      topic.topicType?.qualificationTopicTypes?.forEach(q => {
          if (!allTopicQuals.has(q.qualification.id)) {
              allTopicQuals.add(q.qualification.id);
              topicTypeQuals.push(q.qualification);
          }
      });
  });

  const { selected, matchedCount } = selectWithTopicTypePreference(candidates, topicTypeQuals, commonQualificationIds);

  if (selected.length < 5) {
    console.warn(`❌ [Pass2] Group of ${topicChunk.length} topics: not enough candidates after filtering`);
    return null;
  }

  logTopicTypeMatch("Pass2", topicChunk[0], topicTypeQuals, matchedCount);

  if (!coversAllCommonQualifications(selected, commonQualifications)) {
    logPartialCoverage(topicChunk[0], selected, commonQualifications);
  }

  return buildPlannedBoard(selected, defenseDayId, topicChunk);
};


// =============================================================================
// MAIN SCHEDULER ORCHESTRATOR
// Pure two-pass scheduling loop — no business logic here.
// =============================================================================

const runScheduler = (ctx: SchedulingContext): { boards: PlannedBoard[]; unscheduled: FullTopic[] } => {
  const { defenseDays, lecturers, commonQualifications, topics, lecturerDefenseConfigs, defense, topicsPerBoard } = ctx;
  const commonQualificationIds = commonQualifications.map(q => q.id);
  const maxCouncilsPerDay = defense.maxCouncilsPerDay || 1;

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

  for (const day of defenseDays) {
    console.log(`\n=== Defense Day ${day.id} ===`);
    let boardsCreatedToday = 0;

    // ── Pass 1: Strict ──────────────────────────────────────────────────────
    console.log("--- Pass 1 (Strict) ---");
    let pass1Running = true;
    while (pass1Running && boardsCreatedToday < maxCouncilsPerDay) {
      const pending = getPendingTopics(topics, state.scheduledTopicIds, deferredTopics);
      if (pending.length === 0) break;

      // Group topics by type to maximize board expertise
      // For simplicity, we just take the first N topics of the same type (or null type)
      const firstTopicType = pending[0].topicTypeId;
      const similarTopics = pending.filter(t => t.topicTypeId === firstTopicType);
      
      const topicChunk = similarTopics.slice(0, topicsPerBoard);
      
      const candidates = getEligibleCandidates(lecturers, day.id, state);
      const result = tryScheduleStrict(topicChunk, candidates, commonQualifications, commonQualificationIds, day.id);

      if (result === "insufficient_candidates") { pass1Running = false; }
      else if (result === "deferred") { 
          // Defer the whole chunk
          deferredTopics.push(...topicChunk); 
      }
      else { 
          boards.push(result); 
          commitBoardToState(result, state); 
          boardsCreatedToday++;
      }
    }

    // ── Pass 2: Best-Effort ─────────────────────────────────────────────────
    if (deferredTopics.length > 0 && boardsCreatedToday < maxCouncilsPerDay) {
      console.log(`--- Pass 2 (Best-Effort): ${deferredTopics.length} deferred ---`);
      
      const remainingSlots = maxCouncilsPerDay - boardsCreatedToday;
      let boardsCreatedPass2 = 0;
      
      while(deferredTopics.length > 0 && boardsCreatedPass2 < remainingSlots) {
        // Group deferred topics
        const pendingDeferred = deferredTopics.filter(t => !state.scheduledTopicIds.has(t.id));
        if (pendingDeferred.length === 0) break;
        
        const firstTopicType = pendingDeferred[0].topicTypeId;
        const similarTopics = pendingDeferred.filter(t => t.topicTypeId === firstTopicType);
        const topicChunk = similarTopics.slice(0, topicsPerBoard);

        const candidates = getEligibleCandidates(lecturers, day.id, state);
        const board = tryScheduleBestEffort(topicChunk, candidates, commonQualifications, commonQualificationIds, day.id);
        
        if (!board) break; // If we can't form a board even with best effort, give up for this day.

        boards.push(board);
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

  return {
    boards,
    unscheduled: topics.filter(t => !state.scheduledTopicIds.has(t.id)),
  };
};

// =============================================================================
// DATA FETCHING
// =============================================================================

const fetchSchedulingContext = async (defenseId: number): Promise<SchedulingContext> => {
  const defense = await prisma.defense.findUnique({ where: { id: defenseId } });
  if (!defense) throw new AppError(404, "Defense not found");

  const [topics, lecturers, defenseDays, commonQualifications, lecturerDefenseConfigs] = await Promise.all([
    prisma.topic.findMany({
      where: {
        semesterId: defense.semesterId,
        topicDefenses: { some: { defenseId } },
      },
      include: {
        topicSupervisors: { include: { lecturer: true } },
        topicDefenses: { where: { defenseId } },
        topicType: { include: { qualificationTopicTypes: { include: { qualification: true } } } },
      },
    }),
    prisma.lecturer.findMany({
      include: {
        lecturerDayAvailability: true,
        lecturerQualifications: { include: { qualification: true } },
      },
    }),
    prisma.defenseDay.findMany({
      where: { defenseId },
      orderBy: { dayDate: "asc" },
    }),
    prisma.qualification.findMany({ where: { isCommon: true } }),
    prisma.lecturerDefenseConfig.findMany({ where: { defenseId } }),
  ]);

  const timePerTopic = defense.timePerTopic ?? 45;
  const topicsPerBoard = Math.floor((8 * 60) / timePerTopic);

  return { defense, topics, lecturers, defenseDays, commonQualifications, lecturerDefenseConfigs, topicsPerBoard };
};

// =============================================================================
// VALIDATION
// =============================================================================

const validateDefenseReadiness = (ctx: SchedulingContext): void => {
  if (ctx.defenseDays.length === 0) {
    throw new AppError(400, "No defense days defined for this defense.");
  }
};

const validateCapacity = (ctx: SchedulingContext): void => {
  const timePerTopic = ctx.defense.timePerTopic ?? 45;
  const totalMinutesNeeded = ctx.topics.length * timePerTopic;
  const maxCouncilsPerDay = ctx.defense.maxCouncilsPerDay || 1;
  const totalMinutesAvailable = ctx.defenseDays.length * maxCouncilsPerDay * (8 * 60);

  if (totalMinutesNeeded > totalMinutesAvailable) {
    throw new AppError(
      400,
      `Insufficient capacity: need ${totalMinutesNeeded} min, have ${totalMinutesAvailable} min across ${ctx.defenseDays.length} day(s) with ${maxCouncilsPerDay} councils/day.`
    );
  }
};

// =============================================================================
// PERSISTENCE
// =============================================================================

const persistSchedule = async (defenseId: number, boards: PlannedBoard[]): Promise<void> => {
  const defense = await prisma.defense.findUnique({ where: { id: defenseId } });
  if (!defense) throw new AppError(404, "Defense not found");

  const timePerTopic = defense.timePerTopic ?? 45;
  const [startH, startM] = (defense.workStartTime ?? "07:30").split(":").map(Number);
  const startMinutes = startH * 60 + startM;

  await prisma.$transaction(async (tx) => {
    // Clear old schedule
    const oldBoards = await tx.councilBoard.findMany({ where: { defenseDay: { defenseId } } });
    const oldBoardIds = oldBoards.map(b => b.id);

    await tx.defenseCouncil.deleteMany({ where: { councilBoardId: { in: oldBoardIds } } });
    await tx.councilBoardMember.deleteMany({ where: { councilBoardId: { in: oldBoardIds } } });
    await tx.councilBoard.deleteMany({ where: { defenseDay: { defenseId } } });

    try {
      // Insert new schedule
      for (const planned of boards) {
        // 1. Create the board
        const board = await tx.councilBoard.create({
          data: {
            boardCode: `CB-${defenseId}-${planned.defenseDayId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            defenseDayId: planned.defenseDayId,
            semesterId: planned.topics[0]?.semesterId ?? defense.semesterId,
            name: "Defense Council Board",
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

          councilsToCreate.push({
            defenseCouncilCode: `DC-${defenseId}-${topic.topicCode}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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

  const { boards, unscheduled } = runScheduler(ctx);
  await persistSchedule(defenseId, boards);

  return {
    status: "success",
    metrics: {
      totalTopics: ctx.topics.length,
      scheduled: ctx.topics.length - unscheduled.length,
      unscheduled: unscheduled.length,
    },
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
    throw new AppError(404, "Council Board not found");
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
    throw new AppError(400, `Cannot publish: The following topics are not scheduled: ${codes}`);
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
    throw new AppError(400, `Cannot publish: The following council boards do not have exactly 5 members: ${codes}`);
  }

  return prisma.defense.update({
    where: { id: defenseId },
    data: { isSchedulePublished: true },
  });
};

export const updateDefenseCouncil = async (
  defenseCouncilId: number,
  data: { startTime?: Date; endTime?: Date; councilBoardId?: number | null }
) => {
  const dc = await prisma.defenseCouncil.findUnique({ where: { id: defenseCouncilId } });
  if (!dc) throw new AppError(404, "Defense Council not found");

  if (data.councilBoardId && data.councilBoardId !== dc.councilBoardId) {
    const board = await prisma.councilBoard.findUnique({ where: { id: data.councilBoardId } });
    if (!board) throw new AppError(404, "Target council board not found");
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

  if (!board) throw new AppError(404, "Council board not found");

  // 1. Gather all new IDs (explicitly provided or from current state if not provided)
  const current = board.councilBoardMembers;
  const newPresidentId = presidentId !== undefined ? presidentId : current.find(m => m.role === CouncilRole.President)?.lecturerId;
  const newSecretaryId = secretaryId !== undefined ? secretaryId : current.find(m => m.role === CouncilRole.Secretary)?.lecturerId;
  const newMemberIds = memberIds !== undefined ? memberIds : current.filter(m => m.role === CouncilRole.Member).map(m => m.lecturerId!).filter(id => id != null);

  const allIds = [newPresidentId, newSecretaryId, ...(newMemberIds || [])].filter((id): id is number => id != null);
  
  // 2. Intra-board uniqueness check
  const uniqueIds = new Set(allIds);
  if (uniqueIds.size !== allIds.length) {
    throw new AppError(400, "Duplicate lecturers in the same board");
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
      `Lecturer ${conflict.lecturer?.fullName || conflict.lecturerId} is already assigned to board ${conflict.councilBoard?.boardCode} on this day.`
    );
  }

  // 4. Update members
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
  startTime: Date;
  endTime: Date;
}) => {
  const code = `DC-${data.registrationId}-${data.councilBoardId}-${Date.now().toString(36).toUpperCase()}`;

  return prisma.defenseCouncil.create({
    data: {
      defenseCouncilCode: code,
      registrationId: data.registrationId,
      councilBoardId: data.councilBoardId,
      startTime: data.startTime,
      endTime: data.endTime,
    },
  });
};
