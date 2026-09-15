import type { InvoiceRequest } from "@/lib/types";
import type { InvoiceService } from "@/lib/services/contracts/invoice";
import { ServiceError, withLatency } from "@/lib/mock/latency";
import { getMockStore } from "@/lib/mock/store";
import { nowIso, uid } from "@/lib/mock/types";

function nextRequestId(existing: InvoiceRequest[]): string {
  const nums = existing.map((r) => Number(r.requestId.replace("REQ-", ""))).filter(Number.isFinite);
  const next = (nums.length ? Math.max(...nums) : 1000) + 1;
  return `REQ-${next}`;
}

export const mockInvoiceService: InvoiceService = {
  async listForCurrentUser() {
    await withLatency(null);
    const store = getMockStore();
    const user = store.requireUser();
    if (user.role === "influencer") {
      const inf = store.state.influencers.find((i) => i.userId === user.id);
      return store.state.invoices.filter((r) => r.influencerId === inf?.influencerId);
    }
    if (user.role === "business_manager") {
      // BM sees only invoices for influencers assigned to them as manager
      const assignedInfluencerIds = new Set(
        store.state.influencers
          .filter((i) => i.assignedManagerUserId === user.id)
          .map((i) => i.influencerId),
      );
      return store.state.invoices.filter((r) => assignedInfluencerIds.has(r.influencerId));
    }
    if (user.role === "finance_manager") {
      return store.state.invoices.filter((r) =>
        ["pending_finance_approval", "on_hold_finance", "approved_payment_pending", "paid", "rejected"].includes(
          r.status,
        ),
      );
    }
    return store.state.invoices;
  },

  async getById(requestId) {
    await withLatency(null);
    const store = getMockStore();
    const request = store.state.invoices.find((r) => r.requestId === requestId);
    if (!request) throw new ServiceError("Request not found.", "NOT_FOUND", 404);
    return request;
  },

  async submit(input) {
    await withLatency(null);
    const store = getMockStore();
    const user = store.requireUser();
    if (user.role !== "influencer") throw new ServiceError("Forbidden.", "FORBIDDEN", 403);
    const inf = store.state.influencers.find((i) => i.userId === user.id);
    if (!inf || inf.onboardingStatus !== "active") {
      throw new ServiceError("Complete onboarding first.", "VALIDATION", 400);
    }
    if (!input.youtubeVideoLinks.length) {
      throw new ServiceError("At least one YouTube video link is required.", "VALIDATION", 400);
    }
    if (!input.lastVideoUploadDate) {
      throw new ServiceError("Last video upload date is required.", "VALIDATION", 400);
    }
    const duplicate = store.state.invoices.some(
      (r) => r.influencerId === inf.influencerId && r.invoiceNumber === input.invoiceNumber,
    );
    if (duplicate) {
      throw new ServiceError(
        "This invoice number was already submitted.",
        "DUPLICATE_INVOICE",
        409,
      );
    }
    const request: InvoiceRequest = {
      requestId: nextRequestId(store.state.invoices),
      influencerId: inf.influencerId,
      youtubeVideoLinks: input.youtubeVideoLinks,
      lastVideoUploadDate: input.lastVideoUploadDate,
      invoiceNumber: input.invoiceNumber,
      invoiceDate: input.invoiceDate,
      amountInr: input.amountInr,
      document: {
        id: uid("doc"),
        fileName: input.fileName,
        mimeType: input.mimeType,
        url: `/mock-docs/${input.fileName}`,
        uploadedAt: nowIso(),
      },
      status: "pending_bm_approval",
      rejectionComment: null,
      rejectedByRole: null,
      rejectedAt: null,
      paymentReference: null,
      paidAt: null,
      holdComment: null,
      submittedAt: nowIso(),
      approvalSteps: [],
    };
    store.state.invoices.unshift(request);
    store.appendAudit({
      action: "invoice_submitted",
      entityType: "invoice_request",
      entityId: request.requestId,
    });
    // Notify all active BMs about the new request
    const bmUsers = store.state.users.filter((u) => u.role === "business_manager" && u.status === "active");
    for (const bm of bmUsers) {
      store.state.notifications.push({
        id: uid("ntf"),
        userId: bm.id,
        channel: "email",
        type: "invoice_submitted",
        title: "New invoice request",
        body: `${inf.displayName} submitted ${request.requestId} (₹${request.amountInr.toLocaleString("en-IN")}).`,
        readAt: null,
        createdAt: nowIso(),
        relatedEntityType: "invoice_request",
        relatedEntityId: request.requestId,
      });
    }
    return request;
  },

  async approve(requestId) {
    await withLatency(null);
    const store = getMockStore();
    const user = store.requireUser();
    const request = store.state.invoices.find((r) => r.requestId === requestId);
    if (!request) throw new ServiceError("Request not found.", "NOT_FOUND", 404);

    if (user.role === "business_manager") {
      if (request.status !== "pending_bm_approval" && request.status !== "on_hold_bm") {
        throw new ServiceError("Request is not awaiting BM approval.", "CONFLICT", 409);
      }
      request.status = "pending_finance_approval";
      request.approvalSteps.push({
        id: uid("step"),
        requestId,
        actorRole: "business_manager",
        actorUserId: user.id,
        action: "approve",
        comment: null,
        paymentReference: null,
        createdAt: nowIso(),
      });
      store.appendAudit({
        action: "invoice_approved",
        entityType: "invoice_request",
        entityId: requestId,
        metadata: { stage: "bm" },
      });
      // Notify FM about new invoice for review
      const fmUsers = store.state.users.filter((u) => u.role === "finance_manager" && u.status === "active");
      for (const fm of fmUsers) {
        store.state.notifications.push({
          id: uid("ntf"),
          userId: fm.id,
          channel: "in_app",
          type: "invoice_approved",
          title: "Invoice Ready for Finance Review",
          body: `Invoice ${requestId} (₹${request.amountInr.toLocaleString("en-IN")}) has been approved by BM and needs your review.`,
          readAt: null,
          createdAt: nowIso(),
          relatedEntityType: "invoice_request",
          relatedEntityId: requestId,
        });
      }
      // Notify influencer
      const inf = store.state.influencers.find((i) => i.influencerId === request.influencerId);
      if (inf) {
        store.state.notifications.push({
          id: uid("ntf"),
          userId: inf.userId,
          channel: "in_app",
          type: "invoice_approved",
          title: "Invoice Update",
          body: `Your invoice ${requestId} has been approved and is now pending final review.`,
          readAt: null,
          createdAt: nowIso(),
          relatedEntityType: "invoice_request",
          relatedEntityId: requestId,
        });
      }
      return request;
    }

    if (user.role === "finance_manager") {
      if (request.status !== "pending_finance_approval" && request.status !== "on_hold_finance") {
        throw new ServiceError("Request is not awaiting finance approval.", "CONFLICT", 409);
      }
      request.status = "approved_payment_pending";
      request.approvalSteps.push({
        id: uid("step"),
        requestId,
        actorRole: "finance_manager",
        actorUserId: user.id,
        action: "approve",
        comment: null,
        paymentReference: null,
        createdAt: nowIso(),
      });
      store.appendAudit({
        action: "invoice_approved",
        entityType: "invoice_request",
        entityId: requestId,
        metadata: { stage: "fm" },
      });
      // Notify influencer
      const inf2 = store.state.influencers.find((i) => i.influencerId === request.influencerId);
      if (inf2) {
        store.state.notifications.push({
          id: uid("ntf"),
          userId: inf2.userId,
          channel: "in_app",
          type: "invoice_approved",
          title: "Invoice Approved — Payment Pending",
          body: `Your invoice ${requestId} (₹${request.amountInr.toLocaleString("en-IN")}) has been approved. Payment is being processed.`,
          readAt: null,
          createdAt: nowIso(),
          relatedEntityType: "invoice_request",
          relatedEntityId: requestId,
        });
      }
      return request;
    }

    throw new ServiceError("Forbidden.", "FORBIDDEN", 403);
  },

  async reject(requestId, comment) {
    await withLatency(null);
    if (!comment.trim()) {
      throw new ServiceError("Rejection comment is mandatory.", "VALIDATION", 400);
    }
    const store = getMockStore();
    const user = store.requireUser();
    const request = store.state.invoices.find((r) => r.requestId === requestId);
    if (!request) throw new ServiceError("Request not found.", "NOT_FOUND", 404);

    if (user.role === "business_manager" && request.status !== "pending_bm_approval" && request.status !== "on_hold_bm") {
      throw new ServiceError("Request is not awaiting BM approval.", "CONFLICT", 409);
    }
    if (user.role === "finance_manager" && request.status !== "pending_finance_approval" && request.status !== "on_hold_finance") {
      throw new ServiceError("Request is not awaiting finance approval.", "CONFLICT", 409);
    }
    if (user.role !== "business_manager" && user.role !== "finance_manager") {
      throw new ServiceError("Forbidden.", "FORBIDDEN", 403);
    }

    request.status = "rejected";
    request.rejectionComment = comment;
    request.rejectedByRole = user.role;
    request.rejectedAt = nowIso();
    request.approvalSteps.push({
      id: uid("step"),
      requestId,
      actorRole: user.role,
      actorUserId: user.id,
      action: "reject",
      comment,
      paymentReference: null,
      createdAt: nowIso(),
    });
    store.appendAudit({
      action: "invoice_rejected",
      entityType: "invoice_request",
      entityId: requestId,
      metadata: { comment },
    });
    // Notify influencer about rejection
    const infReject = store.state.influencers.find((i) => i.influencerId === request.influencerId);
    if (infReject) {
      store.state.notifications.push({
        id: uid("ntf"),
        userId: infReject.userId,
        channel: "in_app",
        type: "invoice_rejected",
        title: "Invoice Rejected",
        body: `Your invoice ${requestId} needs changes. Reason: ${comment}`,
        readAt: null,
        createdAt: nowIso(),
        relatedEntityType: "invoice_request",
        relatedEntityId: requestId,
      });
    }
    return request;
  },

  async hold(requestId, comment) {
    await withLatency(null);
    if (!comment.trim()) {
      throw new ServiceError("Hold reason is required.", "VALIDATION", 400);
    }
    if (comment.length > 500) {
      throw new ServiceError("Hold reason must be 500 characters or less.", "VALIDATION", 400);
    }
    const store = getMockStore();
    const user = store.requireUser();
    const request = store.state.invoices.find((r) => r.requestId === requestId);
    if (!request) throw new ServiceError("Request not found.", "NOT_FOUND", 404);

    if (user.role === "business_manager") {
      if (request.status !== "pending_bm_approval" && request.status !== "on_hold_bm") {
        throw new ServiceError("Request is not awaiting BM approval.", "CONFLICT", 409);
      }
      request.status = "on_hold_bm";
    } else if (user.role === "finance_manager") {
      if (request.status !== "pending_finance_approval" && request.status !== "on_hold_finance") {
        throw new ServiceError("Request is not awaiting finance approval.", "CONFLICT", 409);
      }
      request.status = "on_hold_finance";
    } else {
      throw new ServiceError("Forbidden.", "FORBIDDEN", 403);
    }

    request.holdComment = comment.trim();
    request.approvalSteps.push({
      id: uid("step"),
      requestId,
      actorRole: user.role as "business_manager" | "finance_manager",
      actorUserId: user.id,
      action: "hold",
      comment: comment.trim(),
      paymentReference: null,
      createdAt: nowIso(),
    });
    store.appendAudit({
      action: "invoice_held",
      entityType: "invoice_request",
      entityId: requestId,
      metadata: { comment: comment.trim(), stage: user.role === "business_manager" ? "bm" : "fm" },
    });
    return request;
  },

  async markPaid(requestId, paymentReference) {
    await withLatency(null);
    if (!paymentReference.trim()) {
      throw new ServiceError("UTR number or payment date is required.", "VALIDATION", 400);
    }
    const store = getMockStore();
    const user = store.requireUser();
    if (user.role !== "finance_manager" && user.role !== "admin") {
      throw new ServiceError("Forbidden.", "FORBIDDEN", 403);
    }
    const request = store.state.invoices.find((r) => r.requestId === requestId);
    if (!request) throw new ServiceError("Request not found.", "NOT_FOUND", 404);
    if (request.status !== "approved_payment_pending") {
      throw new ServiceError("Request is not awaiting payment.", "CONFLICT", 409);
    }
    request.status = "paid";
    request.paymentReference = paymentReference;
    request.paidAt = nowIso();
    request.approvalSteps.push({
      id: uid("step"),
      requestId,
      actorRole: user.role === "admin" ? "admin" : "finance_manager",
      actorUserId: user.id,
      action: "mark_paid",
      comment: null,
      paymentReference,
      createdAt: nowIso(),
    });
    store.appendAudit({
      action: "invoice_marked_paid",
      entityType: "invoice_request",
      entityId: requestId,
      metadata: { paymentReference },
    });
    // Notify influencer about payment
    const infPaid = store.state.influencers.find((i) => i.influencerId === request.influencerId);
    if (infPaid) {
      store.state.notifications.push({
        id: uid("ntf"),
        userId: infPaid.userId,
        channel: "in_app",
        type: "invoice_paid",
        title: "Payment Processed",
        body: `₹${request.amountInr.toLocaleString("en-IN")} for invoice ${requestId} has been credited. Reference: ${paymentReference}.`,
        readAt: null,
        createdAt: nowIso(),
        relatedEntityType: "invoice_request",
        relatedEntityId: requestId,
      });
    }
    return request;
  },
};
