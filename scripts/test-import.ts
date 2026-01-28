import "dotenv/config";
import ExcelJS from "exceljs";
import importService from "../src/services/importService.js";
import prisma from "../src/config/prisma.js";

async function createSemester() {
  process.stdout.write("Checking/Creating Semester... ");
  let semester = await prisma.semester.findFirst({ where: { id: 1 } });
  if (!semester) {
    semester = await prisma.semester.create({
      data: {
        id: 1,
        semesterCode: "TEST2025",
        name: "Test Semester",
      },
    });
    console.log("Created Semester ID 1");
  } else {
    console.log("Found Semester ID 1");
  }
  return semester.id;
}

async function testLecturerImport() {
  console.log("\n--- Testing Lecturer Import ---");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Lecturers");
  sheet.columns = [
    { header: "Lecturer Code", key: "code" },
    { header: "Name", key: "name" },
    { header: "Email", key: "email" },
  ];

  sheet.addRow({
    name: "John Doe",
    email: "john.doe@example.com",
    code: "JD001",
  });
  sheet.addRow({
    name: "Jane Smith",
    email: "jane.smith@example.com",
    code: "",
  }); // Should generate code
  sheet.addRow({
    name: "Duplicate User",
    email: "john.doe@example.com",
    code: "JD002",
  }); // Duplicate Email

  const buffer = (await workbook.xlsx.writeBuffer()) as Buffer;

  // Clean up before test - Topics first due to FK
  try {
    await prisma.topic.deleteMany({
      where: {
        supervisor: {
          email: {
            in: [
              "john.doe@example.com",
              "jane.smith@example.com",
              "unknown@example.com",
            ],
          },
        },
      },
    });
  } catch {}

  await prisma.lecturer.deleteMany({
    where: {
      email: { in: ["john.doe@example.com", "jane.smith@example.com"] },
    },
  });

  const result = await importService.processLecturers(buffer);
  console.log("Result:", JSON.stringify(result, null, 2));
}

async function testTopicImport(semesterId: number) {
  console.log("\n--- Testing Topic Import ---");

  // Ensure supervisor exists
  let supervisor = await prisma.lecturer.findFirst({
    where: { email: "john.doe@example.com" },
  });
  if (!supervisor) {
    supervisor = await prisma.lecturer.create({
      data: {
        fullName: "John Doe",
        email: "john.doe@example.com",
        lecturerCode: "JD001",
      },
    });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Topics");
  sheet.columns = [
    { header: "Topic Code", key: "code" },
    { header: "Title", key: "title" },
    { header: "Supervisor Email", key: "email" },
  ];

  sheet.addRow({
    code: "TP001",
    title: "AI Research",
    email: "john.doe@example.com",
  });
  sheet.addRow({
    code: "TP002",
    title: "Web Dev",
    email: "john.doe@example.com",
  });
  sheet.addRow({
    code: "TP001",
    title: "Duplicate Code",
    email: "john.doe@example.com",
  }); // Duplicate Code
  sheet.addRow({
    code: "TP003",
    title: "Missing Supervisor",
    email: "unknown@example.com",
  }); // Unknown Supervisor

  const buffer = (await workbook.xlsx.writeBuffer()) as Buffer;

  // Clean up
  await prisma.topic.deleteMany({
    where: { topicCode: { in: ["TP001", "TP002", "TP003"] } },
  });

  const result = await importService.processTopics(buffer, semesterId);
  console.log("Result:", JSON.stringify(result, null, 2));
}

async function main() {
  try {
    const semesterId = await createSemester();
    await testLecturerImport();
    await testTopicImport(semesterId);
  } catch (e) {
    console.error(e);
  } finally {
    // Disconnect using the imported instance
    // Assuming prisma.$disconnect exists on extended client usually, or just leave it
    // The script will exit anyway.
    // But clean shutdown is better.
    // The shared prisma instance might perform connection management.
    // Let's just process.exit(0) at end or let it drain.
  }
}

main();
