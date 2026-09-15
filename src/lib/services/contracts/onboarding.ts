import type {
  AddressDetails,
  BankAccount,
  FinancePaymentDetails,
  GstDetails,
  Influencer,
  MsmeDetails,
  OnboardingRequest,
  PanDetails,
  SocialDetails,
} from "@/lib/types";

export interface OnboardingDraftInput {
  pan?: Omit<PanDetails, "panNumberMasked" | "verifiedAt" | "nameMatches"> & {
    panNumber: string;
  };
  bank?: Omit<BankAccount, "accountNumberMasked" | "verifiedAt" | "ifscValid">;
  address?: AddressDetails;
  socialDetails?: SocialDetails;
  gst?: GstDetails;
  msme?: MsmeDetails;
  termsAccepted?: boolean;
  /** Password set during onboarding. Stored on user record. */
  password?: string;
}

export interface OnboardingService {
  getCurrentDraft(): Promise<Influencer | null>;
  saveDraft(input: OnboardingDraftInput): Promise<Influencer>;
  verifyPan(panNumber: string, nameOnPan: string): Promise<PanDetails>;
  validateIfsc(ifsc: string): Promise<{ valid: boolean; bankName: string | null }>;

  /**
   * Creates an OnboardingRequest with status "pending_bm_review".
   * Does NOT create an active Influencer or generate a SIF ID.
   */
  submit(): Promise<OnboardingRequest>;

  /** Get the latest onboarding request for the current user. */
  getMyOnboardingRequest(): Promise<OnboardingRequest | null>;

  /** BM approves → status becomes "pending_finance_review".
   *  BM must assign an Influencer Manager and set Payment Terms. */
  approveOnboardingAsBM(
    requestId: string,
    bmApprovalDetails: { assignedManagerUserId: string; paymentTerms: string },
  ): Promise<OnboardingRequest>;

  /** BM rejects → status becomes "rejected" */
  rejectOnboardingAsBM(requestId: string, comment: string): Promise<OnboardingRequest>;

  /** BM places on hold → status becomes "on_hold_bm" */
  holdOnboardingAsBM(requestId: string, comment: string): Promise<OnboardingRequest>;

  /** FM approves → status becomes "approved", SIF ID generated, influencer activated.
   *  Finance must provide all 3 payment fields (Supplier Type, Mode of Payment, Vendor TDS Type). */
  approveOnboardingAsFinance(
    requestId: string,
    financePaymentDetails: FinancePaymentDetails,
  ): Promise<OnboardingRequest>;

  /** FM rejects → status becomes "rejected" */
  rejectOnboardingAsFinance(requestId: string, comment: string): Promise<OnboardingRequest>;

  /** FM places on hold → status becomes "on_hold_finance" */
  holdOnboardingAsFinance(requestId: string, comment: string): Promise<OnboardingRequest>;

  /** List all onboarding requests (for BM/FM/Admin queues) */
  listOnboardingRequests(filters?: {
    status?: OnboardingRequest["status"];
  }): Promise<OnboardingRequest[]>;

  /**
   * List active Business Managers that can be assigned as an Influencer Manager.
   * Callable by BM/FM/Admin — used to populate the assignment dropdown at BM approval.
   */
  listAssignableManagers(): Promise<{ id: string; displayName: string }[]>;
}
