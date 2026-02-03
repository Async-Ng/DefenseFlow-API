
import { prisma } from "../config/prisma.js";
import { generateSchedule, publishSchedule, updateMatch } from "../services/scheduleService.js";
import { updateAvailability } from "../services/availabilityService.js";
import { AvailabilityStatus } from "../../generated/prisma/client.js";

async function main() {
  console.log("Starting Schedule Flow Verification...");

  // 1. Setup Test Data
  console.log("1. Setting up Test Data...");
  
  // Cleanup
  const existingSession = await prisma.session.findUnique({ where: { sessionCode: "TEST-SCHED-01" } });
  if (existingSession) {
      // Clean up dependencies manually
      await prisma.defenseMatch.deleteMany({ where: { council: { sessionDay: { sessionId: existingSession.id } } } }); // Clear matches
      await prisma.councilMember.deleteMany({ where: { council: { sessionDay: { sessionId: existingSession.id } } } }); // Clear members
      await prisma.council.deleteMany({ where: { sessionDay: { sessionId: existingSession.id } } });
      
      // Clear Registrations
      await prisma.topicSessionRegistration.deleteMany({ where: { sessionId: existingSession.id } });

      await prisma.sessionDay.deleteMany({ where: { sessionId: existingSession.id } });
      
      // Now delete topics related to this test semester? 
      // Be careful not to delete other topics if semester is shared.
      // Assuming Test Semester is isolated or we filter by code.
      // Actually, safest is to delete Topics created by this script.
      // But clearing by semesterId is risky if semester is reused.
      // Let's rely on finding existingSession and only clearing its registrations.
      // The script creates a new Topic every time?
      
      // Let's delete topics that match our test code pattern
      await prisma.topic.deleteMany({ where: { topicCode: "TP-TEST-01" } });

      await prisma.lecturer.deleteMany({ where: { email: { contains: "test-lecturer" } } });
      await prisma.session.delete({ where: { id: existingSession.id } });
  }

  // Create Semester
  const semester = await prisma.semester.findFirst() || await prisma.semester.create({
      data: { semesterCode: "FA24-TEST", name: "Fall 2024" }
  });

  // Create Session with Window (Future)
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
  
  const session = await prisma.session.create({
    data: {
      sessionCode: "TEST-SCHED-01",
      name: "Test Schedule Session",
      semesterId: semester.id,
      timePerTopic: 45,
      workStartTime: "08:00",
      isSchedulePublished: false,
      availabilityStartDate: tomorrow,
      availabilityEndDate: nextWeek
    }
  });

  // Create Session Days
  const sd1 = await prisma.sessionDay.create({
      data: { sessionId: session.id, dayDate: nextWeek, sessionDayCode: "SD-01" }
  });

  // Create Lecturers
  const lecturers = [];
  for(let i=1; i<=6; i++) {
      lecturers.push(await prisma.lecturer.create({
          data: {
              lecturerCode: `LEC-${i}`,
              email: `test-lecturer-${i}@fpt.edu.vn`,
              fullName: `Lecturer ${i}`,
              isPresidentQualified: i <= 2,
              isSecretaryQualified: i <= 4
          }
      }));
  }

  // Create Topic
  const topic = await prisma.topic.create({
      data: {
          topicCode: "TP-TEST-01",
          title: "Test Topic Title",
          semesterId: semester.id
      }
  });

  // Register Topic to Session
  await prisma.topicSessionRegistration.create({
      data: {
          topicId: topic.id,
          sessionId: session.id,
          registrationCode: `REG-TEST-01`,
          finalResult: "Pending" // SessionResult enum
      }
  });


  // 2. Generate Schedule
  console.log("2. Generating Schedule...");
  // Set Availability for Lecturers (Force Valid)
  // But wait, availability window is FUTURE. Updating availability now should FAIL?
  // Logic: "Current time is within session.availabilityStartDate and ...EndDate"
  // Defined window: tomorrow -> nextWeek.
  // Current time: now.
  // now < tomorrow. So window is NOT open yet.
  
  console.log("   Testing Availability Window (Should fail)...");
  try {
      await updateAvailability(lecturers[0].id, sd1.id, AvailabilityStatus.Busy);
      console.error("   ❌ Failed: Should have thrown error for future window.");
  } catch (e: any) {
      if (e.message.includes("not started")) {
          console.log("   ✅ Correctly blocked future window.");
      } else {
          console.error("   ❌ Failed with unexpected error: " + e.message);
      }
  }

  // Hack window to be open for setup
  await prisma.session.update({
      where: { id: session.id },
      data: { availabilityStartDate: new Date() }
  });

  // Set Availability
  await updateAvailability(lecturers[0].id, sd1.id, AvailabilityStatus.Available);

  const result = await generateSchedule(session.id);
  console.log("   Generation Result:", result.status);
  
  const councils = await prisma.council.findMany({ where: { sessionDay: { sessionId: session.id } } });
  console.log(`   Generated ${councils.length} councils.`);
  if (councils.length > 0) {
      const matches = await prisma.defenseMatch.findMany({ where: { councilId: councils[0].id } });
      console.log(`   Generated ${matches.length} matches.`);
      
      if (matches.length > 0) {
          // 3. Manual Update
          console.log("3. Testing Manual Update...");
          const match = matches[0];
          const newTime = new Date(match.startTime!);
          newTime.setHours(newTime.getHours() + 1);
          
          await updateMatch(match.id, { startTime: newTime });
          const updated = await prisma.defenseMatch.findUnique({ where: { id: match.id } });
          if (updated?.startTime?.getTime() === newTime.getTime()) {
              console.log("   ✅ Manual update successful.");
          } else {
              console.error("   ❌ Manual update failed.");
          }
      }
  }

  // 4. Publish
  console.log("4. Testing Publish...");
  await publishSchedule(session.id);
  const updatedSession = await prisma.session.findUnique({ where: { id: session.id } });
  if (updatedSession?.isSchedulePublished) {
      console.log("   ✅ Schedule published.");
  } else {
      console.error("   ❌ Publish failed.");
  }

  console.log("Verification Complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
