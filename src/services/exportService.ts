import ExcelJS from "exceljs";
import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

export class ExportService {
  /**
   * Export the schedule of a specific defense round to Excel
   */
  async exportScheduleToExcel(defenseId: number): Promise<Buffer> {
    const defense = await prisma.defense.findUnique({
      where: { id: defenseId },
      include: { semester: true },
    });

    if (!defense) {
      throw new AppError(404, "Defense round not found");
    }

    const councilBoards = await prisma.councilBoard.findMany({
      where: {
        defenseDay: {
          defenseId: defenseId,
        },
      },
      include: {
        defenseDay: true,
        councilBoardMembers: {
          include: {
            lecturer: true,
          },
        },
        defenseCouncils: {
          orderBy: { startTime: "asc" },
          include: {
            topicDefense: {
              include: {
                topic: {
                  include: {
                    topicSupervisors: {
                      include: {
                        lecturer: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { defenseDay: { dayDate: "asc" } },
        { boardCode: "asc" },
      ],
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Security Schedule");

    // 1. Header Information
    worksheet.mergeCells("A1:H1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = `DEFENSE SCHEDULE: ${defense.name?.toUpperCase()} - ${defense.semester.name}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: "center" };

    // 2. Column Headers
    const headers = [
      "STT",
      "Ngày",
      "Hội đồng",
      "Thời gian",
      "Mã đề tài",
      "Tên đề tài",
      "Thành viên hội đồng",
      "GVHD",
    ];
    worksheet.addRow(headers);

    // Style headers
    const headerRow = worksheet.getRow(2);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9D9D9" },
    };

    // 3. Data Rows
    let stt = 1;
    for (const board of councilBoards) {
      const dayStr = board.defenseDay.dayDate.toLocaleDateString("vi-VN");
      const boardName = board.boardCode || board.name || "N/A";
      
      // Member summary
      const membersStr = board.councilBoardMembers
        .map(m => `${m.role}: ${m.lecturer?.fullName || "N/A"}`)
        .join("\n");

      if (board.defenseCouncils.length === 0) {
        // Empty board
        const rowData = [
          stt++,
          dayStr,
          boardName,
          "Chưa xếp lịch",
          "-",
          "-",
          membersStr,
          "-",
        ];
        const row = worksheet.addRow(rowData);
        row.alignment = { wrapText: true, vertical: "middle" };
        continue;
      }

      for (const dc of board.defenseCouncils) {
        const startTime = dc.startTime ? dc.startTime.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) : "N/A";
        const endTime = dc.endTime ? dc.endTime.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) : "N/A";
        const topic = dc.topicDefense?.topic;
        const supervisorsStr = topic?.topicSupervisors
          .map(s => s.lecturer.fullName)
          .join(", ") || "-";

        const rowData = [
          stt++,
          dayStr,
          boardName,
          `${startTime} - ${endTime}`,
          topic?.topicCode || "-",
          topic?.title || "-",
          membersStr,
          supervisorsStr,
        ];

        const row = worksheet.addRow(rowData);
        row.alignment = { wrapText: true, vertical: "middle" };
      }
    }

    // Adjust column widths
    worksheet.getColumn(1).width = 5;   // STT
    worksheet.getColumn(2).width = 12;  // Ngày
    worksheet.getColumn(3).width = 15;  // Hội đồng
    worksheet.getColumn(4).width = 15;  // Thời gian
    worksheet.getColumn(5).width = 15;  // Mã đề tài
    worksheet.getColumn(6).width = 40;  // Tên đề tài
    worksheet.getColumn(7).width = 35;  // Thành viên
    worksheet.getColumn(8).width = 25;  // GVHD

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }
}

export default new ExportService();
