import {
  ENABLE_ROLE_SWITCHER,
  MOCK_OTP_CODE,
  OTP_EXPIRY_SECONDS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
} from "@/lib/config/env";
import type { Session, User, UserRole } from "@/lib/types";
import type { AuthService, OtpChallenge } from "@/lib/services/contracts/auth";
import { ServiceError, withLatency } from "@/lib/mock/latency";
import { maskEmail, maskMobile } from "@/lib/mock/masking";
import { getMockStore } from "@/lib/mock/store";
import { nowIso, uid, type OtpRecord } from "@/lib/mock/types";

function toChallenge(record: OtpRecord): OtpChallenge {
  const { code: _code, destination: _d, userId: _u, purpose: _p, attemptCount: _a, ...rest } =
    record;
  return rest;
}

function sessionFromUser(user: User): Session {
  return {
    user,
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  };
}

function createOtp(input: {
  channel: "mobile" | "email";
  destination: string;
  userId: string | null;
  purpose: OtpRecord["purpose"];
}): OtpRecord {
  const now = Date.now();
  return {
    challengeId: uid("otp"),
    channel: input.channel,
    destination: input.destination,
    destinationMasked:
      input.channel === "mobile" ? maskMobile(input.destination) : maskEmail(input.destination),
    expiresAt: new Date(now + OTP_EXPIRY_SECONDS * 1000).toISOString(),
    resendAvailableAt: new Date(now + OTP_RESEND_COOLDOWN_SECONDS * 1000).toISOString(),
    attemptsRemaining: OTP_MAX_ATTEMPTS,
    lockedUntil: null,
    code: MOCK_OTP_CODE,
    userId: input.userId,
    purpose: input.purpose,
    attemptCount: 0,
  };
}

export const mockAuthService: AuthService = {
  async getSession() {
    await withLatency(null);
    const store = getMockStore();
    const user = store.currentUser();
    return user ? sessionFromUser(user) : null;
  },

  async checkMobileExists(mobile: string) {
    await withLatency(null);
    const store = getMockStore();
    const user = store.state.users.find((u) => u.mobile === mobile);
    if (!user) return { exists: false, isOnboarded: false };
    const influencer = store.state.influencers.find((i) => i.userId === user.id);
    return {
      exists: true,
      isOnboarded: influencer?.onboardingStatus === "active",
    };
  },

  async requestMobileOtp(mobile: string) {
    await withLatency(null);
    const store = getMockStore();
    const user = store.state.users.find((u) => u.mobile === mobile && u.status !== "locked");
    if (user?.status === "locked") {
      throw new ServiceError("Account locked after too many OTP attempts.", "OTP_LOCKED", 423);
    }
    const existing = store.state.otpChallenges.find(
      (c) => c.destination === mobile && c.channel === "mobile" && c.lockedUntil,
    );
    if (existing?.lockedUntil && new Date(existing.lockedUntil) > new Date()) {
      throw new ServiceError("Too many attempts. Try later.", "OTP_LOCKED", 423);
    }
    const record = createOtp({
      channel: "mobile",
      destination: mobile,
      userId: user?.id ?? null,
      purpose: user ? "login" : "onboarding_mobile",
    });
    store.state.otpChallenges.push(record);
    store.appendAudit({
      action: "otp_requested",
      entityType: "session",
      entityId: record.challengeId,
      metadata: { channel: "mobile" },
      actorUserId: user?.id ?? null,
    });
    return toChallenge(record);
  },

  async verifyMobileOtp(challengeId, code) {
    await withLatency(null);
    const store = getMockStore();
    const record = store.state.otpChallenges.find((c) => c.challengeId === challengeId);
    if (!record) throw new ServiceError("Invalid OTP challenge.", "OTP_NOT_FOUND", 404);
    if (new Date(record.expiresAt) < new Date()) {
      throw new ServiceError("OTP expired.", "OTP_EXPIRED", 400);
    }
    if (record.lockedUntil && new Date(record.lockedUntil) > new Date()) {
      throw new ServiceError("Too many attempts. Try later.", "OTP_LOCKED", 423);
    }
    if (code !== record.code) {
      record.attemptCount += 1;
      record.attemptsRemaining = Math.max(0, OTP_MAX_ATTEMPTS - record.attemptCount);
      store.appendAudit({
        action: "otp_failed",
        entityType: "session",
        entityId: challengeId,
      });
      if (record.attemptCount >= OTP_MAX_ATTEMPTS) {
        record.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        if (record.userId) {
          const user = store.state.users.find((u) => u.id === record.userId);
          if (user) user.status = "locked";
        }
        throw new ServiceError("Account locked after 3 failed OTP attempts.", "OTP_LOCKED", 423);
      }
      throw new ServiceError("Incorrect OTP.", "OTP_INVALID", 400);
    }

    let user = record.userId
      ? store.state.users.find((u) => u.id === record.userId)
      : undefined;
    if (!user) {
      user = {
        id: uid("usr"),
        role: "influencer",
        displayName: "New influencer",
        email: "",
        mobile: record.destination,
        password: "", // Will be set during onboarding contact step
        status: "active",
        createdAt: nowIso(),
        lastLoginAt: nowIso(),
      };
      store.state.users.push(user);
    }
    user.lastLoginAt = nowIso();
    store.setCurrentUser(user.id);
    store.appendAudit({
      action: "otp_verified",
      entityType: "session",
      entityId: challengeId,
      actorUserId: user.id,
      actorRole: user.role,
    });
    return sessionFromUser(user);
  },

  async requestEmailOtp(email: string) {
    await withLatency(null);
    const store = getMockStore();
    const user = store.currentUser();
    const record = createOtp({
      channel: "email",
      destination: email,
      userId: user?.id ?? null,
      purpose: "onboarding_email",
    });
    store.state.otpChallenges.push(record);
    store.appendAudit({
      action: "otp_requested",
      entityType: "session",
      entityId: record.challengeId,
      metadata: { channel: "email" },
    });
    return toChallenge(record);
  },

  async verifyEmailOtp(challengeId, code) {
    await withLatency(null);
    const store = getMockStore();
    const record = store.state.otpChallenges.find((c) => c.challengeId === challengeId);
    if (!record || code !== record.code) {
      throw new ServiceError("Incorrect or unknown email OTP.", "OTP_INVALID", 400);
    }
    const user = store.requireUser();
    user.email = record.destination;
    const influencer = store.state.influencers.find((i) => i.userId === user.id);
    if (influencer) {
      influencer.email = record.destination;
      influencer.emailVerified = true;
      influencer.onboardingStatus =
        influencer.onboardingStatus === "mobile_verified"
          ? "email_verified"
          : influencer.onboardingStatus;
    }
    return sessionFromUser(user);
  },

  async loginWithPassword(identifier, password) {
    await withLatency(null);
    const store = getMockStore();
    const trimmed = identifier.trim().toLowerCase();

    // Find user by mobile or email — do NOT reveal which one failed
    const user = store.state.users.find(
      (u) => u.mobile === trimmed || u.email.toLowerCase() === trimmed,
    );

    // Generic error for both "not found" and "wrong password" — standard security practice
    if (!user || !user.password || user.password !== password) {
      throw new ServiceError(
        "Incorrect mobile/email or password.",
        "AUTH_FAILED",
        401,
      );
    }

    if (user.status === "locked") {
      throw new ServiceError(
        "Your account has been locked. Please contact support.",
        "ACCOUNT_LOCKED",
        423,
      );
    }

    user.lastLoginAt = nowIso();
    store.setCurrentUser(user.id);
    store.appendAudit({
      action: "login",
      entityType: "session",
      entityId: user.id,
      actorUserId: user.id,
      actorRole: user.role,
    });
    return sessionFromUser(user);
  },

  async requestPasswordResetOtp(identifier) {
    await withLatency(null);
    const store = getMockStore();
    const trimmed = identifier.trim().toLowerCase();
    const user = store.state.users.find(
      (u) => u.mobile === trimmed || u.email.toLowerCase() === trimmed,
    );

    // Always return a challenge even if user not found — don't reveal account existence
    const destination = user?.mobile ?? trimmed;
    const channel: "mobile" | "email" = /^\d{10}$/.test(trimmed) ? "mobile" : "email";

    const record = createOtp({
      channel,
      destination,
      userId: user?.id ?? null,
      purpose: "login", // reuse login purpose for password reset
    });
    store.state.otpChallenges.push(record);
    store.appendAudit({
      action: "otp_requested",
      entityType: "session",
      entityId: record.challengeId,
      metadata: { channel, purpose: "password_reset" },
      actorUserId: user?.id ?? null,
    });
    return toChallenge(record);
  },

  async resetPassword(challengeId, code, newPassword) {
    await withLatency(null);
    const store = getMockStore();
    const record = store.state.otpChallenges.find((c) => c.challengeId === challengeId);
    if (!record) throw new ServiceError("Invalid or expired reset code.", "OTP_NOT_FOUND", 404);
    if (new Date(record.expiresAt) < new Date()) {
      throw new ServiceError("Reset code has expired. Please request a new one.", "OTP_EXPIRED", 400);
    }
    if (code !== record.code) {
      throw new ServiceError("Incorrect verification code.", "OTP_INVALID", 400);
    }
    if (!record.userId) {
      throw new ServiceError("No account found for this identifier.", "NOT_FOUND", 404);
    }
    const user = store.state.users.find((u) => u.id === record.userId);
    if (!user) throw new ServiceError("Account not found.", "NOT_FOUND", 404);

    // TODO: SECURITY — hash newPassword with bcrypt/argon2 in production
    user.password = newPassword;

    // Log out any existing session
    if (store.state.currentUserId === user.id) {
      store.setCurrentUser(null);
    }

    store.appendAudit({
      action: "user_updated",
      entityType: "user",
      entityId: user.id,
      metadata: { field: "password", reason: "password_reset" },
      actorUserId: user.id,
    });
  },

  async logout() {
    await withLatency(null);
    const store = getMockStore();
    const user = store.currentUser();
    if (user) {
      store.appendAudit({
        action: "logout",
        entityType: "session",
        entityId: user.id,
      });
    }
    store.setCurrentUser(null);
  },

  async switchDemoUser(input: { role: UserRole; userId?: string }) {
    await withLatency(null);
    if (!ENABLE_ROLE_SWITCHER) {
      throw new ServiceError("Role switcher is disabled.", "FORBIDDEN", 403);
    }
    const store = getMockStore();
    const user = input.userId
      ? store.state.users.find((u) => u.id === input.userId)
      : store.state.users.find((u) => u.role === input.role);
    if (!user) throw new ServiceError("Demo user not found.", "NOT_FOUND", 404);
    store.setCurrentUser(user.id);
    return sessionFromUser(user);
  },

  async listDemoUsers() {
    await withLatency(null);
    if (!ENABLE_ROLE_SWITCHER) return [];
    return getMockStore().state.users.filter((u) => u.status === "active");
  },
};
