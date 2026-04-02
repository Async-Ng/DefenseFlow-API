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
  LecturerRoleSuitability,
  CouncilBoard,
} from "../../generated/prisma/client.js";
import {
  CouncilBoardFilters,
  CouncilBoardSort,
  PaginatedResult,
} from "../types/index.js";
import { ensureDefenseNotLocked, ensureDefenseDayNotLocked, ensureCouncilBoardNotLocked } from "../utils/lockUtils.js";

// =============================================================================
// TYPES
// =============================================================================

type FullLecturer = Lecturer & {
  lecturerDayAvailability: LecturerDayAvailability[];
  lecturerRoleSuitabilities: LecturerRoleSuitability[];
};

type FullTopic = Topic & {
  topicSupervisors: (TopicSupervisor & { lecturer: Lecturer })[];
  topicType?: { id: number; name: string } | null;
  topicDefenses: { id: number; defenseId: number | null }[];
};

interface SchedulingContext {
  defense: Defense;
  topics: FullTopic[];
  lecturers: FullLecturer[];
  defenseDays: DefenseDay[];
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
  reqReviewerId: number;
  techReviewerId: number;
  algorithmReviewerId: number;
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
  return !!slot && (slot.status as string) === 'Available';
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
// ROLE SUITABILITY
// =============================================================================

const COUNCIL_ROLES: CouncilRole[] = [
  CouncilRole.President,
  CouncilRole.Secretary,
  CouncilRole.ReqReviewer,
  CouncilRole.TechReviewer,
  CouncilRole.AlgorithmReviewer,
];

const getRoleSuitability = (lecturer: FullLecturer, role: CouncilRole): number =>
  lecturer.lecturerRoleSuitabilities.find(s => s.role === role)?.suitability ?? 0;

/**
 * assignRoles — Position-first greedy assignment.
 *
 * Sort roles by "hardest to fill" (lowest max suitability in pool → assign first).
 * For each role, pick the available candidate with the highest suitability for that role.
 */
const assignRoles = (
  pool: FullLecturer[],
): { assignment: Map<CouncilRole, FullLecturer>; warning?: string } => {
  const getMaxSuitability = (role: CouncilRole) =>
    Math.max(0, ...pool.map(l => getRoleSuitability(l, role)));

  const sortedRoles = [...COUNCIL_ROLES].sort(
    (a, b) => getMaxSuitability(a) - getMaxSuitability(b),
  );

  const assignment = new Map<CouncilRole, FullLecturer>();
  const used = new Set<number>();

  for (const role of sortedRoles) {
    const best = [...pool]
      .filter(l => !used.has(l.id))
      .sort((a, b) => getRoleSuitability(b, role) - getRoleSuitability(a, role))[0];

    if (!best) {
      return { assignment, warning: `Không đủ ứng viên để điền vị trí ${role}` };
    }
    assignment.set(role, best);
    used.add(best.id);
  }

  return { assignment };
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
// BOARD FACTORY
// =============================================================================

const buildPlannedBoard = (
  assignment: Map<CouncilRole, FullLecturer>,
  defenseDayId: number,
  topics: FullTopic[],
  warning?: string
): PlannedBoard => ({
  presidentId: assignment.get(CouncilRole.President)!.id,
  secretaryId: assignment.get(CouncilRole.Secretary)!.id,
  reqReviewerId: assignment.get(CouncilRole.ReqReviewer)!.id,
  techReviewerId: assignment.get(CouncilRole.TechReviewer)!.id,
  algorithmReviewerId: assignment.get(CouncilRole.AlgorithmReviewer)!.id,
  defenseDayId,
  topics,
  members: Array.from(assignment.values()),
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
// SCHEDULER PASSES
// =============================================================================

type ScheduleResult = PlannedBoard | "insufficient_candidates";

const trySchedule = (
  topicChunk: FullTopic[],
  candidates: FullLecturer[],
  defenseDayId: number
): ScheduleResult => {
  if (candidates.length < 5 || topicChunk.length === 0) return "insufficient_candidates";

  const { assignment, warning } = assignRoles(candidates);
  if (assignment.size < 5) return "insufficient_candidates";

  return buildPlannedBoard(assignment, defenseDayId, topicChunk, warning);
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
  const warnings: string[] = [];

  for (const day of defenseDays) {
    console.log(`\n=== Defense Day ${day.id} ===`);
    let boardsCreatedToday = 0;
    const maxCouncilsThisDay = day.maxCouncils ?? 1;

    let running = true;
    while (running && boardsCreatedToday < maxCouncilsThisDay) {
      const pending = getPendingTopics(topics, state.scheduledTopicIds, []);
      if (pending.length === 0) break;

      const firstTopicType = pending[0].topicTypeId;
      const topicChunk = pending.filter(t => t.topicTypeId === firstTopicType).slice(0, topicsPerBoard);

      const candidates = getEligibleCandidates(lecturers, day.id, state, topicChunk);
      const result = trySchedule(topicChunk, candidates, day.id);

      if (result === "insufficient_candidates") {
        running = false;
      } else {
        boards.push(result);
        if (result.warning) warnings.push(result.warning);
        commitBoardToState(result, state);
        boardsCreatedToday++;
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
        topicType: { select: { id: true, name: true } },
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
        lecturerRoleSuitabilities: true,
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

  return { defense, topics, lecturers, defenseDays, lecturerDefenseConfigs, topicsPerBoard };
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
    const totalHoursNeeded = (totalMinutesNeeded / 60).toFixed(1).replace(/\.0$/, "");
    const totalHoursAvailable = (totalMinutesAvailable / 60).toFixed(1).replace(/\.0$/, "");
    
    const dayBreakdown = ctx.defenseDays
      .map(d => `Ngày ${(d.dayDate as Date).toLocaleDateString('vi-VN')}: ${d.maxCouncils ?? 1} HĐ`)
      .join(', ');
    throw new AppError(
      400,
      `Không đủ thời gian: Cần ${totalHoursNeeded} giờ, nhưng chỉ có ${totalHoursAvailable} giờ (${dayBreakdown}).`
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
          { councilBoardId: board.id, lecturerId: planned.reqReviewerId, role: CouncilRole.ReqReviewer },
          { councilBoardId: board.id, lecturerId: planned.techReviewerId, role: CouncilRole.TechReviewer },
          { councilBoardId: board.id, lecturerId: planned.algorithmReviewerId, role: CouncilRole.AlgorithmReviewer },
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
  // Check if defense is locked
  await ensureDefenseNotLocked(defenseId);

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
  // Check if defense is locked
  await ensureDefenseNotLocked(defenseId);

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

/**
 * Internal helper to re-align all slots in a board to be contiguous,
 * preserving their original individual durations.
 */
const rippleBoard = async (tx: any, boardId: number) => {
  const allSlots = await tx.defenseCouncil.findMany({
    where: { councilBoardId: boardId },
    orderBy: { startTime: "asc" },
  });

  if (allSlots.length === 0) return;

  // Anchor the schedule to the current start time of the first topic
  let nextStartTime = allSlots[0].startTime;

  for (const slot of allSlots) {
    if (!slot.startTime || !slot.endTime || !nextStartTime) continue;

    const durationMs = slot.endTime.getTime() - slot.startTime.getTime();

    // Re-align if there's a gap or overlap
    if (slot.startTime.getTime() !== nextStartTime.getTime()) {
      const newEndTime = new Date(nextStartTime.getTime() + durationMs);
      await tx.defenseCouncil.update({
        where: { id: slot.id },
        data: {
          startTime: nextStartTime,
          endTime: newEndTime,
        },
      });
      nextStartTime = newEndTime;
    } else {
      nextStartTime = slot.endTime;
    }
  }
};

export const updateDefenseCouncil = async (
  defenseCouncilId: number,
  data: { startTime?: Date; endTime?: Date; councilBoardId?: number | null },
) => {
  const oldDC = await prisma.defenseCouncil.findUnique({
    where: { id: defenseCouncilId },
    include: {
      councilBoard: {
        select: {
          id: true,
          defenseDayId: true,
          defenseDay: { select: { defenseId: true, defense: true } },
        },
      },
      topicDefense: {
        include: {
          topic: { include: { topicSupervisors: true } },
        },
      },
    },
  });

  if (!oldDC)
    throw new AppError(404, "Không tìm thấy lịch bảo vệ (Defense Council)");

  const oldBoardId = oldDC.councilBoardId;
  const isMovingBoards =
    data.councilBoardId !== undefined && data.councilBoardId !== oldBoardId;

  // Check if source board is locked
  if (oldDC.councilBoard?.defenseDayId) {
    await ensureDefenseDayNotLocked(oldDC.councilBoard.defenseDayId);
  }

  // Check if target board is locked (if moving)
  if (isMovingBoards && data.councilBoardId) {
    await ensureCouncilBoardNotLocked(data.councilBoardId);
  }

  return prisma.$transaction(async (tx) => {
    // A. Validation & Auto-Calculation for Cross-Board Movement
    if (isMovingBoards && data.councilBoardId) {
      const targetBoard = await tx.councilBoard.findUnique({
        where: { id: data.councilBoardId },
        include: {
          councilBoardMembers: true,
          defenseDay: { include: { defense: true } },
          defenseCouncils: { orderBy: { endTime: "desc" }, take: 1 },
        },
      });

      if (!targetBoard)
        throw new AppError(404, "Không tìm thấy Hội đồng mục tiêu");

      // A1. Block Move if target board/day is locked
      await ensureDefenseDayNotLocked(targetBoard.defenseDayId);

      // A2. C6 Conflict Check: Supervisor must not be in the target board
      const supervisorIds = new Set(
        oldDC.topicDefense?.topic?.topicSupervisors.map((s) => s.lecturerId) ||
          [],
      );
      const conflicting = targetBoard.councilBoardMembers.filter(
        (m) => m.lecturerId !== null && supervisorIds.has(m.lecturerId),
      );
      if (conflicting.length > 0) {
        throw new AppError(
          409,
          `Xung đột: Người hướng dẫn của đề tài này đang là thành viên của Hội đồng mục tiêu.`,
        );
      }

      // A3. Auto-calculate time if NOT provided (Append logic)
      if (!data.startTime) {
        let startTime: Date;
        if (targetBoard.defenseCouncils.length > 0) {
          startTime = targetBoard.defenseCouncils[0].endTime!;
        } else {
          // Board is empty, use defense workStartTime
          const defense = targetBoard.defenseDay.defense;
          const [h, m] = (defense.workStartTime || "07:30")
            .split(":")
            .map(Number);
          startTime = minutesToDate(h * 60 + m);
        }

        // Preserve original duration
        const durationMs =
          (oldDC.endTime?.getTime() || 0) - (oldDC.startTime?.getTime() || 0);
        data.startTime = startTime;
        data.endTime = new Date(startTime.getTime() + (durationMs || 45 * 60000));
      }
    }

    // B. Update the target record
    const updated = await tx.defenseCouncil.update({
      where: { id: defenseCouncilId },
      data,
    });

    // C. Source Board Ripple (Gap Closing)
    if (isMovingBoards && oldBoardId) {
      await rippleBoard(tx, oldBoardId);
    }

    // D. Target Board Ripple (Consistency)
    if ((data.startTime || data.endTime || isMovingBoards) && updated.councilBoardId) {
      await rippleBoard(tx, updated.councilBoardId);
    }

    return updated;
  });
};



export const updateCouncilBoard = async (
  councilBoardId: number,
  data: { presidentId?: number | null; secretaryId?: number | null; memberIds?: number[] }
) => {
  const { presidentId, secretaryId, memberIds } = data;

  const board = await prisma.councilBoard.findUnique({
    where: { id: councilBoardId },
    include: { 
      councilBoardMembers: true,
      defenseDay: {
        include: { defense: true },
      },
    },
  });

  if (!board) throw new AppError(404, "Không tìm thấy Hội đồng bảo vệ");

  // Check if locked (fix: pass defenseDayId, not councilBoardId)
  await ensureDefenseDayNotLocked(board.defenseDayId);

  const defenseId = board.defenseDay?.defenseId;
  const defenseDayId = board.defenseDayId;
  const isSchedulePublished = board.defenseDay?.defense?.isSchedulePublished ?? false;

  // Snapshot current member IDs before update (for notification diff)
  const oldMemberIds = new Set(board.councilBoardMembers.map(m => m.lecturerId).filter((id): id is number => id != null));

  // 1. Gather all new IDs (explicitly provided or from current state if not provided)
  const current = board.councilBoardMembers;
  const newPresidentId = presidentId !== undefined ? presidentId : current.find(m => m.role === CouncilRole.President)?.lecturerId;
  const newSecretaryId = secretaryId !== undefined ? secretaryId : current.find(m => m.role === CouncilRole.Secretary)?.lecturerId;
  let newMemberIds = memberIds !== undefined ? memberIds : current.filter(m => m.role === CouncilRole.Member).map(m => m.lecturerId!).filter(id => id != null);

  // Auto-deduplicate: If someone is promoted to President/Secretary, remove them from Members
  if (presidentId !== undefined) {
    newMemberIds = newMemberIds.filter(id => id !== presidentId);
  }
  if (secretaryId !== undefined) {
    newMemberIds = newMemberIds.filter(id => id !== secretaryId);
  }

  // Ensure President and Secretary are distinct if both are present
  if (newPresidentId && newSecretaryId && newPresidentId === newSecretaryId) {
    throw new AppError(400, "Chủ tịch và Thư ký không thể là cùng một người.");
  }

  const allIds = [newPresidentId, newSecretaryId, ...(newMemberIds || [])].filter((id): id is number => id != null);

  
  // 1.5 Fetch detailed info for validation
  const lecturers = await prisma.lecturer.findMany({
    where: { id: { in: allIds } },
    include: {
      lecturerDayAvailability: { where: { defenseDayId: defenseDayId } },
      lecturerDefenseConfigs: { where: { defenseId: defenseId } },
      lecturerQualifications: { include: { qualification: true } },
    }
  });

  const lecturerBoardsCount = await prisma.councilBoardMember.groupBy({
    by: ['lecturerId'],
    where: {
      lecturerId: { in: allIds },
      councilBoard: {
        defenseDay: { defenseId: defenseId },
        id: { not: councilBoardId }
      }
    },
    _count: { id: true }
  });

  const countMap = new Map(lecturerBoardsCount.map(c => [c.lecturerId, c._count.id]));

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

  // 4. Availability & Workload & Role Checks
  for (const lId of allIds) {
      const lecturer = lecturers.find(l => l.id === lId);
      if (!lecturer) continue;

      // 4.1 Availability Check
      const availability = lecturer.lecturerDayAvailability[0];
      if (availability && availability.status === AvailabilityStatus.Busy) {
          throw new AppError(400, `Giảng viên ${lecturer.fullName} đã đăng ký Bận vào ngày này.`);
      }

      // 4.2 Workload Check (maxTopics)
      const config = lecturer.lecturerDefenseConfigs[0];
      if (config && config.maxTopics) {
          const currentCount = countMap.get(lId) ?? 0;
          if (currentCount >= config.maxTopics) {
              throw new AppError(400, `Giảng viên ${lecturer.fullName} đã đạt giới hạn tối đa số hội đồng (${config.maxTopics}).`);
          }
      }
  }

  // 5. Conflict of Interest Check & Expertise Check
  // Get all topics assigned to this council board
  const boardTopics = await prisma.defenseCouncil.findMany({
    where: { councilBoardId },
    include: {
      topicDefense: {
        include: {
          topic: {
            include: { 
                topicSupervisors: true,
                topicType: {
                    include: {
                        qualificationGroupTopicTypes: {
                            include: {
                                qualificationGroup: {
                                    include: { qualifications: { select: { id: true } } }
                                }
                            }
                        }
                    }
                }
            }
          }
        }
      }
    }
  });

  // Expertise (Qualification) Check
  const requiredQualIds = new Set<number>();
  boardTopics.forEach(dc => {
      dc.topicDefense?.topic?.topicType?.qualificationGroupTopicTypes?.forEach(gtt => {
          gtt.qualificationGroup.qualifications.forEach(q => requiredQualIds.add(q.id));
      });
  });

  if (requiredQualIds.size > 0) {
      const anyMatch = lecturers.some(l => 
          l.lecturerQualifications.some(lq => requiredQualIds.has(lq.qualificationId))
      );
      if (!anyMatch) {
          throw new AppError(400, "Thiếu chuyên môn: Không có giảng viên nào trong danh sách được chọn có chuyên môn phù hợp với các đề tài của hội đồng này.");
      }
  }

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
  const updatedBoard = await prisma.$transaction(async (tx) => {
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

  // 7. Post-publication adjustment notifications
  if (isSchedulePublished && defenseId) {
    try {
      const newMemberIdSet = new Set(allIds);

      const addedIds     = allIds.filter(id => !oldMemberIds.has(id));
      const removedIds   = Array.from(oldMemberIds).filter(id => !newMemberIdSet.has(id));
      const remainingIds = allIds.filter(id => oldMemberIds.has(id));

      const fetchAuthIds = async (lecturerIds: number[]): Promise<string[]> => {
        if (lecturerIds.length === 0) return [];
        const rows = await prisma.lecturer.findMany({
          where: { id: { in: lecturerIds }, authId: { not: null } },
          select: { authId: true },
        });
        return rows.map(r => r.authId as string);
      };

      const notifRepository = await import("../repositories/notificationRepository.js");

      const [addedAuthIds, removedAuthIds, remainingAuthIds] = await Promise.all([
        fetchAuthIds(addedIds),
        fetchAuthIds(removedIds),
        fetchAuthIds(remainingIds),
      ]);

      const notifications: { authId: string; title: string; message: string; type: string }[] = [];

      for (const authId of addedAuthIds) {
        notifications.push({
          authId,
          title: "Phân công hội đồng mới",
          message: `Bạn vừa được phân công bổ sung vào Hội đồng ${board!.boardCode}. Vui lòng kiểm tra lại lịch bảo vệ.`,
          type: "COUNCIL_MEMBER_ADDED",
        });
      }

      for (const authId of removedAuthIds) {
        notifications.push({
          authId,
          title: "Thay đổi phân công hội đồng",
          message: `Bạn đã được rút khỏi Hội đồng ${board!.boardCode} do có sự điều chỉnh nhân sự.`,
          type: "COUNCIL_MEMBER_REMOVED",
        });
      }

      for (const authId of remainingAuthIds) {
        notifications.push({
          authId,
          title: "Cập nhật thành viên hội đồng",
          message: `Hội đồng ${board!.boardCode} của bạn vừa có sự thay đổi về nhân sự. Vui lòng kiểm tra lại danh sách thành viên.`,
          type: "COUNCIL_MEMBER_UPDATED",
        });
      }

      if (notifications.length > 0) {
        await notifRepository.createManyNotifications(notifications);
      }
    } catch (err) {
      console.error("[updateCouncilBoard] Failed to dispatch post-publication notifications:", err);
    }
  }

  return updatedBoard;
};


export const deleteDefenseCouncil = async (id: number) => {
  const dc = await prisma.defenseCouncil.findUnique({
    where: { id },
    include: { councilBoard: { select: { defenseDayId: true } } }
  });
  
  if (dc?.councilBoard?.defenseDayId) {
    await ensureDefenseDayNotLocked(dc.councilBoard.defenseDayId);
  }

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
  // Check if locked
  await ensureCouncilBoardNotLocked(data.councilBoardId);

  // C6 — Supervisor conflict check: a topic's supervisor must not be a member of the council
  const [registration, boardMembers] = await Promise.all([
    prisma.topicDefense.findUnique({
      where: { id: data.registrationId },
      include: { topic: { include: { topicSupervisors: true } } },
    }),
    prisma.councilBoardMember.findMany({
      where: { councilBoardId: data.councilBoardId },
      include: { lecturer: { select: { id: true, fullName: true } } },
    }),
  ]);

  if (!registration) throw new AppError(404, "Không tìm thấy đăng ký bảo vệ (TopicDefense)");

  const supervisorIds = new Set(
    registration.topic?.topicSupervisors.map((ts) => ts.lecturerId) ?? [],
  );
  const conflicting = boardMembers.filter((m) => m.lecturerId !== null && supervisorIds.has(m.lecturerId));
  if (conflicting.length > 0) {
    const names = conflicting.map((m) => m.lecturer?.fullName || `ID ${m.lecturerId}`).join(", ");
    throw new AppError(
      409,
      `Xung đột: Giảng viên hướng dẫn của đề tài này (${names}) đang là thành viên chấm của hội đồng được chọn.`,
    );
  }

  let { startTime, endTime } = data;

  return prisma.$transaction(async (tx) => {
    if (!startTime || !endTime) {
      const board = await tx.councilBoard.findUnique({
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

    const created = await tx.defenseCouncil.create({
      data: {
        defenseCouncilCode: code,
        registrationId: data.registrationId,
        councilBoardId: data.councilBoardId,
        startTime: startTime,
        endTime: endTime,
      },
    });

    // Ripple effect to ensure board continuity
    if (created.councilBoardId) {
      await rippleBoard(tx, created.councilBoardId);
    }

    return created;

  });
};


/**
 * getSuitableLecturersForBoard - Find suitable replacements for a council board,
 * returning per-role suitability scores for each candidate.
 */
export const getSuitableLecturersForBoard = async (id: number) => {
  const board = (await councilBoardRepository.findById(id)) as any;
  if (!board) throw new AppError(404, "Không tìm thấy hội đồng bảo vệ");

  const defenseDayId = board.defenseDayId;
  const topics = board.defenseCouncils
    .map((dc: any) => dc.topicDefense?.topic)
    .filter((t: any): t is FullTopic => !!t);

  // 1. Fetch all lecturers for this defense (include role suitabilities)
  const lecturers = await prisma.lecturer.findMany({
    where: {
      lecturerDefenseConfigs: {
        some: { defenseId: board.defenseDay.defenseId },
      },
    },
    include: {
      lecturerDayAvailability: true,
      lecturerRoleSuitabilities: true,
    },
  });

  // 2. Find IDs of lecturers already assigned on this day (excluding this board's current members)
  const otherAssignments = await prisma.councilBoardMember.findMany({
    where: {
      councilBoard: {
        defenseDayId: defenseDayId,
        id: { not: id },
      },
    },
    select: { lecturerId: true },
  });
  const excludedIds = otherAssignments.map((a: any) => a.lecturerId).filter((id: any): id is number => id !== null);

  // 3. Filter candidates
  const candidates = lecturers.filter((l) => {
    const isAvail = l.lecturerDayAvailability.some(
      (a) => a.defenseDayId === defenseDayId && (a.status as string) === "Available"
    );
    const isNotElsewhere = !excludedIds.includes(l.id);
    const isNotSupervisor = isNotSupervisorForAnyTopic(l.id, topics);
    return isAvail && isNotElsewhere && isNotSupervisor;
  });

  // 4. Return per-role suitability for each candidate
  return candidates.map((l) => {
    const suitabilities: Record<string, number> = {};
    for (const role of COUNCIL_ROLES) {
      suitabilities[role] = l.lecturerRoleSuitabilities.find(s => s.role === role)?.suitability ?? 0;
    }
    const isCurrentlyIn = board.councilBoardMembers.some(
      (m: any) => m.lecturerId === l.id
    );
    return {
      id: l.id,
      fullName: l.fullName,
      lecturerCode: l.lecturerCode,
      seniorityLevel: l.seniorityLevel,
      suitabilities,
      isCurrentlyInBoard: isCurrentlyIn,
    };
  });
};

