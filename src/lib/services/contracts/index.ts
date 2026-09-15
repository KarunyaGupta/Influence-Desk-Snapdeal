import type { AuthService } from "./auth";
import type { OnboardingService } from "./onboarding";
import type { KycService } from "./kyc";
import type { InvoiceService } from "./invoice";
import type { NotificationService } from "./notification";
import type { AuditService } from "./audit";
import type { AdminService } from "./admin";

export interface AppServices {
  auth: AuthService;
  onboarding: OnboardingService;
  kyc: KycService;
  invoices: InvoiceService;
  notifications: NotificationService;
  audit: AuditService;
  admin: AdminService;
}

export type { AuthService, OtpChallenge, MobileCheckResult } from "./auth";
export type { OnboardingService, OnboardingDraftInput } from "./onboarding";
export type { KycService } from "./kyc";
export type { InvoiceService, SubmitInvoiceInput } from "./invoice";
export type { NotificationService } from "./notification";
export type { AuditService } from "./audit";
export type { AdminService } from "./admin";
