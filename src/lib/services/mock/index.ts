import type { AppServices } from "@/lib/services/contracts";
import { mockAuthService } from "./auth";
import { mockOnboardingService } from "./onboarding";
import { mockKycService } from "./kyc";
import { mockInvoiceService } from "./invoice";
import { mockNotificationService } from "./notification";
import { mockAuditService } from "./audit";
import { mockAdminService } from "./admin";

export const mockServices: AppServices = {
  auth: mockAuthService,
  onboarding: mockOnboardingService,
  kyc: mockKycService,
  invoices: mockInvoiceService,
  notifications: mockNotificationService,
  audit: mockAuditService,
  admin: mockAdminService,
};
