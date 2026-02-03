import ExcelJS from "exceljs";
import { prisma } from "../config/prisma.js";

interface TopicImportRow {
  topicCode: string;
  title: string;
  supervisorCodes: string[];
}

interface LecturerImportRow {
  name: string;
  email: string;
  lecturerCode?: string;
}

export class ImportService {
  /**
   * Parse Buffer to JSON using ExcelJS
   * Assumes first row is header.
   */
  private async parseExcel<T>(
    buffer: Buffer,
    mapRow: (row: ExcelJS.Row) => T | null,
  ): Promise<T[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.worksheets[0];
    const results: T[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      const mapped = mapRow(row);
      if (mapped) results.push(mapped);
    });

    return results;
  }

  /**
   * Process and Import Topics
   */
  async processTopics(buffer: Buffer, semesterId: number) {
    const errors: { row: number; message: string }[] = [];
    const validTopics: any[] = [];
    const processedCodes = new Set<string>();

    const rawRows = await this.parseExcel<TopicImportRow>(buffer, (row) => {
      // Cell 1: Topic Code, Cell 2: Title, Cell 3+: Supervisor Codes (comma-separated or multiple columns)
      const topicCode = row.getCell(1).text?.toString().trim();
      const title = row.getCell(2).text?.toString().trim();
      const supervisorCodesRaw = row.getCell(3).text?.toString().trim();

      if (!topicCode || !title || !supervisorCodesRaw) return null;

      // Split by comma to support multiple supervisors in one cell
      const supervisorCodes = supervisorCodesRaw
        .split(",")
        .map((code) => code.trim())
        .filter((code) => code.length > 0);

      if (supervisorCodes.length === 0) return null;

      return { topicCode, title, supervisorCodes };
    });

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNum = i + 2;

      // 0. Check duplicate within file
      if (processedCodes.has(row.topicCode)) {
        errors.push({
          row: rowNum,
          message: `Topic code '${row.topicCode}' duplicate within file.`,
        });
        continue;
      }

      // 1. Check duplicate Topic Code in DB
      const existingTopic = await prisma.topic.findUnique({
        where: { topicCode: row.topicCode },
      });

      if (existingTopic) {
        errors.push({
          row: rowNum,
          message: `Topic code '${row.topicCode}' already exists.`,
        });
        continue;
      }

      // 2. Find all supervisors by Code
      const supervisors = await prisma.lecturer.findMany({
        where: {
          lecturerCode: { in: row.supervisorCodes },
        },
      });

      if (supervisors.length !== row.supervisorCodes.length) {
        const foundCodes = supervisors.map((s) => s.lecturerCode);
        const notFoundCodes = row.supervisorCodes.filter(
          (code) => !foundCodes.includes(code),
        );
        errors.push({
          row: rowNum,
          message: `Supervisor(s) with code(s) '${notFoundCodes.join(
            ", ",
          )}' not found.`,
        });
        continue;
      }

      validTopics.push({
        topicCode: row.topicCode,
        title: row.title,
        semesterId: semesterId,
        supervisorIds: supervisors.map((s) => s.id),
      });

      processedCodes.add(row.topicCode);
    }

    // Insert valid topics with supervisors
    if (validTopics.length > 0) {
      for (const topicData of validTopics) {
        const { supervisorIds, ...topicCreateData } = topicData;

        await prisma.topic.create({
          data: {
            ...topicCreateData,
            topicSupervisors: {
              create: supervisorIds.map((lecturerId: number) => ({
                lecturerId,
              })),
            },
          },
        });
      }

      return { successCount: validTopics.length, errors };
    }

    return { successCount: 0, errors };
  }

  /**
   * Process and Import Lecturers
   */
  async processLecturers(buffer: Buffer) {
    const errors: { row: number; message: string }[] = [];
    const validLecturers: any[] = [];
    const processedEmails = new Set<string>();
    const processedCodes = new Set<string>();

    const rawRows = await this.parseExcel<LecturerImportRow>(buffer, (row) => {
      // Cell 1: Lecturer Code (Optional), Cell 2: Name, Cell 3: Email
      const lecturerCode = row.getCell(1).text?.toString().trim();
      const name = row.getCell(2).text?.toString().trim();
      const email = row.getCell(3).text?.toString().trim();

      if (!name || !email) return null;
      return { name, email, lecturerCode };
    });

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNum = i + 2;

      const generatedCode = row.lecturerCode || row.email.split("@")[0];

      // 0. Check duplicate within file
      if (processedEmails.has(row.email)) {
        errors.push({
          row: rowNum,
          message: `Email '${row.email}' duplicate within file.`,
        });
        continue;
      }
      if (processedCodes.has(generatedCode)) {
        errors.push({
          row: rowNum,
          message: `Lecturer Code '${generatedCode}' duplicate within file.`,
        });
        continue;
      }

      // 1. Check duplicate Email or Code in DB
      const existingLecturer = await prisma.lecturer.findFirst({
        where: {
          OR: [{ email: row.email }, { lecturerCode: generatedCode }],
        },
      });

      if (existingLecturer) {
        errors.push({
          row: rowNum,
          message: `Lecturer with email '${row.email}' or code '${generatedCode}' already exists.`,
        });
        continue;
      }

      validLecturers.push({
        fullName: row.name,
        email: row.email,
        lecturerCode: generatedCode,
      });

      processedEmails.add(row.email);
      processedCodes.add(generatedCode);
    }

    if (validLecturers.length > 0) {
      const result = await prisma.lecturer.createMany({
        data: validLecturers,
      });
      return { successCount: result.count, errors };
    }

    return { successCount: 0, errors };
  }

  /**
   * Generate Topic Import Template
   */
  async getTopicTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Topics");

    sheet.columns = [
      { header: "Topic Code", key: "topicCode", width: 15 },
      { header: "Title", key: "title", width: 40 },
      {
        header: "Supervisor Codes (comma-separated)",
        key: "supervisorCodes",
        width: 30,
      },
    ];

    return ((await workbook.xlsx.writeBuffer()) as unknown) as Buffer;
  }

  /**
   * Generate Lecturer Import Template
   */
  async getLecturerTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Lecturers");

    sheet.columns = [
      { header: "Lecturer Code", key: "lecturerCode", width: 15 },
      { header: "Name", key: "name", width: 30 },
      { header: "Email", key: "email", width: 30 },
    ];

    return ((await workbook.xlsx.writeBuffer()) as unknown) as Buffer;
  }
}

export default new ImportService();
