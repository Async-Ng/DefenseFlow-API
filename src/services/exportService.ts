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
      throw new AppError(404, "Không tìm thấy đợt bảo vệ");
    }

    const topicDefenses = await prisma.topicDefense.findMany({
      where: { defenseId },
      include: {
        topic: {
          include: {
            topicSupervisors: {
              include: { lecturer: true },
              orderBy: { id: "asc" }
            }
          }
        }
      },
      orderBy: { id: "asc" }
    });

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
                topic: true
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

    // ----------------------------------------------------
    // Sheet 1: Danh sách Đề tài
    // ----------------------------------------------------
    const topicSheet = workbook.addWorksheet("Thông tin Đề tài");
    topicSheet.mergeCells("A1:H1");
    const tTitleCell = topicSheet.getCell("A1");
    tTitleCell.value = `DANH SÁCH ĐỀ TÀI: ${defense.name?.toUpperCase() || ""}`;
    tTitleCell.font = { bold: true, size: 14 };
    tTitleCell.alignment = { horizontal: "center" };

    const topicHeaders = [
      "STT",
      "Mã đề tài",
      "Mã nhóm",
      "Tên đề tài Tiếng Anh/ Tiếng Nhật",
      "Tên đề tài Tiếng Việt",
      "GVHD (Tất cả)",
      "GVHD 1 (Mã GV)",
      "GVHD 2 (Mã GV)",
    ];
    topicSheet.addRow(topicHeaders);
    const tHeaderRow = topicSheet.getRow(2);
    tHeaderRow.font = { bold: true };
    tHeaderRow.alignment = { horizontal: "center", vertical: "middle" };
    tHeaderRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };

    let tStt = 1;
    for (const td of topicDefenses) {
      const topic = td.topic;
      const supervisors = topic?.topicSupervisors || [];
      const supervisorsStr = supervisors.map(s => s.lecturer.fullName).join(", ") || "-";
      const gvhd1 = supervisors[0]?.lecturer.lecturerCode || "-";
      const gvhd2 = supervisors[1]?.lecturer.lecturerCode || "-";

      const r = topicSheet.addRow([
        tStt++,
        topic?.topicCode || "-",
        topic?.groupCode || "-",
        topic?.title || "-",
        topic?.vietnameseTitle || "-",
        supervisorsStr,
        gvhd1,
        gvhd2
      ]);
      r.alignment = { wrapText: true, vertical: "middle" };
    }

    topicSheet.getColumn(1).width = 5;
    topicSheet.getColumn(2).width = 15;
    topicSheet.getColumn(3).width = 15;
    topicSheet.getColumn(4).width = 40;
    topicSheet.getColumn(5).width = 40;
    topicSheet.getColumn(6).width = 30;
    topicSheet.getColumn(7).width = 15;
    topicSheet.getColumn(8).width = 15;

    // ----------------------------------------------------
    // Sheet 2: Danh sách Hội đồng
    // ----------------------------------------------------
    const boardSheet = workbook.addWorksheet("Thông tin Hội đồng");
    boardSheet.mergeCells("A1:K1");
    const bTitleCell = boardSheet.getCell("A1");
    bTitleCell.value = `LỊCH BẢO VỆ (HỘI ĐỒNG): ${defense.name?.toUpperCase() || ""}`;
    bTitleCell.font = { bold: true, size: 14 };
    bTitleCell.alignment = { horizontal: "center" };

    const boardHeaders = [
      "STT",
      "Hội đồng",
      "Ngày bảo vệ",
      "Thời gian",
      "Mã đề tài",
      "Chủ tịch",
      "Thư ký",
      "Ủy viên 1",
      "Ủy viên 2",
      "Ủy viên 3",
      "Kết quả (Passed/Failed)"
    ];
    boardSheet.addRow(boardHeaders);
    const bHeaderRow = boardSheet.getRow(2);
    bHeaderRow.font = { bold: true };
    bHeaderRow.alignment = { horizontal: "center", vertical: "middle" };
    bHeaderRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };

    const getMemberByRole = (members: any[], role: string) => {
      return members.find(m => m.role === role)?.lecturer?.fullName || "-";
    };

    let bStt = 1;
    for (const board of councilBoards) {
      const dayStr = board.defenseDay.dayDate.toLocaleDateString("vi-VN").replace(/\//g, "-");
      const boardName = board.boardCode || board.name || "N/A";

      const president = getMemberByRole(board.councilBoardMembers, "President");
      const secretary = getMemberByRole(board.councilBoardMembers, "Secretary");
      
      const commissioners = board.councilBoardMembers
        .filter(m => m.role === "Member")
        .map(m => m.lecturer?.fullName || "-");
      const c1 = commissioners[0] || "-";
      const c2 = commissioners[1] || "-";
      const c3 = commissioners[2] || "-";

      if (board.defenseCouncils.length === 0) {
        const r = boardSheet.addRow([
          bStt++, boardName, dayStr, "Chưa xếp lịch", "-", president, secretary, c1, c2, c3, ""
        ]);
        r.alignment = { wrapText: true, vertical: "middle" };
        continue;
      }

      for (const dc of board.defenseCouncils) {
        const startTime = dc.startTime ? dc.startTime.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) : "N/A";
        const endTime = dc.endTime ? dc.endTime.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) : "N/A";
        const topicCode = dc.topicDefense?.topic?.topicCode || "-";

        const r = boardSheet.addRow([
          bStt++, boardName, dayStr, `${startTime} - ${endTime}`, topicCode, president, secretary, c1, c2, c3, ""
        ]);
        r.alignment = { wrapText: true, vertical: "middle" };

        if (topicCode !== "-") {
          const resultCell = r.getCell(11);
          resultCell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['"Passed,Failed"'],
            showErrorMessage: true,
            errorStyle: 'stop',
            errorTitle: 'Giá trị không hợp lệ',
            error: 'Vui lòng chọn kết quả từ danh sách (Passed, Failed)'
          };
        }
      }
    }

    boardSheet.getColumn(1).width = 5;  // STT
    boardSheet.getColumn(2).width = 15; // Hội đồng
    boardSheet.getColumn(3).width = 15; // Ngày
    boardSheet.getColumn(4).width = 20; // Thời gian
    boardSheet.getColumn(5).width = 15; // Mã đề tài
    boardSheet.getColumn(6).width = 25; // Chủ tịch
    boardSheet.getColumn(7).width = 25; // Thư ký
    boardSheet.getColumn(8).width = 25; // Ủy viên 1
    boardSheet.getColumn(9).width = 25; // Ủy viên 2
    boardSheet.getColumn(10).width = 25; // Ủy viên 3
    boardSheet.getColumn(11).width = 25; // Kết quả

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }
}

export default new ExportService();
