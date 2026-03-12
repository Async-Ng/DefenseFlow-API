import { prisma } from "../config/prisma.js";
import { Notification } from "../../generated/prisma/client.js";
import { PaginatedResult } from "../types/index.js";

export const createNotification = async (
  authId: string,
  title: string,
  message: string,
  type?: string
): Promise<Notification> => {
  return await prisma.notification.create({
    data: {
      authId,
      title,
      message,
      type,
    },
  });
};

export const createManyNotifications = async (
  data: { authId: string; title: string; message: string; type?: string }[]
): Promise<number> => {
  const result = await prisma.notification.createMany({
    data,
  });
  return result.count;
};

export const findByAuthId = async (
  authId: string,
  page: number = 1,
  limit: number = 10,
  isRead?: boolean
): Promise<PaginatedResult<Notification>> => {
  const skip = (page - 1) * limit;

  const whereClause: any = { authId };
  if (isRead !== undefined) {
    whereClause.isRead = isRead;
  }

  const [data, total] = await Promise.all([
    prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: whereClause }),
  ]);

  return { data, total, page, limit };
};

export const markAsRead = async (
  id: number,
  authId: string
): Promise<Notification> => {
  // Ensure the notification belongs to this authId
  const notification = await prisma.notification.findFirst({
    where: { id, authId },
  });

  if (!notification) {
    throw new Error(`Notification ${id} not found or access denied`);
  }

  return await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
};

export const markAllAsRead = async (authId: string): Promise<number> => {
  const result = await prisma.notification.updateMany({
    where: { authId, isRead: false },
    data: { isRead: true },
  });
  return result.count;
};
