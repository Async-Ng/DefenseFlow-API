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

    // Group council boards by day
    const boardsByDay = new Map<string, typeof councilBoards>();
    for (const board of councilBoards) {
      const dayStr = board.defenseDay.dayDate.toLocaleDateString("vi-VN").replace(/\//g, "-");
      if (!boardsByDay.has(dayStr)) {
        boardsByDay.set(dayStr, []);
      }
      boardsByDay.get(dayStr)!.push(board);
    }

    if (boardsByDay.size === 0) {
      const worksheet = workbook.addWorksheet("Empty Schedule");
      worksheet.addRow(["No schedule data available for this defense round"]);
    }

    for (const [dayStr, boards] of boardsByDay.entries()) {
      const worksheet = workbook.addWorksheet(`Ngày ${dayStr}`);

      // 1. Header Information
      worksheet.mergeCells("A1:H1");
      const titleCell = worksheet.getCell("A1");
      titleCell.value = `LỊCH BẢO VỆ NGÀY ${dayStr}: ${defense.name?.toUpperCase()}`;
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { horizontal: "center" };

      // 2. Column Headers
      const headers = [
        "STT",
        "Ngày",
        "Hội đồng",
        "Thời gian",
        "Mã đề tài",
        "Mã nhóm",
        "Tên đề tài Tiếng Anh/ Tiếng Nhật",
        "Tên đề tài Tiếng Việt",
        "GVHD",
        "GVHD1",
        "GVHD2",
        "Chủ tịch",
        "Thư ký",
        "Ủy viên 1",
        "Ủy viên 2",
        "Ủy viên 3", // Add more if needed, typically boards have 3-5 members
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

      // Helper to extract member by role
      const getMemberByRole = (members: any[], role: string) => {
        return members.find(m => m.role === role)?.lecturer?.fullName || "-";
      };

      // 3. Data Rows
      let stt = 1;
      for (const board of boards) {
        const boardName = board.boardCode || board.name || "N/A";
        
        // Members extraction
        const president = getMemberByRole(board.councilBoardMembers, "President");
        const secretary = getMemberByRole(board.councilBoardMembers, "Secretary");
        
        // Extract commissioners (ỦY VIÊN / MEMBER)
        const commissioners = board.councilBoardMembers
          .filter(m => m.role === "Member")
          .map(m => m.lecturer?.fullName || "-");
          
        const commissioner1 = commissioners[0] || "-";
        const commissioner2 = commissioners[1] || "-";
        const commissioner3 = commissioners[2] || "-";

        if (board.defenseCouncils.length === 0) {
          // Empty board
          const rowData = [
            stt++,
            dayStr,
            boardName,
            "Chưa xếp lịch",
            "-", // Mã đề tài
            "-", // Mã nhóm
            "-", // Tên EN
            "-", // Tên VI
            "-", // GVHD
            "-", // GVHD1
            "-", // GVHD2
            president,
            secretary,
            commissioner1,
            commissioner2,
            commissioner3,
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
            
          const gvhd1 = topic?.topicSupervisors?.[0]?.lecturer.lecturerCode || "-";
          const gvhd2 = topic?.topicSupervisors?.[1]?.lecturer.lecturerCode || "-";

          const rowData = [
            stt++,
            dayStr,
            boardName,
            `${startTime} - ${endTime}`,
            topic?.topicCode || "-",
            topic?.groupCode || "-",
            topic?.title || "-",
            topic?.vietnameseTitle || "-",
            supervisorsStr,
            gvhd1,
            gvhd2,
            president,
            secretary,
            commissioner1,
            commissioner2,
            commissioner3,
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
      worksheet.getColumn(6).width = 15;  // Mã nhóm
      worksheet.getColumn(7).width = 40;  // Tên đề tài Tiếng Anh/ Tiếng Nhật
      worksheet.getColumn(8).width = 40;  // Tên đề tài Tiếng Việt
      worksheet.getColumn(9).width = 25;  // GVHD
      worksheet.getColumn(10).width = 15; // GVHD1
      worksheet.getColumn(11).width = 15; // GVHD2
      worksheet.getColumn(12).width = 25; // Chủ tịch
      worksheet.getColumn(13).width = 25; // Thư ký
      worksheet.getColumn(14).width = 25; // Ủy viên 1
      worksheet.getColumn(15).width = 25; // Ủy viên 2
      worksheet.getColumn(16).width = 25; // Ủy viên 3
    }

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }
}

export default new ExportService();
