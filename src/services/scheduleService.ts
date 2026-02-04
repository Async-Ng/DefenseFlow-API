import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import * as councilBoardRepository from "../repositories/councilBoardRepository.js";
import {
  Lecturer,
  Topic,
  DefenseDay,
  LecturerDayAvailability,
  Defense,
  CouncilRole,
  AvailabilityStatus,
  TopicSupervisor,
  LecturerQualification,
  Qualification,
} from "../../generated/prisma/client.js";


interface SchedulingData {
  defense: Defense;
  topics: (Topic & {
    topicSupervisors: (TopicSupervisor & { lecturer: Lecturer })[];
  })[];
  lecturers: (Lecturer & {
    lecturerDayAvailability: LecturerDayAvailability[];
    lecturerQualifications: (LecturerQualification & { qualification: Qualification })[];
  })[];
  defenseDays: DefenseDay[];
  commonQualifications: Qualification[];
}

// Helper to calculate total score for a lecturer
const calculateTotalScore = (lecturer: Lecturer & { lecturerQualifications: (LecturerQualification & { qualification: Qualification })[] }, commonQualificationIds: number[]) => {
  return lecturer.lecturerQualifications.reduce((sum, ls) => {
    // Weight common qualifications higher
    const weight = commonQualificationIds.includes(ls.qualification.id) ? 2 : 1;
    return sum + ((ls.score || 0) * weight);
  }, 0);
};

// Helper to check if a group covers all common qualifications
const checkCommonQualificationCoverage = (group: (Lecturer & { lecturerQualifications: (LecturerQualification & { qualification: Qualification })[] })[], commonQualifications: Qualification[]) => {
  const groupQualificationIds = new Set(
    group.flatMap(l => l.lecturerQualifications.map(ls => ls.qualification.id))
  );
  return commonQualifications.every(s => groupQualificationIds.has(s.id));
};

export const generateSchedule = async (defenseId: number) => {
  // 1. Fetch Data & Validate Pre-conditions
  const data = await fetchSchedulingData(defenseId);
  validatePreConditions(data);

  // 2. Capacity Check (Fail Fast)
  validateCapacity(data);

  // 3. Execution (In-Memory)
  const { scheduled, unscheduled } = runSchedulingAlgorithm(data);

  // 4. Persistence (Transactional)
  await persistSchedule(defenseId, scheduled);

  return {
    status: "success",
    metrics: {
      totalTopics: data.topics.length,
      scheduled: data.topics.length - unscheduled.length,
      unscheduled: unscheduled.length,
    },
    unscheduledTopics: unscheduled.map((t) => t.topicCode),
  };
};

/**
 * Get the generated schedule for a defense
 */
export const getSchedule = async (defenseId: number) => {
  const defense = await prisma.defense.findUnique({
    where: { id: defenseId },
  });

  if (!defense) throw new AppError(404, "Defense not found");

  const councilBoards = await councilBoardRepository.findCouncilBoardsByDefense(defenseId);

  return councilBoards;
};

/**
 * Publish the schedule (Official Release)
 */
export const publishSchedule = async (defenseId: number) => {
  return await prisma.defense.update({
    where: { id: defenseId },
    data: { isSchedulePublished: true },
  });
};

const fetchSchedulingData = async (
  defenseId: number,
): Promise<SchedulingData> => {
  const defense = await prisma.defense.findUnique({
    where: { id: defenseId },
  });

  if (!defense) throw new AppError(404, "Defense not found");

  const topics = await prisma.topic.findMany({
    where: {
      semesterId: defense.semesterId,
      topicDefenseRegistrations: {
        some: {
          defenseId: defenseId,
        },
      },
    },
    include: {
      topicSupervisors: {
        include: {
          lecturer: true,
        },
      },
      topicDefenseRegistrations: {
        where: { defenseId: defenseId },
      },
    },
  });

  const lecturers = await prisma.lecturer.findMany({
    include: {
      lecturerDayAvailability: true,
      lecturerQualifications: {
        include: { qualification: true }
      }
    },
  });

  const defenseDays = await prisma.defenseDay.findMany({
    where: { defenseId },
    orderBy: { dayDate: "asc" },
  });

  const commonQualifications = await prisma.qualification.findMany({
    where: {
      isCommon: true,
    },
  });

  return { defense, topics, lecturers, defenseDays, commonQualifications };
};

const validatePreConditions = (data: SchedulingData) => {
  if (data.defenseDays.length === 0) {
    throw new AppError(400, "No defense days defined for this defense.");
  }
};

const validateCapacity = (data: SchedulingData) => {
  const { defense, topics, defenseDays } = data;
  const timePerTopic = defense.timePerTopic || 45;
  const workHoursPerDay = 8; // Assumption: 8 working hours
  const minutesPerDay = workHoursPerDay * 60;

  const totalMinutesNeeded = topics.length * timePerTopic;
  const totalMinutesAvailable = defenseDays.length * minutesPerDay;

  if (totalMinutesNeeded > totalMinutesAvailable) {
    throw new AppError(
      400,
      `Insufficient capacity. Need ${totalMinutesNeeded} minutes but only have ${totalMinutesAvailable} minutes available across ${defenseDays.length} days.`,
    );
  }
};

interface ScheduledCouncilBoard {
  boardData: {
    presidentId: number;
    secretaryId: number;
    memberIds: number[];
    defenseDayId: number;
  };
  topics: Topic[];
}

const runSchedulingAlgorithm = (data: SchedulingData) => {
  const { defenseDays, lecturers, defense, commonQualifications } = data;
  let unscheduledTopics = [...data.topics];
  const scheduled: ScheduledCouncilBoard[] = [];
  const commonQualificationIds = commonQualifications.map(s => s.id);

  const timePerTopic = defense.timePerTopic || 45;
  const minutesPerDay = 480; // 8 hours
  const maxTopicsPerDay = Math.floor(minutesPerDay / timePerTopic);

  // Helper to check availability
  const isAvailable = (lecturerId: number, dayId: number): boolean => {
    const lecturer = lecturers.find((l) => l.id === lecturerId);
    if (!lecturer) return false;
    const availability = lecturer.lecturerDayAvailability.find(
      (a) => a.defenseDayId === dayId,
    );
     // Explicit 'Busy' prevents scheduling. Missing record or 'Available' allows it.
    return !availability || availability.status !== AvailabilityStatus.Busy;
  };

  // Track assigned lecturers per day
  const dailyAssignedLecturers = new Map<number, Set<number>>(); // dayId -> Set(lecturerIds)

  for (const day of defenseDays) {
    if (unscheduledTopics.length === 0) break;

    if (!dailyAssignedLecturers.has(day.id)) {
      dailyAssignedLecturers.set(day.id, new Set());
    }
    const assignedForDay = dailyAssignedLecturers.get(day.id)!;
    let topicsScheduledToday = 0;

    // Try to form boards and fill the day
    let continueDay = true;
    while (continueDay && unscheduledTopics.length > 0 && topicsScheduledToday < maxTopicsPerDay) {
      
      const remainingSlotsToday = maxTopicsPerDay - topicsScheduledToday;
      if (remainingSlotsToday <= 0) break;

      // 1. Identify Candidates
      const candidates = lecturers.filter(
        (l) => !assignedForDay.has(l.id) && isAvailable(l.id, day.id),
      );

      if (candidates.length < 5) {
        continueDay = false;
        break;
      }

      // 2. Select Board Members (Score-Based)
      // Sort by total score (descending)
      const sortedCandidates = [...candidates].sort((a, b) => 
        calculateTotalScore(b, commonQualificationIds) - calculateTotalScore(a, commonQualificationIds)
      );

      // Simple Greedy: Pick top 5
      const selectedGroup = sortedCandidates.slice(0, 5);

      // Verify Common Qualifications Coverage
      if (!checkCommonQualificationCoverage(selectedGroup, commonQualifications)) {
        // Warning or retry logic
      }

      const president = selectedGroup[0];
      const secretary = selectedGroup[1];
      const members = selectedGroup.slice(2);
      
      const boardMemberIds = [president.id, secretary.id, ...members.map((m) => m.id)];

      // 3. Select Topics for this Board
      const compatibleTopics = unscheduledTopics.filter((topic) => {
        const supervisors = topic.topicSupervisors.map((ts) => ts.lecturerId);
        return !supervisors.some((sId) => boardMemberIds.includes(sId));
      });

      if (compatibleTopics.length === 0) {
        // Skip this president/group
        assignedForDay.add(president.id); 
        continue; 
      }

      // Assign topics
      const assignedTopics = compatibleTopics.slice(0, remainingSlotsToday);

      // 4. Commit Board
      scheduled.push({
        boardData: {
          presidentId: president.id,
          secretaryId: secretary.id,
          memberIds: members.map((m) => m.id),
          defenseDayId: day.id,
        },
        topics: assignedTopics,
      });

      // Mark lecturers as assigned
      boardMemberIds.forEach((id) => assignedForDay.add(id));

      // Update state
      const assignedIds = new Set(assignedTopics.map((t) => t.id));
      unscheduledTopics = unscheduledTopics.filter((t) => !assignedIds.has(t.id));
      topicsScheduledToday += assignedTopics.length;
    }
  }

  return { scheduled, unscheduled: unscheduledTopics };
};

const persistSchedule = async (defenseId: number, scheduled: ScheduledCouncilBoard[]) => {
  const defense = await prisma.defense.findUnique({ where: { id: defenseId } });
  if (!defense) throw new AppError(404, "Defense not found");

  const timePerTopic = defense.timePerTopic || 45;
  const startHourStr = defense.workStartTime || "07:30"; // Default start time

  await prisma.$transaction(async (tx) => {
    // 1. Clear old data
    const oldBoards = await tx.councilBoard.findMany({
      where: { defenseDay: { defenseId } }
    });
    
    // Delete defense councils (matches)
    await tx.defenseCouncil.deleteMany({
      where: { councilBoardId: { in: oldBoards.map(c => c.id) } }
    });

    // Delete council members
    await tx.councilBoardMember.deleteMany({
      where: { councilBoardId: { in: oldBoards.map(c => c.id) } }
    });

    // Delete council boards
    await tx.councilBoard.deleteMany({
      where: { defenseDay: { defenseId } }
    });

    // 2. Create new data
    const dayTimeCursors = new Map<number, number>(); // defenseDayId -> minutes from midnight

    const [startH, startM] = startHourStr.split(":").map(Number);
    const startMinutesFromMidnight = startH * 60 + startM;

    for (const item of scheduled) {
      // Initialize cursor for this day if new
      if (!dayTimeCursors.has(item.boardData.defenseDayId)) {
        dayTimeCursors.set(item.boardData.defenseDayId, startMinutesFromMidnight);
      }
      let currentCursor = dayTimeCursors.get(item.boardData.defenseDayId)!;

      // Create Council Board
      const board = await tx.councilBoard.create({
        data: {
          boardCode: `CB-${defenseId}-${item.boardData.defenseDayId}-${Math.floor(Math.random() * 10000)}`,
          defenseDayId: item.boardData.defenseDayId,
          semesterId: item.topics[0]?.semesterId || defense.semesterId,
          name: "Defense Council Board",
          councilBoardMembers: {
            create: [
              { lecturerId: item.boardData.presidentId, role: CouncilRole.President },
              { lecturerId: item.boardData.secretaryId, role: CouncilRole.Secretary },
              ...item.boardData.memberIds.map((id) => ({
                lecturerId: id,
                role: CouncilRole.Member,
              })),
            ],
          },
        },
      });

      // Create Matches with Time
      for (const topic of item.topics) {
        const reg = (topic as any).topicDefenseRegistrations?.[0];
        if (!reg) continue;

        // Calculate Time
        const startTotalMins = currentCursor;
        const endTotalMins = currentCursor + timePerTopic;

        // Convert back to Date/Time objects
        const startTime = new Date();
        startTime.setHours(Math.floor(startTotalMins / 60), startTotalMins % 60, 0, 0);
        
        const endTime = new Date();
        endTime.setHours(Math.floor(endTotalMins / 60), endTotalMins % 60, 0, 0);

        await tx.defenseCouncil.create({
          data: {
            defenseCouncilCode: `DC-${topic.topicCode}`,
            registrationId: reg.id,
            councilBoardId: board.id,
            startTime: startTime,
            endTime: endTime,
          },
        });

        // Advance cursor
        currentCursor += timePerTopic;
      }

      // Update cursor for this day
      dayTimeCursors.set(item.boardData.defenseDayId, currentCursor);
    }
  });
};

/**
 * Update a defense council match (Manual Scheduling)
 */
export const updateDefenseCouncil = async (
  defenseCouncilId: number,
  data: {
    startTime?: Date;
    endTime?: Date;
    councilBoardId?: number;
  },
) => {
  const dc = await prisma.defenseCouncil.findUnique({
    where: { id: defenseCouncilId },
  });
  if (!dc) throw new AppError(404, "Defense Council not found");

  // Validate Board if changing
  if (data.councilBoardId && data.councilBoardId !== dc.councilBoardId) {
    const board = await prisma.councilBoard.findUnique({
      where: { id: data.councilBoardId },
    });
    if (!board) throw new AppError(404, "Target council board not found");
  }

  // Perform Update
  return await prisma.defenseCouncil.update({
    where: { id: defenseCouncilId },
    data: {
      startTime: data.startTime,
      endTime: data.endTime,
      councilBoardId: data.councilBoardId,
    },
  });
};

/**
 * Update a council board (Manual Scheduling)
 */
export const updateCouncilBoard = async (
  councilBoardId: number,
  data: {
    presidentId?: number;
    secretaryId?: number;
    memberIds?: number[];
  },
) => {
  const board = await prisma.councilBoard.findUnique({
    where: { id: councilBoardId },
    include: { councilBoardMembers: true },
  });
  if (!board) throw new AppError(404, "Council Board not found");

  return await prisma.$transaction(async (tx) => {
    // 1. Determine new member set
    const currentMembers = board.councilBoardMembers;
    const currentPresidentId = currentMembers.find(m => m.role === CouncilRole.President)?.lecturerId;
    const currentSecretaryId = currentMembers.find(m => m.role === CouncilRole.Secretary)?.lecturerId;
    const currentMemberIds = currentMembers.filter(m => m.role === CouncilRole.Member).map(m => m.lecturerId!);

    const newPresidentId = data.presidentId ?? currentPresidentId;
    const newSecretaryId = data.secretaryId ?? currentSecretaryId;
    const newMemberIds = data.memberIds ?? currentMemberIds;

    // 2. Clear old members
    await tx.councilBoardMember.deleteMany({
      where: { councilBoardId },
    });

    // 3. Create new members
    const membersToCreate = [
      { lecturerId: newPresidentId!, role: CouncilRole.President },
      { lecturerId: newSecretaryId!, role: CouncilRole.Secretary },
      ...newMemberIds.map(id => ({ lecturerId: id, role: CouncilRole.Member }))
    ];

    await tx.councilBoardMember.createMany({
      data: membersToCreate.map(m => ({
        councilBoardId,
        lecturerId: m.lecturerId,
        role: m.role
      }))
    });

    return tx.councilBoard.findUnique({
      where: { id: councilBoardId },
      include: { councilBoardMembers: true }
    });
  });
};
