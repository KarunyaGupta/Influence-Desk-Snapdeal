export type InvoiceRequestStatus =
  | "pending_bm_approval"
  | "pending_finance_approval"
  | "on_hold_bm"
  | "on_hold_finance"
  | "approved_payment_pending"
  | "paid"
  | "rejected";

export type ApprovalActorRole = "business_manager" | "finance_manager" | "admin";

export type ApprovalAction = "approve" | "reject" | "hold" | "mark_paid";

export interface ApprovalStep {
  id: string;
  requestId: string;
  actorRole: ApprovalActorRole;
  actorUserId: string;
  action: ApprovalAction;
  /** Required when action is reject. */
  comment: string | null;
  /** ERP UTR / payment reference when action is mark_paid. */
  paymentReference: string | null;
  createdAt: string;
}

export interface InvoiceRequest {
  requestId: string;
  influencerId: string;
  /** One or more YouTube video links associated with this invoice */
  youtubeVideoLinks: string[];
  /** Date of the last video upload (YYYY-MM-DD) */
  lastVideoUploadDate: string;
  invoiceNumber: string;
  invoiceDate: string;
  amountInr: number;
  document: {
    id: string;
    fileName: string;
    mimeType: "application/pdf" | "image/jpeg" | "image/png";
    url: string;
    uploadedAt: string;
  };
  status: InvoiceRequestStatus;
  rejectionComment: string | null;
  rejectedByRole: ApprovalActorRole | null;
  rejectedAt: string | null;
  /** Hold reason when status is on_hold_bm or on_hold_finance */
  holdComment: string | null;
  paymentReference: string | null;
  paidAt: string | null;
  submittedAt: string;
  approvalSteps: ApprovalStep[];
}
