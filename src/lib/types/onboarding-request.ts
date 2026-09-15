import type { AddressDetails, GstDetails, MsmeDetails, PanDetails, BankAccount, SocialDetails } from "./kyc";

export type OnboardingRequestStatus =
  | "pending_bm_review"
  | "pending_finance_review"
  | "on_hold_bm"
  | "on_hold_finance"
  | "approved"
  | "rejected";

export interface OnboardingRequestDraftData {
  displayName: string;
  mobile: string;
  email: string;
  /**
   * TODO: SECURITY — Production must hash this with bcrypt/argon2 before persisting.
   * Stored as plain text ONLY for mock/prototype purposes.
   */
  password: string;
  pan: Omit<PanDetails, "panNumberMasked" | "verifiedAt" | "nameMatches"> | null;
  bank: Omit<BankAccount, "accountNumberMasked" | "verifiedAt" | "ifscValid"> | null;
  address: AddressDetails | null;
  socialDetails: SocialDetails | null;
  gst: GstDetails | null;
  msme: MsmeDetails | null;
  currency: string;
}

/** Finance-owned payment fields, filled by FM before approval */
export interface FinancePaymentDetails {
  supplierType: string;
  modeOfPayment: string;
  vendorTdsType: string;
}

export interface OnboardingRequest {
  id: string;
  userId: string;
  draftData: OnboardingRequestDraftData;
  status: OnboardingRequestStatus;

  // BM review
  bmReviewerUserId: string | null;
  bmComment: string | null;
  bmReviewedAt: string | null;
  /** BM-assigned influencer manager (a BM user ID) — set at BM approval */
  assignedManagerUserId: string | null;
  /** Payment terms set by BM at approval (e.g. "30_days", "45_days", "60_days") */
  bmPaymentTerms: string | null;

  // Finance review
  financeReviewerUserId: string | null;
  financeComment: string | null;
  financeReviewedAt: string | null;

  /** Set only when status === "rejected" — which stage rejected */
  rejectedByStage: "bm" | "finance" | null;

  /** Hold reason (set when on_hold_bm or on_hold_finance) */
  holdComment: string | null;
  /** Which stage placed it on hold */
  holdByStage: "bm" | "finance" | null;

  /** The SIF ID generated on finance approval — null until then */
  generatedInfluencerId: string | null;

  /** Finance-owned payment details, filled by FM at approval time */
  financePaymentDetails: FinancePaymentDetails | null;

  submittedAt: string;
}
