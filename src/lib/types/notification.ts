export type NotificationChannel = "email" | "sms" | "in_app";

export type NotificationType =
  | "otp"
  | "welcome"
  | "invoice_submitted"
  | "invoice_approved"
  | "invoice_rejected"
  | "invoice_paid"
  | "payment_due_reminder"
  | "profile_edit_update";

export interface Notification {
  id: string;
  userId: string;
  channel: NotificationChannel;
  type: NotificationType;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  relatedEntityType: "invoice_request" | "influencer" | "otp" | null;
  relatedEntityId: string | null;
}
