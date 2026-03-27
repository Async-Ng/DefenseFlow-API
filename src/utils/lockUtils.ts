import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { DefenseStatus, SemesterStatus } from "../../generated/prisma/client.js";

/**
 * Ensures that a semester is not in 'Finished' status.
 * Throws an AppError if the semester is finished.
 */
export const ensureSemesterNotFinished = async (semesterId: number) => {
  const semester = await prisma.semester.findUnique({
    where: { id: semesterId },
    select: { status: true, semesterCode: true }
  });

  if (!semester) {
    throw new AppError(404, `Không tìm thấy học kỳ với ID ${semesterId}`);
  }

  if (semester.status === SemesterStatus.Finished) {
    throw new AppError(
      403,
      `Hành động bị từ chối: Học kỳ '${semester.semesterCode}' đã kết thúc và dữ liệu đã được khóa.`
    );
  }
};

/**
 * Ensures that a defense is not in 'Locked' status and its parent semester is not 'Finished'.
 * Throws an AppError if either condition is met.
 */
export const ensureDefenseNotLocked = async (defenseId: number) => {
  const defense = await prisma.defense.findUnique({
    where: { id: defenseId },
    include: {
      semester: {
        select: { status: true, semesterCode: true }
      }
    }
  });

  if (!defense) {
    throw new AppError(404, `Không tìm thấy đợt bảo vệ với ID ${defenseId}`);
  }

  // Check parent semester first
  if (defense.semester?.status === SemesterStatus.Finished) {
    throw new AppError(
      403,
      `Hành động bị từ chối: Học kỳ '${defense.semester.semesterCode}' đã kết thúc và dữ liệu đã được khóa.`
    );
  }

  // Check defense status
  if (defense.status === DefenseStatus.Locked) {
    throw new AppError(
      403,
      `Hành động bị từ chối: Đợt bảo vệ '${defense.defenseCode}' đã bị khóa để chuẩn bị xếp lịch.`
    );
  }
};

/**
 * Ensures that a defense day's parent defense and semester are not locked.
 */
export const ensureDefenseDayNotLocked = async (defenseDayId: number) => {
  const day = await prisma.defenseDay.findUnique({
    where: { id: defenseDayId },
    select: { defenseId: true }
  });

  if (!day) {
    throw new AppError(404, `Không tìm thấy ngày bảo vệ với ID ${defenseDayId}`);
  }

  await ensureDefenseNotLocked(day.defenseId);
};

/**
 * Ensures that a council board's parent defense and semester are not locked.
 */
export const ensureCouncilBoardNotLocked = async (councilBoardId: number) => {
  const board = await prisma.councilBoard.findUnique({
    where: { id: councilBoardId },
    select: { defenseDay: { select: { defenseId: true } } }
  });

  if (!board) {
    throw new AppError(404, `Không tìm thấy Hội đồng bảo vệ với ID ${councilBoardId}`);
  }

  await ensureDefenseNotLocked(board.defenseDay.defenseId);
};

/**
 * Ensures a topic's parent semester is not finished.
 */
export const ensureTopicNotLocked = async (topicId: number) => {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    select: { semesterId: true }
  });

  if (!topic) {
    throw new AppError(404, `Không tìm thấy đề tài với ID ${topicId}`);
  }

  await ensureSemesterNotFinished(topic.semesterId);
};
