
import { prisma } from "../config/prisma.js";
import { generateSchedule, publishSchedule, updateDefenseCouncil } from "../services/scheduleService.js";
import { updateAvailability } from "../services/availabilityService.js";
import { AvailabilityStatus } from "../../generated/prisma/client.js";


async function main() {
  console.log("Starting Defense Flow Verification...");

  // 1. Setup Test Data
  console.log("1. Setting up Test Data...");
  
  // Cleanup
  const existingDefense = await prisma.defense.findUnique({ where: { defenseCode: "TEST-SCHED-01" } });
  if (existingDefense) {
      // Clean up dependencies manually
      await prisma.defenseCouncil.deleteMany({ where: { councilBoard: { defenseDay: { defenseId: existingDefense.id } } } }); // Clear matches
      await prisma.councilBoardMember.deleteMany({ where: { councilBoard: { defenseDay: { defenseId: existingDefense.id } } } }); // Clear members
      await prisma.councilBoard.deleteMany({ where: { defenseDay: { defenseId: existingDefense.id } } });
      
      // Clear Registrations
      await prisma.topicDefenseRegistration.deleteMany({ where: { defenseId: existingDefense.id } });

      await prisma.defenseDay.deleteMany({ where: { defenseId: existingDefense.id } });
      
      // Delete topics
      await prisma.topic.deleteMany({ where: { topicCode: "TP-TEST-01" } });

      const testCodes = Array.from({ length: 6 }, (_, i) => `LEC-${i + 1}`);
      await prisma.lecturerQualification.deleteMany({
        where: {
          OR: [
            { lecturer: { email: { contains: "test-lecturer" } } },
            { lecturer: { lecturerCode: { in: testCodes } } }
          ]
        } 
      });
      await prisma.topicSupervisor.deleteMany({
        where: {
          OR: [
             { lecturer: { email: { contains: "test-lecturer" } } },
             { lecturer: { lecturerCode: { in: testCodes } } }
          ]
        }
      });
      await prisma.councilBoardMember.deleteMany({ where: { lecturer: { lecturerCode: { in: testCodes } } } });

      await prisma.lecturer.deleteMany({
        where: {
          OR: [
            { email: { contains: "test-lecturer" } },
            { lecturerCode: { in: testCodes } }
          ]
        }
      });
      await prisma.defense.delete({ where: { id: existingDefense.id } });
  }

  // Create Semester
  const semester = await prisma.semester.findFirst() || await prisma.semester.create({
      data: { semesterCode: "FA24-TEST", name: "Fall 2024" }
  });

  // Create Defense with Window (Future)
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
  
  const defense = await prisma.defense.create({
    data: {
      defenseCode: "TEST-SCHED-01",
      name: "Test Schedule Defense",
      semesterId: semester.id,
      timePerTopic: 45,
      workStartTime: "08:00",
      isSchedulePublished: false,
      availabilityStartDate: tomorrow,
      availabilityEndDate: nextWeek
    }
  });

  // Create Defense Days
  const sd1 = await prisma.defenseDay.create({
      data: { defenseId: defense.id, dayDate: nextWeek, defenseDayCode: "SD-01" }
  });

  // Create Lecturers and Qualifications
  const presidentQual = await prisma.qualification.upsert({
    where: { qualificationCode: "QUAL_LEADERSHIP" },
    update: { isCommon: true },
    create: { 
      qualificationCode: "QUAL_LEADERSHIP", 
      name: "Leadership",
      isCommon: true
    }
  });

  const secretaryQual = await prisma.qualification.upsert({
    where: { qualificationCode: "QUAL_ADMIN" },
    update: { isCommon: true },
    create: { 
      qualificationCode: "QUAL_ADMIN", 
      name: "Administration", 
      isCommon: true
    }
  });

  const lecturers = [];
  for(let i=1; i<=6; i++) {
      const lecturer = await prisma.lecturer.create({
          data: {
              lecturerCode: `LEC-${i}`,
              email: `test-lecturer-${i}@fpt.edu.vn`,
              fullName: `Lecturer ${i}`,
          }
      });
      lecturers.push(lecturer);

      // Assign Qualifications
      if (i <= 2) {
          await prisma.lecturerQualification.create({
              data: { lecturerId: lecturer.id, qualificationId: presidentQual.id, score: 5 }
          });
      }
      if (i <= 4) {
          await prisma.lecturerQualification.create({
              data: { lecturerId: lecturer.id, qualificationId: secretaryQual.id, score: 5 }
          });
      }
  }

  // Create Topic
  const topic = await prisma.topic.create({
      data: {
          topicCode: "TP-TEST-01",
          title: "Test Topic Title",
          semesterId: semester.id
      }
  });

  // Register Topic to Defense
  await prisma.topicDefenseRegistration.create({
      data: {
          topicId: topic.id,
          defenseId: defense.id,
          registrationCode: `REG-TEST-01`,
          finalResult: "Pending" // DefenseResult enum
      }
  });


  // 2. Generate Schedule
  console.log("2. Generating Schedule...");
  // Set Availability for Lecturers (Force Valid)
  
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
  await prisma.defense.update({
      where: { id: defense.id },
      data: { availabilityStartDate: new Date() }
  });

  // Set Availability
  await updateAvailability(lecturers[0].id, sd1.id, AvailabilityStatus.Available);

  const result = await generateSchedule(defense.id);
  console.log("   Generation Result:", result.status);
  
  const councils = await prisma.councilBoard.findMany({ where: { defenseDay: { defenseId: defense.id } } });
  console.log(`   Generated ${councils.length} councils.`);
  if (councils.length > 0) {
      const matches = await prisma.defenseCouncil.findMany({ where: { councilBoardId: councils[0].id } });
      console.log(`   Generated ${matches.length} matches.`);
      
      if (matches.length > 0) {
          // 3. Manual Update
          console.log("3. Testing Manual Update...");
          const match = matches[0];
          const newTime = new Date(match.startTime!);
          newTime.setHours(newTime.getHours() + 1);
          
          await updateDefenseCouncil(match.id, { startTime: newTime });
          const updated = await prisma.defenseCouncil.findUnique({ where: { id: match.id } });
          if (updated?.startTime?.getTime() === newTime.getTime()) {
              console.log("   ✅ Manual update successful.");
          } else {
              console.error("   ❌ Manual update failed.");
          }
      }
  }

  // 4. Publish
  console.log("4. Testing Publish...");
  await publishSchedule(defense.id);
  const updatedDefense = await prisma.defense.findUnique({ where: { id: defense.id } });
  if (updatedDefense?.isSchedulePublished) {
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
