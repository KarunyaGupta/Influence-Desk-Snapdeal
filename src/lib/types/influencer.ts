import type { KycRecord } from "./kyc";

export type OnboardingStatus =
  | "draft"
  | "mobile_verified"
  | "email_verified"
  | "submitted"
  | "active";

export type ProfileEditFieldGroup = "pan" | "bank" | "address" | "gst" | "msme" | "mobile" | "email";

export type ProfileEditRequestStatus = "pending" | "approved" | "rejected";

export interface ProfileEditRequest {
  id: string;
  influencerId: string;
  fieldGroup: ProfileEditFieldGroup;
  reason: string;
  status: ProfileEditRequestStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
}

export interface Influencer {
  /** Public influencer ID, e.g. SIF1234567 */
  influencerId: string;
  userId: string;
  displayName: string;
  mobile: string;
  mobileMasked: string;
  email: string;
  emailMasked: string;
  mobileVerified: boolean;
  emailVerified: boolean;
  onboardingStatus: OnboardingStatus;
  termsAcceptedAt: string | null;
  /** BM user ID assigned as this influencer's manager */
  assignedManagerUserId: string | null;
  /** Payment terms set by BM at approval (e.g. "30_days") */
  paymentTerms: string | null;
  kyc: KycRecord;
  createdAt: string;
}
