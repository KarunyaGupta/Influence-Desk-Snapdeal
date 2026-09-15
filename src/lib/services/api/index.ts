import type { AppServices } from "@/lib/services/contracts";

const notImplemented = (name: string) => async () => {
  throw new Error(
    `[api] ${name} is not implemented. Point NEXT_PUBLIC_DATA_SOURCE=api only after backend contracts are live.`,
  );
};

function stubService<T extends object>(name: string, keys: (keyof T)[]): T {
  const service = {} as T;
  for (const key of keys) {
    (service as Record<string, unknown>)[key as string] = notImplemented(`${name}.${String(key)}`);
  }
  return service;
}

export const apiServices: AppServices = {
  auth: stubService("auth", [
    "getSession",
    "checkMobileExists",
    "requestMobileOtp",
    "verifyMobileOtp",
    "requestEmailOtp",
    "verifyEmailOtp",
    "loginWithPassword",
    "requestPasswordResetOtp",
    "resetPassword",
    "logout",
    "switchDemoUser",
    "listDemoUsers",
  ]),
  onboarding: stubService("onboarding", [
    "getCurrentDraft",
    "saveDraft",
    "verifyPan",
    "validateIfsc",
    "submit",
    "getMyOnboardingRequest",
    "approveOnboardingAsBM",
    "rejectOnboardingAsBM",
    "holdOnboardingAsBM",
    "approveOnboardingAsFinance",
    "rejectOnboardingAsFinance",
    "holdOnboardingAsFinance",
    "listOnboardingRequests",
    "listAssignableManagers",
  ]),
  kyc: stubService("kyc", ["getByInfluencerId", "requestEdit", "listEditRequests", "listActiveInfluencers", "reassignManager"]),
  invoices: stubService("invoices", [
    "listForCurrentUser",
    "getById",
    "submit",
    "approve",
    "reject",
    "hold",
    "markPaid",
  ]),
  notifications: stubService("notifications", ["listForCurrentUser", "markRead"]),
  audit: stubService("audit", ["list"]),
  admin: stubService("admin", ["listUsers", "createUser", "updateUserStatus"]),
};
