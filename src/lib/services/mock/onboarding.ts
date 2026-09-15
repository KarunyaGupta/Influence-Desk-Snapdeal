import type { Influencer, OnboardingRequest, PanDetails, FinancePaymentDetails } from "@/lib/types";
import type { OnboardingService } from "@/lib/services/contracts/onboarding";
import { ServiceError, withLatency } from "@/lib/mock/latency";
import { maskAccount, maskEmail, maskMobile, maskPan } from "@/lib/mock/masking";
import { getMockStore } from "@/lib/mock/store";
import { nowIso, uid } from "@/lib/mock/types";

const IFSC_BANKS: Record<string, string> = {
  HDFC0001234: "HDFC Bank",
  ICIC0004321: "ICICI Bank",
  SBIN0001111: "State Bank of India",
};

function nextInfluencerId(existing: Influencer[]): string {
  const nums = existing
    .map((i) => Number(i.influencerId.replace("SIF", "")))
    .filter(Number.isFinite);
  const next = (nums.length ? Math.max(...nums) : 1000000) + 1;
  return `SIF${String(next).padStart(7, "0")}`;
}

function ensureDraft(): Influencer {
  const store = getMockStore();
  const user = store.requireUser();
  if (user.role !== "influencer") {
    throw new ServiceError("Only influencers can onboard.", "FORBIDDEN", 403);
  }
  let draft = store.state.influencers.find((i) => i.userId === user.id);
  if (!draft) {
    draft = {
      influencerId: `DRAFT-${user.id}`,
      userId: user.id,
      displayName: user.displayName,
      mobile: user.mobile,
      mobileMasked: maskMobile(user.mobile),
      email: user.email,
      emailMasked: user.email ? maskEmail(user.email) : "",
      mobileVerified: true,
      emailVerified: Boolean(user.email),
      onboardingStatus: user.email ? "email_verified" : "mobile_verified",
      termsAcceptedAt: null,
      assignedManagerUserId: null,
      paymentTerms: null,
      createdAt: nowIso(),
      kyc: {
        influencerId: `DRAFT-${user.id}`,
        pan: null,
        bank: null,
        address: null,
        socialDetails: null,
        gst: null,
        msme: null,
        overallStatus: "incomplete",
        updatedAt: nowIso(),
      },
    };
    store.state.influencers.push(draft);
  }
  return draft;
}

export const mockOnboardingService: OnboardingService = {
  async getCurrentDraft() {
    await withLatency(null);
    const store = getMockStore();
    const user = store.currentUser();
    if (!user || user.role !== "influencer") return null;
    return store.state.influencers.find((i) => i.userId === user.id) ?? null;
  },

  async saveDraft(input) {
    await withLatency(null);
    const draft = ensureDraft();
    if (input.pan) {
      draft.kyc.pan = {
        ...input.pan,
        panNumberMasked: maskPan(input.pan.panNumber),
        nameMatches: draft.kyc.pan?.nameMatches ?? null,
        verifiedAt: draft.kyc.pan?.verifiedAt ?? null,
      };
    }
    if (input.bank) {
      draft.kyc.bank = {
        ...input.bank,
        accountNumberMasked: maskAccount(input.bank.accountNumber),
        ifscValid: draft.kyc.bank?.ifscValid ?? null,
        verifiedAt: draft.kyc.bank?.verifiedAt ?? null,
      };
    }
    if (input.address) draft.kyc.address = input.address;
    if (input.socialDetails) draft.kyc.socialDetails = input.socialDetails;
    if (input.gst) draft.kyc.gst = input.gst;
    if (input.msme) draft.kyc.msme = input.msme;
    if (input.termsAccepted) draft.termsAcceptedAt = nowIso();
    if (input.password) {
      // Store password on user record (TODO: hash in production)
      const store = getMockStore();
      const userRecord = store.state.users.find((u) => u.id === draft.userId);
      if (userRecord) userRecord.password = input.password;
    }
    draft.kyc.updatedAt = nowIso();
    return draft;
  },

  async verifyPan(panNumber, nameOnPan) {
    await withLatency(null);
    const inoperative = panNumber.toUpperCase().endsWith("K");
    const invalid = panNumber.length !== 10;
    const result: PanDetails = {
      panNumber: panNumber.toUpperCase(),
      panNumberMasked: maskPan(panNumber.toUpperCase()),
      nameOnPan,
      document: null,
      verificationStatus: invalid ? "invalid" : inoperative ? "inoperative" : "valid",
      nameMatches: !invalid,
      verifiedAt: nowIso(),
    };
    const draft = ensureDraft();
    draft.kyc.pan = { ...result, document: draft.kyc.pan?.document ?? null };
    return result;
  },

  async validateIfsc(ifsc) {
    await withLatency(null);
    const bankName =
      IFSC_BANKS[ifsc.toUpperCase()] ?? (ifsc.length === 11 ? "Mock Bank" : null);
    const valid = Boolean(bankName);
    const draft = ensureDraft();
    if (draft.kyc.bank) draft.kyc.bank.ifscValid = valid;
    return { valid, bankName };
  },

  /**
   * Creates an OnboardingRequest with status "pending_bm_review".
   * Does NOT create an active influencer or generate a SIF ID.
   */
  async submit() {
    await withLatency(null);
    const draft = ensureDraft();
    if (!draft.kyc.pan || !draft.kyc.bank || !draft.kyc.address || !draft.termsAcceptedAt) {
      throw new ServiceError("Onboarding is incomplete.", "VALIDATION", 400);
    }

    const store = getMockStore();

    // Set the draft status to "submitted" (not yet active)
    draft.onboardingStatus = "submitted";

    // Use PAN name as the real display name if the current one is a placeholder
    const realName =
      draft.kyc.pan?.nameOnPan && draft.displayName === "New influencer"
        ? draft.kyc.pan.nameOnPan
        : draft.displayName;
    draft.displayName = realName;

    // Also update the user record so the session reflects the real name
    const userRecord = store.state.users.find((u) => u.id === draft.userId);
    if (userRecord && userRecord.displayName === "New influencer") {
      userRecord.displayName = realName;
    }

    const request: OnboardingRequest = {
      id: uid("onb"),
      userId: draft.userId,
      draftData: {
        displayName: realName,
        mobile: draft.mobile,
        email: draft.email,
        password: userRecord?.password ?? "",
        pan: draft.kyc.pan
          ? {
              panNumber: draft.kyc.pan.panNumber,
              nameOnPan: draft.kyc.pan.nameOnPan,
              document: draft.kyc.pan.document,
              verificationStatus: draft.kyc.pan.verificationStatus,
            }
          : null,
        bank: draft.kyc.bank
          ? {
              accountNumber: draft.kyc.bank.accountNumber,
              ifsc: draft.kyc.bank.ifsc,
              bankName: draft.kyc.bank.bankName,
              cancelledCheque: draft.kyc.bank.cancelledCheque,
              verificationStatus: draft.kyc.bank.verificationStatus,
            }
          : null,
        address: draft.kyc.address,
        socialDetails: draft.kyc.socialDetails,
        gst: draft.kyc.gst,
        msme: draft.kyc.msme,
        currency: "INR",
      },
      status: "pending_bm_review",
      bmReviewerUserId: null,
      bmComment: null,
      bmReviewedAt: null,
      assignedManagerUserId: null,
      bmPaymentTerms: null,
      financeReviewerUserId: null,
      financeComment: null,
      financeReviewedAt: null,
      rejectedByStage: null,
      holdComment: null,
      holdByStage: null,
      generatedInfluencerId: null,
      financePaymentDetails: null,
      submittedAt: nowIso(),
    };

    store.state.onboardingRequests.push(request);
    store.appendAudit({
      action: "onboarding_submitted",
      entityType: "onboarding_request",
      entityId: request.id,
    });

    // Notify all BMs about the new onboarding request
    const bmUsers = store.state.users.filter((u) => u.role === "business_manager" && u.status === "active");
    for (const bm of bmUsers) {
      store.state.notifications.push({
        id: uid("ntf"),
        userId: bm.id,
        channel: "in_app",
        type: "welcome",
        title: "New Onboarding Request",
        body: `${realName} has submitted an onboarding application and needs your review.`,
        readAt: null,
        createdAt: nowIso(),
        relatedEntityType: "influencer",
        relatedEntityId: request.id,
      });
    }

    // Notify influencer (email confirmation)
    store.state.notifications.push({
      id: uid("ntf"),
      userId: draft.userId,
      channel: "email",
      type: "welcome",
      title: "Application Submitted",
      body: `Your onboarding application has been submitted and is under review. You'll be notified when there's an update.`,
      readAt: null,
      createdAt: nowIso(),
      relatedEntityType: "influencer",
      relatedEntityId: request.id,
    });

    return request;
  },

  async getMyOnboardingRequest() {
    await withLatency(null);
    const store = getMockStore();
    const user = store.currentUser();
    if (!user) return null;
    // Return the most recent request for this user
    const requests = store.state.onboardingRequests
      .filter((r) => r.userId === user.id)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    return requests[0] ?? null;
  },

  async approveOnboardingAsBM(requestId, bmApprovalDetails) {
    await withLatency(null);
    const store = getMockStore();
    const user = store.requireUser();
    if (user.role !== "business_manager" && user.role !== "admin") {
      throw new ServiceError("Forbidden.", "FORBIDDEN", 403);
    }
    const request = store.state.onboardingRequests.find((r) => r.id === requestId);
    if (!request) throw new ServiceError("Request not found.", "NOT_FOUND", 404);
    if (request.status !== "pending_bm_review" && request.status !== "on_hold_bm") {
      throw new ServiceError("Request is not pending BM review.", "CONFLICT", 409);
    }

    // Validate BM-required fields
    const missing: string[] = [];
    if (!bmApprovalDetails?.assignedManagerUserId?.trim()) missing.push("Influencer Manager");
    if (!bmApprovalDetails?.paymentTerms?.trim()) missing.push("Payment Terms");
    if (missing.length > 0) {
      throw new ServiceError(
        `Complete required fields before approving. Missing: ${missing.join(", ")}.`,
        "VALIDATION",
        400,
      );
    }

    request.status = "pending_finance_review";
    request.bmReviewerUserId = user.id;
    request.bmReviewedAt = nowIso();
    request.assignedManagerUserId = bmApprovalDetails.assignedManagerUserId;
    request.bmPaymentTerms = bmApprovalDetails.paymentTerms;
    store.appendAudit({
      action: "onboarding_bm_approved",
      entityType: "onboarding_request",
      entityId: requestId,
    });

    // Notify all FMs about the BM-approved onboarding request
    const fmUsers = store.state.users.filter((u) => u.role === "finance_manager" && u.status === "active");
    for (const fm of fmUsers) {
      store.state.notifications.push({
        id: uid("ntf"),
        userId: fm.id,
        channel: "in_app",
        type: "welcome",
        title: "Onboarding Ready for Finance Review",
        body: `${request.draftData.displayName}'s onboarding has been approved by BM and needs your review.`,
        readAt: null,
        createdAt: nowIso(),
        relatedEntityType: "influencer",
        relatedEntityId: requestId,
      });
    }

    return request;
  },

  async rejectOnboardingAsBM(requestId, comment) {
    await withLatency(null);
    if (!comment.trim()) {
      throw new ServiceError("Rejection comment is mandatory.", "VALIDATION", 400);
    }
    const store = getMockStore();
    const user = store.requireUser();
    if (user.role !== "business_manager" && user.role !== "admin") {
      throw new ServiceError("Forbidden.", "FORBIDDEN", 403);
    }
    const request = store.state.onboardingRequests.find((r) => r.id === requestId);
    if (!request) throw new ServiceError("Request not found.", "NOT_FOUND", 404);
    if (request.status !== "pending_bm_review" && request.status !== "on_hold_bm") {
      throw new ServiceError("Request is not pending BM review.", "CONFLICT", 409);
    }
    request.status = "rejected";
    request.bmReviewerUserId = user.id;
    request.bmComment = comment;
    request.bmReviewedAt = nowIso();
    request.rejectedByStage = "bm";

    // Reset the influencer draft so they can resubmit
    const draft = store.state.influencers.find((i) => i.userId === request.userId);
    if (draft) draft.onboardingStatus = "email_verified";

    store.appendAudit({
      action: "onboarding_bm_rejected",
      entityType: "onboarding_request",
      entityId: requestId,
      metadata: { comment },
    });
    // Notify influencer about rejection
    store.state.notifications.push(
      {
        id: uid("ntf"),
        userId: request.userId,
        channel: "in_app",
        type: "invoice_rejected",
        title: "Application Update",
        body: `Your onboarding application needs changes. Reason: ${comment}`,
        readAt: null,
        createdAt: nowIso(),
        relatedEntityType: "influencer",
        relatedEntityId: requestId,
      },
      {
        id: uid("ntf"),
        userId: request.userId,
        channel: "email",
        type: "invoice_rejected",
        title: "Onboarding Application — Changes Requested",
        body: `Your onboarding application needs changes before it can be approved. Reason: ${comment}`,
        readAt: null,
        createdAt: nowIso(),
        relatedEntityType: "influencer",
        relatedEntityId: requestId,
      },
    );
    return request;
  },

  async holdOnboardingAsBM(requestId, comment) {
    await withLatency(null);
    if (!comment.trim()) {
      throw new ServiceError("Hold reason is required.", "VALIDATION", 400);
    }
    if (comment.length > 500) {
      throw new ServiceError("Hold reason must be 500 characters or less.", "VALIDATION", 400);
    }
    const store = getMockStore();
    const user = store.requireUser();
    if (user.role !== "business_manager" && user.role !== "admin") {
      throw new ServiceError("Forbidden.", "FORBIDDEN", 403);
    }
    const request = store.state.onboardingRequests.find((r) => r.id === requestId);
    if (!request) throw new ServiceError("Request not found.", "NOT_FOUND", 404);
    if (request.status !== "pending_bm_review" && request.status !== "on_hold_bm") {
      throw new ServiceError("Request is not pending BM review.", "CONFLICT", 409);
    }
    request.status = "on_hold_bm";
    request.holdComment = comment.trim();
    request.holdByStage = "bm";
    store.appendAudit({
      action: "onboarding_bm_held",
      entityType: "onboarding_request",
      entityId: requestId,
      metadata: { comment: comment.trim() },
    });
    // Notify influencer (email)
    store.state.notifications.push({
      id: uid("ntf"),
      userId: request.userId,
      channel: "email",
      type: "welcome",
      title: "Application Update",
      body: `Your onboarding application is still under review. We'll notify you when there's an update.`,
      readAt: null,
      createdAt: nowIso(),
      relatedEntityType: "influencer",
      relatedEntityId: requestId,
    });
    return request;
  },

  async approveOnboardingAsFinance(requestId, financePaymentDetails) {
    await withLatency(null);
    const store = getMockStore();
    const user = store.requireUser();
    if (user.role !== "finance_manager" && user.role !== "admin") {
      throw new ServiceError("Forbidden.", "FORBIDDEN", 403);
    }
    const request = store.state.onboardingRequests.find((r) => r.id === requestId);
    if (!request) throw new ServiceError("Request not found.", "NOT_FOUND", 404);
    if (request.status !== "pending_finance_review" && request.status !== "on_hold_finance") {
      throw new ServiceError("Request is not pending finance review.", "CONFLICT", 409);
    }

    // Validate all 3 finance payment fields are provided
    const missing: string[] = [];
    if (!financePaymentDetails?.supplierType?.trim()) missing.push("Supplier Type");
    if (!financePaymentDetails?.modeOfPayment?.trim()) missing.push("Mode of Payment");
    if (!financePaymentDetails?.vendorTdsType?.trim()) missing.push("Vendor TDS Type");
    if (missing.length > 0) {
      throw new ServiceError(
        `Complete Payment Details before approving. Missing: ${missing.join(", ")}.`,
        "VALIDATION",
        400,
      );
    }

    request.status = "approved";
    request.financeReviewerUserId = user.id;
    request.financeReviewedAt = nowIso();
    request.financePaymentDetails = financePaymentDetails as FinancePaymentDetails;

    // NOW generate the SIF ID and activate the influencer
    const draft = store.state.influencers.find((i) => i.userId === request.userId);
    if (draft) {
      if (!draft.influencerId.startsWith("SIF")) {
        draft.influencerId = nextInfluencerId(store.state.influencers);
        draft.kyc.influencerId = draft.influencerId;
      }
      draft.onboardingStatus = "active";
      draft.kyc.overallStatus = "submitted";
      request.generatedInfluencerId = draft.influencerId;
      // Copy BM-set fields to influencer record
      draft.assignedManagerUserId = request.assignedManagerUserId;
      draft.paymentTerms = request.bmPaymentTerms;

      // Fire welcome notifications
      store.state.notifications.push(
        {
          id: uid("ntf"),
          userId: draft.userId,
          channel: "sms",
          type: "welcome",
          title: "Welcome to Snapdeal Influencer Hub!",
          body: `Your influencer ID is ${draft.influencerId}. You can now start submitting invoices.`,
          readAt: null,
          createdAt: nowIso(),
          relatedEntityType: "influencer",
          relatedEntityId: draft.influencerId,
        },
        {
          id: uid("ntf"),
          userId: draft.userId,
          channel: "email",
          type: "welcome",
          title: "You're Onboarded!",
          body: `Congratulations! Your influencer account (${draft.influencerId}) is now active. Log in to submit your first invoice.`,
          readAt: null,
          createdAt: nowIso(),
          relatedEntityType: "influencer",
          relatedEntityId: draft.influencerId,
        },
        {
          id: uid("ntf"),
          userId: draft.userId,
          channel: "in_app",
          type: "welcome",
          title: "Account Activated",
          body: `Your influencer ID is ${draft.influencerId}. Your onboarding has been approved by the finance team.`,
          readAt: null,
          createdAt: nowIso(),
          relatedEntityType: "influencer",
          relatedEntityId: draft.influencerId,
        },
      );
    }

    store.appendAudit({
      action: "onboarding_finance_approved",
      entityType: "onboarding_request",
      entityId: requestId,
      metadata: { influencerId: request.generatedInfluencerId },
    });
    return request;
  },

  async rejectOnboardingAsFinance(requestId, comment) {
    await withLatency(null);
    if (!comment.trim()) {
      throw new ServiceError("Rejection comment is mandatory.", "VALIDATION", 400);
    }
    const store = getMockStore();
    const user = store.requireUser();
    if (user.role !== "finance_manager" && user.role !== "admin") {
      throw new ServiceError("Forbidden.", "FORBIDDEN", 403);
    }
    const request = store.state.onboardingRequests.find((r) => r.id === requestId);
    if (!request) throw new ServiceError("Request not found.", "NOT_FOUND", 404);
    if (request.status !== "pending_finance_review" && request.status !== "on_hold_finance") {
      throw new ServiceError("Request is not pending finance review.", "CONFLICT", 409);
    }
    request.status = "rejected";
    request.financeReviewerUserId = user.id;
    request.financeComment = comment;
    request.financeReviewedAt = nowIso();
    request.rejectedByStage = "finance";

    // Reset the influencer draft so they can resubmit
    const draft = store.state.influencers.find((i) => i.userId === request.userId);
    if (draft) draft.onboardingStatus = "email_verified";

    store.appendAudit({
      action: "onboarding_finance_rejected",
      entityType: "onboarding_request",
      entityId: requestId,
      metadata: { comment },
    });
    // Notify influencer about rejection
    store.state.notifications.push(
      {
        id: uid("ntf"),
        userId: request.userId,
        channel: "in_app",
        type: "invoice_rejected",
        title: "Application Update",
        body: `Your onboarding application needs changes. Reason: ${comment}`,
        readAt: null,
        createdAt: nowIso(),
        relatedEntityType: "influencer",
        relatedEntityId: requestId,
      },
      {
        id: uid("ntf"),
        userId: request.userId,
        channel: "email",
        type: "invoice_rejected",
        title: "Onboarding Application — Changes Requested",
        body: `Your onboarding application needs changes. Reason: ${comment}`,
        readAt: null,
        createdAt: nowIso(),
        relatedEntityType: "influencer",
        relatedEntityId: requestId,
      },
    );
    return request;
  },

  async holdOnboardingAsFinance(requestId, comment) {
    await withLatency(null);
    if (!comment.trim()) {
      throw new ServiceError("Hold reason is required.", "VALIDATION", 400);
    }
    if (comment.length > 500) {
      throw new ServiceError("Hold reason must be 500 characters or less.", "VALIDATION", 400);
    }
    const store = getMockStore();
    const user = store.requireUser();
    if (user.role !== "finance_manager" && user.role !== "admin") {
      throw new ServiceError("Forbidden.", "FORBIDDEN", 403);
    }
    const request = store.state.onboardingRequests.find((r) => r.id === requestId);
    if (!request) throw new ServiceError("Request not found.", "NOT_FOUND", 404);
    if (request.status !== "pending_finance_review" && request.status !== "on_hold_finance") {
      throw new ServiceError("Request is not pending finance review.", "CONFLICT", 409);
    }
    request.status = "on_hold_finance";
    request.holdComment = comment.trim();
    request.holdByStage = "finance";
    store.appendAudit({
      action: "onboarding_finance_held",
      entityType: "onboarding_request",
      entityId: requestId,
      metadata: { comment: comment.trim() },
    });
    // Notify influencer (email)
    store.state.notifications.push({
      id: uid("ntf"),
      userId: request.userId,
      channel: "email",
      type: "welcome",
      title: "Application Update",
      body: `Your onboarding application is still under review. We'll notify you when there's an update.`,
      readAt: null,
      createdAt: nowIso(),
      relatedEntityType: "influencer",
      relatedEntityId: requestId,
    });
    return request;
  },

  async listOnboardingRequests(filters) {
    await withLatency(null);
    const store = getMockStore();
    let list = store.state.onboardingRequests;
    if (filters?.status) {
      list = list.filter((r) => r.status === filters.status);
    }
    return list;
  },

  async listAssignableManagers() {
    await withLatency(null);
    const store = getMockStore();
    const user = store.requireUser();
    if (user.role !== "business_manager" && user.role !== "finance_manager" && user.role !== "admin") {
      throw new ServiceError("Forbidden.", "FORBIDDEN", 403);
    }
    return store.state.users
      .filter((u) => u.role === "business_manager" && u.status === "active")
      .map((u) => ({ id: u.id, displayName: u.displayName }));
  },
};
