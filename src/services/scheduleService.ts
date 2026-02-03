import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import * as councilRepository from "../repositories/councilRepository.js";
import {
  Lecturer,
  Topic,
  SessionDay,
  LecturerDayAvailability,
  Session,
  CouncilRole,
  AvailabilityStatus,
  TopicSupervisor,
} from "../../generated/prisma/client.js";

interface SchedulingData {
  session: Session;
  topics: (Topic & {
    topicSupervisors: (TopicSupervisor & { lecturer: Lecturer })[];
  })[];
  lecturers: (Lecturer & {
    lecturerDayAvailability: LecturerDayAvailability[];
  })[];
  sessionDays: SessionDay[];
}

export const generateSchedule = async (sessionId: number) => {
  // 1. Fetch Data & Validate Pre-conditions
  const data = await fetchSchedulingData(sessionId);
  validatePreConditions(data);

  // 2. Capacity Check (Fail Fast)
  validateCapacity(data);

  // 3. Execution (In-Memory)
  const { scheduled, unscheduled } = runSchedulingAlgorithm(data);

  // 4. Persistence (Transactional)
  await persistSchedule(sessionId, scheduled);

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
 * Get the generated schedule for a session
 * Restrict access based on publication status if needed (handled in controller usually, but safe to add logic here)
 */
export const getSchedule = async (sessionId: number) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) throw new AppError(404, "Session not found");

  const councils = await councilRepository.findCouncilsBySession(sessionId);

  return councils;
};

/**
 * Publish the schedule (Official Release)
 */
export const publishSchedule = async (sessionId: number) => {
  return await prisma.session.update({
    where: { id: sessionId },
    data: { isSchedulePublished: true },
  });
};

const fetchSchedulingData = async (
  sessionId: number,
): Promise<SchedulingData> => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) throw new AppError(404, "Session not found");

  const topics = await prisma.topic.findMany({
    where: {
      semesterId: session.semesterId,
      topicSessionRegistrations: {
        some: {
          sessionId: sessionId,
        },
      },
    },
    include: {
      topicSupervisors: {
        include: {
          lecturer: true,
        },
      },
      topicSessionRegistrations: {
        where: { sessionId: sessionId },
      },
    },
  });

  const lecturers = await prisma.lecturer.findMany({
    include: {
      lecturerDayAvailability: true,
    },
  });

  const sessionDays = await prisma.sessionDay.findMany({
    where: { sessionId },
    orderBy: { dayDate: "asc" },
  });

  return { session, topics, lecturers, sessionDays };
};

const validatePreConditions = (data: SchedulingData) => {
  if (data.sessionDays.length === 0) {
    throw new AppError(400, "No session days defined for this session.");
  }
};

const validateCapacity = (data: SchedulingData) => {
  const { session, topics, sessionDays } = data;
  const timePerTopic = session.timePerTopic || 45;
  const workHoursPerDay = 8; // Assumption: 8 working hours
  const minutesPerDay = workHoursPerDay * 60;

  const totalMinutesNeeded = topics.length * timePerTopic;
  const totalMinutesAvailable = sessionDays.length * minutesPerDay;

  if (totalMinutesNeeded > totalMinutesAvailable) {
    throw new AppError(
      400,
      `Insufficient capacity. Need ${totalMinutesNeeded} minutes but only have ${totalMinutesAvailable} minutes available across ${sessionDays.length} days.`,
    );
  }
};

interface ScheduledCouncil {
  councilData: {
    presidentId: number;
    secretaryId: number;
    memberIds: number[];
    sessionDayId: number;
  };
  topics: Topic[];
}

const runSchedulingAlgorithm = (data: SchedulingData) => {
  const { sessionDays, lecturers, session } = data;
  let unscheduledTopics = [...data.topics];
  const scheduled: ScheduledCouncil[] = [];

  const timePerTopic = session.timePerTopic || 45;
  const minutesPerDay = 480; // 8 hours
  const maxTopicsPerDay = Math.floor(minutesPerDay / timePerTopic);

  // Helper to check availability
  const isAvailable = (lecturerId: number, dayId: number): boolean => {
    const lecturer = lecturers.find((l) => l.id === lecturerId);
    if (!lecturer) return false;
    const availability = lecturer.lecturerDayAvailability.find(
      (a) => a.sessionDayId === dayId,
    );
    // Explicit 'Busy' prevents scheduling. Missing record or 'Available' allows it.
    return !availability || availability.status !== AvailabilityStatus.Busy;
  };

  // Track assigned lecturers per day
  const dailyAssignedLecturers = new Map<number, Set<number>>(); // dayId -> Set(lecturerIds)

  for (const day of sessionDays) {
    if (unscheduledTopics.length === 0) break;

    if (!dailyAssignedLecturers.has(day.id)) {
      dailyAssignedLecturers.set(day.id, new Set());
    }
    const assignedForDay = dailyAssignedLecturers.get(day.id)!;
    let topicsScheduledToday = 0;

    // Try to form councils and fill the day
    let continueDay = true;
    while (continueDay && unscheduledTopics.length > 0 && topicsScheduledToday < maxTopicsPerDay) {
      
      // Calculate remaining slots for today
      // Logic: A council can handle multiple topics. 
      // Current simplified logic: One council structure per "Shift" or per "Batch"? 
      // The previous logic created 1 council for ~5 topics.
      // Let's keep the logic of forming a council and assigning as many topics as valid (up to limit).
      
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

      // 2. Select Council Members (Greedy)
      const presidents = candidates.filter((l) => l.isPresidentQualified);
      if (presidents.length === 0) { continueDay = false; break; }
      const president = presidents[0];

      const secretaries = candidates.filter((l) => l.isSecretaryQualified && l.id !== president.id);
      if (secretaries.length === 0) { continueDay = false; break; }
      const secretary = secretaries[0];

      const remaining = candidates.filter((l) => l.id !== president.id && l.id !== secretary.id);
      if (remaining.length < 3) { continueDay = false; break; }
      const members = remaining.slice(0, 3);

      const councilIds = [president.id, secretary.id, ...members.map((m) => m.id)];

      // 3. Select Topics for this Council
      const compatibleTopics = unscheduledTopics.filter((topic) => {
        const supervisors = topic.topicSupervisors.map((ts) => ts.lecturerId);
        return !supervisors.some((sId) => councilIds.includes(sId));
      });

      if (compatibleTopics.length === 0) {
        // Skip this president to avoid infinite loop on same candidate
        assignedForDay.add(president.id); 
        // Note: This is a hack to force different selection next iteration. 
        // Ideally we would try next president without burning this one, but strict greedy is tricky.
        continue; 
      }

      // Assign topics (up to remaining slots or max per council logic if any)
      // We fill the council with as many as possible to maximize efficiency
      const assignedTopics = compatibleTopics.slice(0, remainingSlotsToday);

      // 4. Commit Council
      scheduled.push({
        councilData: {
          presidentId: president.id,
          secretaryId: secretary.id,
          memberIds: members.map((m) => m.id),
          sessionDayId: day.id,
        },
        topics: assignedTopics,
      });

      // Mark lecturers as assigned
      councilIds.forEach((id) => assignedForDay.add(id));

      // Update state
      const assignedIds = new Set(assignedTopics.map((t) => t.id));
      unscheduledTopics = unscheduledTopics.filter((t) => !assignedIds.has(t.id));
      topicsScheduledToday += assignedTopics.length;
    }
  }

  return { scheduled, unscheduled: unscheduledTopics };
};

const persistSchedule = async (sessionId: number, scheduled: ScheduledCouncil[]) => {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new AppError(404, "Session not found");

  const timePerTopic = session.timePerTopic || 45;
  const startHourStr = session.workStartTime || "07:30"; // Default start time

  await prisma.$transaction(async (tx) => {
    // 1. Clear old data
    // Need to find councils first to delete matches? Prisma cascade should handle if configured.
    // Assuming manual cleanup for safety or if cascade missing.
    // Fetch old councils
    const oldCouncils = await tx.council.findMany({
      where: { sessionDay: { sessionId } }
    });
    
    // Delete matches (if not cascaded)
    await tx.defenseMatch.deleteMany({
      where: { councilId: { in: oldCouncils.map(c => c.id) } }
    });

    // Delete councils
    await tx.council.deleteMany({
      where: { sessionDay: { sessionId } }
    });

    // 2. Create new data
    // We need to track the "current time" cursor for each day to schedule topics sequentially across councils
    const dayTimeCursors = new Map<number, number>(); // dayId -> minutes from midnight

    const [startH, startM] = startHourStr.split(":").map(Number);
    const startMinutesFromMidnight = startH * 60 + startM;

    for (const item of scheduled) {
      // Initialize cursor for this day if new
      if (!dayTimeCursors.has(item.councilData.sessionDayId)) {
        dayTimeCursors.set(item.councilData.sessionDayId, startMinutesFromMidnight);
      }
      let currentCursor = dayTimeCursors.get(item.councilData.sessionDayId)!;

      // Create Council
      const council = await tx.council.create({
        data: {
          councilCode: `CNCL-${sessionId}-${item.councilData.sessionDayId}-${Math.floor(Math.random() * 10000)}`,
          sessionDayId: item.councilData.sessionDayId,
          semesterId: item.topics[0]?.semesterId || session.semesterId,
          name: "Defense Council",
          councilMembers: {
            create: [
              { lecturerId: item.councilData.presidentId, role: CouncilRole.President },
              { lecturerId: item.councilData.secretaryId, role: CouncilRole.Secretary },
              ...item.councilData.memberIds.map((id) => ({
                lecturerId: id,
                role: CouncilRole.Member,
              })),
            ],
          },
        },
      });

      // Create Matches with Time
      for (const topic of item.topics) {
        const reg = (topic as any).topicSessionRegistrations?.[0];
        if (!reg) continue;

        // Calculate Time
        const startTotalMins = currentCursor;
        const endTotalMins = currentCursor + timePerTopic;

        // Convert back to Date/Time objects (Prisma Time is DateTime usually 1970-01-01)
        const startTime = new Date();
        startTime.setHours(Math.floor(startTotalMins / 60), startTotalMins % 60, 0, 0);
        
        const endTime = new Date();
        endTime.setHours(Math.floor(endTotalMins / 60), endTotalMins % 60, 0, 0);

        await tx.defenseMatch.create({
          data: {
            matchCode: `MATCH-${topic.topicCode}`,
            registrationId: reg.id,
            councilId: council.id,
            startTime: startTime,
            endTime: endTime,
          },
        });

        // Advance cursor
        currentCursor += timePerTopic;
      }

      // Update cursor for this day
      dayTimeCursors.set(item.councilData.sessionDayId, currentCursor);
    }
  });
};

/**
 * Update a defense match (Manual Scheduling)
 * Allows changing time or moving to a different council.
 */
export const updateMatch = async (
  matchId: number,
  data: {
    startTime?: Date;
    endTime?: Date;
    councilId?: number;
  },
) => {
  const match = await prisma.defenseMatch.findUnique({
    where: { id: matchId },
  });
  if (!match) throw new AppError(404, "Match not found");

  // Validate Council if changing
  if (data.councilId && data.councilId !== match.councilId) {
    const council = await prisma.council.findUnique({
      where: { id: data.councilId },
    });
    if (!council) throw new AppError(404, "Target council not found");
  }

  // Perform Update
  return await prisma.defenseMatch.update({
    where: { id: matchId },
    data: {
      startTime: data.startTime,
      endTime: data.endTime,
      councilId: data.councilId,
    },
  });
};

/**
 * Update a council (Manual Scheduling)
 * Allows changing members.
 */
export const updateCouncil = async (
  councilId: number,
  data: {
    presidentId?: number;
    secretaryId?: number;
    memberIds?: number[];
  },
) => {
  const council = await prisma.council.findUnique({
    where: { id: councilId },
    include: { councilMembers: true },
  });
  if (!council) throw new AppError(404, "Council not found");

  return await prisma.$transaction(async (tx) => {
    // 1. Determine new member set
    const currentMembers = council.councilMembers;
    const currentPresidentId = currentMembers.find(m => m.role === CouncilRole.President)?.lecturerId;
    const currentSecretaryId = currentMembers.find(m => m.role === CouncilRole.Secretary)?.lecturerId;
    const currentMemberIds = currentMembers.filter(m => m.role === CouncilRole.Member).map(m => m.lecturerId!);

    const newPresidentId = data.presidentId ?? currentPresidentId;
    const newSecretaryId = data.secretaryId ?? currentSecretaryId;
    const newMemberIds = data.memberIds ?? currentMemberIds;

    // Validate inputs (basic check)
    if (!newPresidentId || !newSecretaryId || newMemberIds.length === 0) {
       // Allow partial updates or enforce complete council?
       // For now, assume inputs must result in valid council structure if replacing.
    }

    // 2. Clear old members
    await tx.councilMember.deleteMany({
      where: { councilId },
    });

    // 3. Create new members
    const membersToCreate = [
      { lecturerId: newPresidentId!, role: CouncilRole.President },
      { lecturerId: newSecretaryId!, role: CouncilRole.Secretary },
      ...newMemberIds.map(id => ({ lecturerId: id, role: CouncilRole.Member }))
    ];

    await tx.councilMember.createMany({
      data: membersToCreate.map(m => ({
        councilId,
        lecturerId: m.lecturerId,
        role: m.role
      }))
    });

    return tx.council.findUnique({
      where: { id: councilId },
      include: { councilMembers: true }
    });
  });
};
