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
} from "../../generated/prisma/client.js";

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
  topic: FullTopic,
  candidates: FullLecturer[],
  commonQualifications: Qualification[],
  commonQualificationIds: number[],
  defenseDayId: number
): Pass1Result => {
  if (candidates.length < 5) return "insufficient_candidates";

  const topicTypeQuals = topic.topicType?.qualificationTopicTypes?.map(q => q.qualification) ?? [];
  const { selected, matchedCount } = selectWithTopicTypePreference(candidates, topicTypeQuals, commonQualificationIds);

  if (selected.length < 5) return "insufficient_candidates";

  logTopicTypeMatch("Pass1", topic, topicTypeQuals, matchedCount);

  const members = buildCouncilGroup(selected, commonQualifications, commonQualificationIds);
  if (members.length < 5) return "insufficient_candidates";

  if (!coversAllCommonQualifications(members, commonQualifications)) {
    console.log(`⚠️  [Pass1] ${topic.topicCode}: incomplete coverage → deferred`);
    return "deferred";
  }

  return buildPlannedBoard(members, defenseDayId, [topic]);
};

// =============================================================================
// PASS 2: BEST-EFFORT SCHEDULER
// Accepts partial common qualification coverage.
// =============================================================================

const tryScheduleBestEffort = (
  topic: FullTopic,
  candidates: FullLecturer[],
  commonQualifications: Qualification[],
  commonQualificationIds: number[],
  defenseDayId: number
): PlannedBoard | null => {
  if (candidates.length < 5) {
    console.warn(`❌ [Pass2] ${topic.topicCode}: not enough candidates (${candidates.length})`);
    return null;
  }

  const topicTypeQuals = topic.topicType?.qualificationTopicTypes?.map(q => q.qualification) ?? [];
  const { selected, matchedCount } = selectWithTopicTypePreference(candidates, topicTypeQuals, commonQualificationIds);

  if (selected.length < 5) {
    console.warn(`❌ [Pass2] ${topic.topicCode}: not enough candidates after filtering`);
    return null;
  }

  logTopicTypeMatch("Pass2", topic, topicTypeQuals, matchedCount);

  if (!coversAllCommonQualifications(selected, commonQualifications)) {
    logPartialCoverage(topic, selected, commonQualifications);
  }

  return buildPlannedBoard(selected, defenseDayId, [topic]);
};

// =============================================================================
// MAIN SCHEDULER ORCHESTRATOR
// Pure two-pass scheduling loop — no business logic here.
// =============================================================================

const runScheduler = (ctx: SchedulingContext): { boards: PlannedBoard[]; unscheduled: FullTopic[] } => {
  const { defenseDays, lecturers, commonQualifications, topics, lecturerDefenseConfigs } = ctx;
  const commonQualificationIds = commonQualifications.map(q => q.id);

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

    // ── Pass 1: Strict ──────────────────────────────────────────────────────
    console.log("--- Pass 1 (Strict) ---");
    let pass1Running = true;
    while (pass1Running) {
      const pending = getPendingTopics(topics, state.scheduledTopicIds, deferredTopics);
      if (pending.length === 0) break;

      const [topic] = pending;
      const candidates = getEligibleCandidates(lecturers, day.id, state);
      const result = tryScheduleStrict(topic, candidates, commonQualifications, commonQualificationIds, day.id);

      if (result === "insufficient_candidates") { pass1Running = false; }
      else if (result === "deferred") { deferredTopics.push(topic); }
      else { boards.push(result); commitBoardToState(result, state); }
    }

    // ── Pass 2: Best-Effort ─────────────────────────────────────────────────
    if (deferredTopics.length > 0) {
      console.log(`--- Pass 2 (Best-Effort): ${deferredTopics.length} deferred ---`);
      for (const topic of [...deferredTopics]) {
        if (state.scheduledTopicIds.has(topic.id)) continue;

        const candidates = getEligibleCandidates(lecturers, day.id, state);
        const board = tryScheduleBestEffort(topic, candidates, commonQualifications, commonQualificationIds, day.id);
        if (!board) continue;

        boards.push(board);
        commitBoardToState(board, state);
        deferredTopics.splice(deferredTopics.findIndex(t => t.id === topic.id), 1);
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

  return { defense, topics, lecturers, defenseDays, commonQualifications, lecturerDefenseConfigs };
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
  const totalMinutesAvailable = ctx.defenseDays.length * 8 * 60;

  if (totalMinutesNeeded > totalMinutesAvailable) {
    throw new AppError(
      400,
      `Insufficient capacity: need ${totalMinutesNeeded} min, have ${totalMinutesAvailable} min across ${ctx.defenseDays.length} day(s).`
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

    // Insert new schedule
    const dayTimeCursors = new Map<number, number>();

    for (const planned of boards) {
      const cursor = dayTimeCursors.get(planned.defenseDayId) ?? startMinutes;

      const board = await tx.councilBoard.create({
        data: {
          boardCode: `CB-${defenseId}-${planned.defenseDayId}-${Math.floor(Math.random() * 10000)}`,
          defenseDayId: planned.defenseDayId,
          semesterId: planned.topics[0]?.semesterId ?? defense.semesterId,
          name: "Defense Council Board",
          councilBoardMembers: {
            create: [
              { lecturerId: planned.presidentId, role: CouncilRole.President },
              { lecturerId: planned.secretaryId, role: CouncilRole.Secretary },
              ...planned.memberIds.map(id => ({ lecturerId: id, role: CouncilRole.Member })),
            ],
          },
        },
      });

      let topicCursor = cursor;
      for (const topic of planned.topics) {
        const registration = topic.topicDefenses?.[0];
        if (!registration) continue;

        await tx.defenseCouncil.create({
          data: {
            defenseCouncilCode: `DC-${topic.topicCode}`,
            registrationId: registration.id,
            councilBoardId: board.id,
            startTime: minutesToDate(topicCursor),
            endTime: minutesToDate(topicCursor + timePerTopic),
          },
        });

        topicCursor += timePerTopic;
      }

      dayTimeCursors.set(planned.defenseDayId, topicCursor);
    }
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

export const getSchedule = async (defenseId: number) => {
  const defense = await prisma.defense.findUnique({ where: { id: defenseId } });
  if (!defense) throw new AppError(404, "Defense not found");
  return councilBoardRepository.findCouncilBoardsByDefense(defenseId);
};

export const publishSchedule = async (defenseId: number) =>
  prisma.defense.update({
    where: { id: defenseId },
    data: { isSchedulePublished: true },
  });

export const updateDefenseCouncil = async (
  defenseCouncilId: number,
  data: { startTime?: Date; endTime?: Date; councilBoardId?: number }
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
  data: { presidentId?: number; secretaryId?: number; memberIds?: number[] }
) => {
  const board = await prisma.councilBoard.findUnique({
    where: { id: councilBoardId },
    include: { councilBoardMembers: true },
  });
  if (!board) throw new AppError(404, "Council Board not found");

  return prisma.$transaction(async (tx) => {
    const current = board.councilBoardMembers;
    const newPresidentId = data.presidentId ?? current.find(m => m.role === CouncilRole.President)?.lecturerId;
    const newSecretaryId = data.secretaryId ?? current.find(m => m.role === CouncilRole.Secretary)?.lecturerId;
    const newMemberIds = data.memberIds ?? current.filter(m => m.role === CouncilRole.Member).map(m => m.lecturerId!);

    await tx.councilBoardMember.deleteMany({ where: { councilBoardId } });
    await tx.councilBoardMember.createMany({
      data: [
        { councilBoardId, lecturerId: newPresidentId!, role: CouncilRole.President },
        { councilBoardId, lecturerId: newSecretaryId!, role: CouncilRole.Secretary },
        ...newMemberIds.map(id => ({ councilBoardId, lecturerId: id, role: CouncilRole.Member })),
      ],
    });

    return tx.councilBoard.findUnique({
      where: { id: councilBoardId },
      include: { councilBoardMembers: true },
    });
  });
};
