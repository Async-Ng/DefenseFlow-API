import ExcelJS from "exceljs";
import { prisma } from "../config/prisma.js";

interface TopicImportRow {
  groupCode: string;
  topicCode: string;
  title: string;
  vietnameseTitle?: string;
  supervisor1Code: string;
  supervisor2Code?: string;
  topicTypeName?: string;
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
      if (rowNumber <= 2) return; // Skip header rows (Title + Columns)
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
      // Cell 1: STT, Cell 2: Topic Code, Cell 3: Group Code, Cell 4: Title EN, Cell 5: Title VI, Cell 6: GVHD Name, Cell 7: GVHD1, Cell 8: GVHD2
      const topicCode = row.getCell(2).text?.toString().trim();
      const groupCode = row.getCell(3).text?.toString().trim();
      const titleEN = row.getCell(4).text?.toString().trim();
      const titleVI = row.getCell(5).text?.toString().trim();
      const supervisor1Code = row.getCell(7).text?.toString().trim();
      const supervisor2Code = row.getCell(8).text?.toString().trim();

      const title = titleEN || "";
      const vietnameseTitle = titleVI || undefined;

      if (!groupCode || !topicCode || (!title && !vietnameseTitle) || !supervisor1Code) return null;

      return {
        groupCode,
        topicCode,
        title,
        vietnameseTitle,
        supervisor1Code,
        supervisor2Code: supervisor2Code || undefined,
      };
    });

    // Pre-fetch all topic types to minimize DB calls in loop
    const allTopicTypes = await prisma.topicType.findMany();
    const topicTypeMap = new Map(
      allTopicTypes.map((t) => [t.name.toLowerCase(), t.id])
    );

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

      // 2. Find supervisors by Code, auto-create if not found
      const supervisorCodes = [row.supervisor1Code];
      if (row.supervisor2Code) {
        supervisorCodes.push(row.supervisor2Code);
      }

      const supervisors = await Promise.all(
        supervisorCodes.map((code) =>
          prisma.lecturer.upsert({
            where: { lecturerCode: code },
            update: {},
            create: {
              lecturerCode: code,
              fullName: code, // Placeholder, can be updated later
              email: `${code.toLowerCase()}@fe.edu.vn`, // Placeholder email
            },
          })
        )
      );

      // 3. Resolve Topic Type
      let topicTypeId: number | undefined;
      if (row.topicTypeName) {
        topicTypeId = topicTypeMap.get(row.topicTypeName.toLowerCase());
        if (!topicTypeId) {
          errors.push({
            row: rowNum,
            message: `Topic Type '${row.topicTypeName}' not found.`,
          });
          continue;
        }
      }

      validTopics.push({
        topicCode: row.topicCode,
        groupCode: row.groupCode,
        title: row.title,
        vietnameseTitle: row.vietnameseTitle,
        semesterId: semesterId,
        topicTypeId: topicTypeId,
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
      // Cell 1: STT, Cell 2: Lecturer Code (Optional), Cell 3: Name, Cell 4: Email
      const lecturerCode = row.getCell(2).text?.toString().trim();
      const name = row.getCell(3).text?.toString().trim();
      const email = row.getCell(4).text?.toString().trim();

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
    const sheet = workbook.addWorksheet("PROJECTS INFORMATION");

    // Add header row with merged cells for title
    sheet.mergeCells('A1:H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'PROJECTS INFORMATION';
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFFF0000' } }; // Red text
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFFFF' }, // White background
    };

    // Add column headers in row 2
    sheet.getRow(2).values = [
      'STT',
      'Mã đề tài',
      'Mã nhóm',
      'Tên đề tài Tiếng Anh/ Tiếng Nhật',
      'Tên đề tài Tiếng Việt',
      'GVHD',
      'GVHD1',
      'GVHD2',
    ];

    // Style the header row
    const headerRow = sheet.getRow(2);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9D9D9' }, // Light gray
    };

    // Set column widths
    sheet.getColumn(1).width = 8;  // STT
    sheet.getColumn(2).width = 15; // Mã đề tài
    sheet.getColumn(3).width = 15; // Mã nhóm
    sheet.getColumn(4).width = 50; // Tên đề tài Tiếng Anh
    sheet.getColumn(5).width = 50; // Tên đề tài Tiếng Việt
    sheet.getColumn(6).width = 25; // GVHD
    sheet.getColumn(7).width = 15; // GVHD1
    sheet.getColumn(8).width = 15; // GVHD2

    // Add borders to header
    for (let col = 1; col <= 8; col++) {
      const cell = headerRow.getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }

    return ((await workbook.xlsx.writeBuffer()) as unknown) as Buffer;
  }

  /**
   * Generate Lecturer Import Template
   */
  async getLecturerTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("LECTURERS INFORMATION");

    // Add header row with merged cells for title
    sheet.mergeCells('A1:D1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'LECTURERS INFORMATION';
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFFF0000' } }; // Red text
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFFFF' }, // White background
    };

    // Add column headers in row 2
    sheet.getRow(2).values = [
      'STT',
      'Mã giảng viên',
      'Họ và tên',
      'Email',
    ];

    // Style the header row
    const headerRow = sheet.getRow(2);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9D9D9' }, // Light gray
    };

    // Set column widths
    sheet.getColumn(1).width = 8;  // STT
    sheet.getColumn(2).width = 20; // Mã giảng viên
    sheet.getColumn(3).width = 30; // Họ và tên
    sheet.getColumn(4).width = 40; // Email

    // Add borders to header
    for (let col = 1; col <= 4; col++) {
      const cell = headerRow.getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }

    return ((await workbook.xlsx.writeBuffer()) as unknown) as Buffer;
  }
}

export default new ImportService();
