import type { BankAccount, KycRecord, PanDetails } from "@/lib/types";
import type { KycService } from "@/lib/services/contracts/kyc";
import { ServiceError, withLatency } from "@/lib/mock/latency";
import { getMockStore } from "@/lib/mock/store";
import { nowIso, uid } from "@/lib/mock/types";

function redactForRole(kyc: KycRecord, role: string, isSelf: boolean): KycRecord {
  const clone = structuredClone(kyc);
  const reveal = isSelf || role === "business_manager" || role === "finance_manager" || role === "admin";
  if (reveal) return clone;
  if (clone.pan) {
    clone.pan = {
      ...clone.pan,
      panNumber: clone.pan.panNumberMasked,
    } satisfies PanDetails;
  }
  if (clone.bank) {
    clone.bank = {
      ...clone.bank,
      accountNumber: clone.bank.accountNumberMasked,
    } satisfies BankAccount;
  }
  return clone;
}

export const mockKycService: KycService = {
  async getByInfluencerId(influencerId) {
    await withLatency(null);
    const store = getMockStore();
    const user = store.requireUser();
    const influencer = store.state.influencers.find((i) => i.influencerId === influencerId);
    if (!influencer) throw new ServiceError("Influencer not found.", "NOT_FOUND", 404);
    const isSelf = influencer.userId === user.id;
    if (user.role === "influencer" && !isSelf) {
      throw new ServiceError("Forbidden.", "FORBIDDEN", 403);
    }
    return redactForRole(influencer.kyc, user.role, isSelf);
  },

  async requestEdit(input) {
    await withLatency(null);
    const store = getMockStore();
    const user = store.requireUser();
    const influencer = store.state.influencers.find((i) => i.influencerId === input.influencerId);
    if (!influencer || influencer.userId !== user.id) {
      throw new ServiceError("Forbidden.", "FORBIDDEN", 403);
    }
    const req = {
      id: uid("edt"),
      influencerId: input.influencerId,
      fieldGroup: input.fieldGroup,
      reason: input.reason,
      status: "pending" as const,
      createdAt: nowIso(),
      resolvedAt: null,
      resolvedByUserId: null,
    };
    store.state.editRequests.push(req);
    influencer.kyc.overallStatus = "edit_requested";
    store.appendAudit({
      action: "profile_edit_requested",
      entityType: "profile_edit_request",
      entityId: req.id,
      metadata: { fieldGroup: input.fieldGroup },
    });
    // Notify FM about profile edit request
    const fmUsers = store.state.users.filter((u) => u.role === "finance_manager" && u.status === "active");
    for (const fm of fmUsers) {
      store.state.notifications.push({
        id: uid("ntf"),
        userId: fm.id,
        channel: "in_app",
        type: "profile_edit_update",
        title: "Profile Edit Request",
        body: `${influencer.displayName} (${influencer.influencerId}) requested a change to their ${input.fieldGroup} details.`,
        readAt: null,
        createdAt: nowIso(),
        relatedEntityType: "influencer",
        relatedEntityId: influencer.influencerId,
      });
    }
    return req;
  },

  async listEditRequests(influencerId) {
    await withLatency(null);
    return getMockStore().state.editRequests.filter((r) => r.influencerId === influencerId);
  },

  async listActiveInfluencers() {
    await withLatency(null);
    const store = getMockStore();
    const user = store.requireUser();
    if (user.role !== "business_manager" && user.role !== "finance_manager" && user.role !== "admin") {
      throw new ServiceError("Forbidden.", "FORBIDDEN", 403);
    }
    return store.state.influencers.filter((i) => i.onboardingStatus === "active");
  },

  async reassignManager(influencerId, newManagerUserId) {
    await withLatency(null);
    const store = getMockStore();
    const user = store.requireUser();
    if (user.role !== "admin") {
      throw new ServiceError("Only admins can reassign Influencer Managers.", "FORBIDDEN", 403);
    }
    const influencer = store.state.influencers.find((i) => i.influencerId === influencerId);
    if (!influencer) throw new ServiceError("Influencer not found.", "NOT_FOUND", 404);

    const newManager = store.state.users.find(
      (u) => u.id === newManagerUserId && u.role === "business_manager" && u.status === "active",
    );
    if (!newManager) {
      throw new ServiceError("Selected manager is not an active Business Manager.", "VALIDATION", 400);
    }

    const previousManagerUserId = influencer.assignedManagerUserId;
    influencer.assignedManagerUserId = newManagerUserId;

    store.appendAudit({
      action: "influencer_manager_reassigned",
      entityType: "influencer",
      entityId: influencerId,
      metadata: {
        previousManagerUserId,
        newManagerUserId,
        previousManagerName: previousManagerUserId
          ? store.state.users.find((u) => u.id === previousManagerUserId)?.displayName ?? previousManagerUserId
          : null,
        newManagerName: newManager.displayName,
      },
    });

    return influencer;
  },
};
