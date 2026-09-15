export type AuditEntityType =
  | "user"
  | "influencer"
  | "kyc"
  | "invoice_request"
  | "profile_edit_request"
  | "onboarding_request"
  | "session";

export type AuditAction =
  | "login"
  | "logout"
  | "otp_requested"
  | "otp_verified"
  | "otp_failed"
  | "onboarding_submitted"
  | "onboarding_bm_approved"
  | "onboarding_bm_rejected"
  | "onboarding_finance_approved"
  | "onboarding_finance_rejected"
  | "onboarding_bm_held"
  | "onboarding_finance_held"
  | "invoice_submitted"
  | "invoice_approved"
  | "invoice_rejected"
  | "invoice_held"
  | "invoice_marked_paid"
  | "profile_edit_requested"
  | "influencer_manager_reassigned"
  | "user_created"
  | "user_updated";

export interface AuditLogEntry {
  id: string;
  actorUserId: string | null;
  actorRole: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  /** Structured metadata; never store unmasked secrets here in api/. */
  metadata: Record<string, unknown>;
  createdAt: string;
}
