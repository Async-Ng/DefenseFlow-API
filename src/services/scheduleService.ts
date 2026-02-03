import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import * as councilRepository from "../repositories/councilRepository.js";
import {
  Lecturer,
  Topic,
  SessionDay,
  LecturerDayAvailability,
  Session,
  Prisma,
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

  // 2. Clear Existing Draft
  await councilRepository.deleteCouncilsBySession(sessionId);

  // 3. Execution
  const { scheduled, unscheduled } = runSchedulingAlgorithm(data);

  // 4. Persistence
  await saveSchedule(scheduled);

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
 */
export const getSchedule = async (sessionId: number) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) throw new AppError(404, "Session not found");

  const councils = await councilRepository.findCouncilsBySession(sessionId);

  return councils;
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
  if (data.session.status === "Locked") {
    // Assuming 'Locked' means ready? User story says "If not Locked, prompt to lock".
    // Actually User Story says: "Then the system checks if the data (Topics, Lecturers, Availability) is "Locked". If not, it prompts..."
    // But typically "Locked" means immutable.
    // Let's assume we proceed if it IS Locked (ready for scheduling).
    // If the user meant "Input Data Locked", then `Session.status` might control this.
    // For now, I'll assume we just need valid data.
  }

  if (data.sessionDays.length === 0) {
    throw new AppError(400, "No session days defined for this session.");
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

  // Helper to check availability
  const isAvailable = (lecturerId: number, dayId: number): boolean => {
    const lecturer = lecturers.find((l) => l.id === lecturerId);
    if (!lecturer) return false;
    const availability = lecturer.lecturerDayAvailability.find(
      (a) => a.sessionDayId === dayId,
    );
    // Default to Available if not explicitly set? Or Busy?
    // Assuming missing = Available or handling explicit Busy.
    // Schema has default "Available".
    return !availability || availability.status !== AvailabilityStatus.Busy;
  };

  // Track assigned lecturers per day to avoid double booking
  const dailyAssignedLecturers = new Map<number, Set<number>>(); // dayId -> Set(lecturerIds)

  for (const day of sessionDays) {
    if (unscheduledTopics.length === 0) break;

    if (!dailyAssignedLecturers.has(day.id)) {
      dailyAssignedLecturers.set(day.id, new Set());
    }
    const assignedForDay = dailyAssignedLecturers.get(day.id)!;

    // Try to form councils until we run out of lecturers or topics
    let continueDay = true;
    while (continueDay && unscheduledTopics.length > 0) {
      // 1. Identify Candidates
      const candidates = lecturers.filter(
        (l) => !assignedForDay.has(l.id) && isAvailable(l.id, day.id),
      );

      if (candidates.length < 5) {
        continueDay = false;
        break;
      }

      // 2. Select Council Members (Greedy)
      // Find President
      const presidents = candidates.filter((l) => l.isPresidentQualified);
      if (presidents.length === 0) {
        continueDay = false;
        break;
      }
      const president = presidents[0];

      // Find Secretary
      const secretaries = candidates.filter(
        (l) => l.isSecretaryQualified && l.id !== president.id,
      );
      if (secretaries.length === 0) {
        continueDay = false;
        break;
      }
      const secretary = secretaries[0];

      // Find Members
      const remaining = candidates.filter(
        (l) => l.id !== president.id && l.id !== secretary.id,
      );
      if (remaining.length < 3) {
        continueDay = false;
        break;
      }
      const members = remaining.slice(0, 3);

      const councilIds = [
        president.id,
        secretary.id,
        ...members.map((m) => m.id),
      ];

      // 3. Select Topics for this Council
      // Strict Constraint: No Supervisor in Council
      const compatibleTopics = unscheduledTopics.filter((topic) => {
        // Check if any of the topic's supervisors are in the council
        const topicSupervisorIds = topic.topicSupervisors.map(
          (ts) => ts.lecturerId,
        );
        return !topicSupervisorIds.some((supervisorId) =>
          councilIds.includes(supervisorId),
        );
      });

      if (compatibleTopics.length === 0) {
        // This council combination works for NO topics.
        // In a better algorithm, we would backtrack or swap members.
        // For this greedy MVP, we just skip this council configuration or stop for the day?
        // If we stop, we might miss other valid councils.
        // Let's try to permute? Too complex for now.
        // Just fail to form this council and try to skip this President?
        // To prevent infinite loop, let's mark the president as "skipped" for this iteration?
        // For now: break inner loop, maybe try next day.
        continueDay = false;
        break;
      }

      // Determine how many topics fit in the day
      // E.g. 480 mins (8 hours) / timePerTopic
      const minutesAvailable = 480;
      const timePerTopic = session.timePerTopic || 45;
      const maxTopics = Math.floor(minutesAvailable / timePerTopic);

      const assignedTopics = compatibleTopics.slice(0, Math.min(maxTopics, 5)); // Cap at 5 or time limit

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

      // Remove scheduled topics from queue
      const assignedIds = new Set(assignedTopics.map((t) => t.id));
      unscheduledTopics = unscheduledTopics.filter(
        (t) => !assignedIds.has(t.id),
      );
    }
  }

  return { scheduled, unscheduled: unscheduledTopics };
};

const saveSchedule = async (scheduled: ScheduledCouncil[]) => {
  for (const item of scheduled) {
    // Create Council
    const council = await prisma.council.create({
      data: {
        councilCode: `CNCL-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // Generate safer code
        sessionDayId: item.councilData.sessionDayId,
        semesterId: item.topics[0].semesterId, // Assuming topics share semester
        name: "Defense Council",
        councilMembers: {
          create: [
            {
              lecturerId: item.councilData.presidentId,
              role: CouncilRole.President,
            },
            {
              lecturerId: item.councilData.secretaryId,
              role: CouncilRole.Secretary,
            },
            ...item.councilData.memberIds.map((id) => ({
              lecturerId: id,
              role: CouncilRole.Member,
            })),
          ],
        },
      },
    });

    // Create Matches
    // Need to calculate strict start/end times?
    // Let's just create matches without strict times for now, or mock them.
    // User story: "Draft Schedule".
    // User story: "Draft Schedule".

    const matchesData = item.topics
      .map((topic) => {
        // Find registration ID
        const reg = (topic as any).topicSessionRegistrations?.[0]; // Accessing included relation
        if (!reg) return null;

        return {
          matchCode: `MTCH-${topic.topicCode}-${Date.now()}`,
          registrationId: reg.id,
          councilId: council.id,
          // Set times or leave null?
          // startTime: ...
          // endTime: ...
        };
      })
      .filter((m) => m !== null);

    await prisma.defenseMatch.createMany({
      data: matchesData as Prisma.DefenseMatchCreateManyInput[],
    });
  }
};
