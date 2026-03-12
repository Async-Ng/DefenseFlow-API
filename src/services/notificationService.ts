import * as notificationRepository from "../repositories/notificationRepository.js";
import { prisma } from "../config/prisma.js";
import { NotificationDTO, GetNotificationsQuery } from "../domain/Notification.js";
import { PaginatedResult } from "../types/index.js";

/**
 * Get notifications for a user
 */
export const getNotifications = async (
  authId: string,
  query: GetNotificationsQuery
): Promise<PaginatedResult<NotificationDTO>> => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  
  let isRead: boolean | undefined = undefined;
  if (query.isRead !== undefined && query.isRead !== null) {
    // Check string "true", "false", or actual boolean
    const val = query.isRead as unknown;
    isRead = val === true || val === "true" || val === "1";
  }

  const result = await notificationRepository.findByAuthId(authId, page, limit, isRead);

  const dtoData = result.data.map(n => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString()
  }));

  return { ...result, data: dtoData };
};

/**
 * Mark a specific notification as read
 */
export const markAsRead = async (
  id: number,
  authId: string
): Promise<NotificationDTO> => {
  const updated = await notificationRepository.markAsRead(id, authId);
  return {
    id: updated.id,
    title: updated.title,
    message: updated.message,
    type: updated.type,
    isRead: updated.isRead,
    createdAt: updated.createdAt.toISOString()
  };
};

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = async (authId: string): Promise<number> => {
  return await notificationRepository.markAllAsRead(authId);
};

/**
 * Dispatch a notification to all lecturers configured for a specific defense.
 * This is used for AVAILABILITY_PUBLISHED events.
 */
export const dispatchNotificationToConfiguredLecturers = async (
  defenseId: number,
  title: string,
  message: string,
  type: string
): Promise<void> => {
  // Find all lecturers configured for this defense that have an authId
  const lecturers = await prisma.lecturer.findMany({
    where: {
      authId: { not: null },
      lecturerDefenseConfigs: {
        some: { defenseId }
      }
    },
    select: { authId: true }
  });

  if (lecturers.length === 0) return;

  const dataToInsert = lecturers.map(l => ({
    authId: l.authId as string,
    title,
    message,
    type,
  }));

  await notificationRepository.createManyNotifications(dataToInsert);
};

/**
 * Dispatch a notification to all lecturers scheduled in council boards for a specific defense.
 * This is used for SCHEDULE_PUBLISHED events.
 */
export const dispatchNotificationToDefenseMembers = async (
  defenseId: number,
  title: string,
  message: string,
  type: string
): Promise<void> => {
  // Find all distinct lecturers in council boards for this defense day's defense
  const members = await prisma.councilBoardMember.findMany({
    where: {
      councilBoard: {
        defenseDay: {
          defenseId
        }
      },
      lecturer: {
        authId: { not: null }
      }
    },
    select: {
      lecturer: {
        select: { authId: true }
      }
    },
    distinct: ['lecturerId']
  });

  if (members.length === 0) return;

  // Filter out any null authIds to be safe
  const authIds = new Set(
    members.map(m => m.lecturer?.authId).filter(id => id != null)
  );

  if (authIds.size === 0) return;

  const dataToInsert = Array.from(authIds).map(authId => ({
    authId: authId as string,
    title,
    message,
    type,
  }));

  await notificationRepository.createManyNotifications(dataToInsert);
};
