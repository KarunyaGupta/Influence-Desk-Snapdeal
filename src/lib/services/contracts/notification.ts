import type { Notification } from "@/lib/types";

export interface NotificationService {
  listForCurrentUser(): Promise<Notification[]>;
  markRead(notificationId: string): Promise<void>;
}
