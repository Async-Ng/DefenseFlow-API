export enum NotificationType {
  SYSTEM = "SYSTEM",
  AVAILABILITY_PUBLISHED = "AVAILABILITY_PUBLISHED",
  SCHEDULE_PUBLISHED = "SCHEDULE_PUBLISHED",
}

export interface NotificationDTO {
  id: number;
  title: string;
  message: string;
  type: NotificationType | string | null;
  isRead: boolean;
  createdAt: string;
}

export interface GetNotificationsQuery {
  page?: number;
  limit?: number;
  isRead?: boolean;
}
