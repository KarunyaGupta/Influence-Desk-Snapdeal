import type {
  AuditLogEntry,
  Influencer,
  InvoiceRequest,
  Notification,
  OnboardingRequest,
  ProfileEditRequest,
  User,
} from "@/lib/types";
import type { OtpChallenge } from "@/lib/services/contracts/auth";

export interface OtpRecord extends OtpChallenge {
  code: string;
  destination: string;
  userId: string | null;
  purpose: "login" | "onboarding_mobile" | "onboarding_email";
  attemptCount: number;
}

export interface MockState {
  users: User[];
  influencers: Influencer[];
  invoices: InvoiceRequest[];
  notifications: Notification[];
  audit: AuditLogEntry[];
  editRequests: ProfileEditRequest[];
  onboardingRequests: OnboardingRequest[];
  otpChallenges: OtpRecord[];
  currentUserId: string | null;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
