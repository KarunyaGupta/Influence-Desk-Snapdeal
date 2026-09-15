export type VerificationStatus =
  | "pending"
  | "valid"
  | "invalid"
  | "inoperative";

export type DocumentMime = "application/pdf" | "image/jpeg" | "image/png";

export interface UploadedDocument {
  id: string;
  fileName: string;
  mimeType: DocumentMime;
  /** Prototype uses object URLs / static paths. Backend will use encrypted blob URIs. */
  url: string;
  uploadedAt: string;
}

export interface PanDetails {
  /** Unmasked PAN is only returned to finance, admin, and the influencer (self). */
  panNumber: string;
  panNumberMasked: string;
  nameOnPan: string;
  document: UploadedDocument | null;
  verificationStatus: VerificationStatus;
  /** True when NSDL/Protean name match succeeded. */
  nameMatches: boolean | null;
  verifiedAt: string | null;
}

export interface BankAccount {
  accountNumber: string;
  accountNumberMasked: string;
  ifsc: string;
  bankName: string;
  cancelledCheque: UploadedDocument | null;
  ifscValid: boolean | null;
  verificationStatus: VerificationStatus;
  verifiedAt: string | null;
}

export interface GstDetails {
  applicable: boolean;
  gstin: string | null;
  certificate: UploadedDocument | null;
}

export interface MsmeDetails {
  applicable: boolean;
  registrationNumber: string | null;
  certificate: UploadedDocument | null;
}

export interface AddressDetails {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface SocialDetails {
  youtubeUrl: string;
  instagramUrl: string;
  contentLanguage: string;
}

/**
 * Aggregated KYC as stored. Presentation masking is applied in KycService
 * based on the caller's role — UI never masks ad hoc.
 */
export interface KycRecord {
  influencerId: string;
  pan: PanDetails | null;
  bank: BankAccount | null;
  address: AddressDetails | null;
  socialDetails: SocialDetails | null;
  gst: GstDetails | null;
  msme: MsmeDetails | null;
  overallStatus: "incomplete" | "submitted" | "verified" | "edit_requested";
  updatedAt: string;
}
