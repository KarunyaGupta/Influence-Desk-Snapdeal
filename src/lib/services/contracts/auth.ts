import type { Session, User, UserRole } from "@/lib/types";

export interface OtpChallenge {
  challengeId: string;
  channel: "mobile" | "email";
  destinationMasked: string;
  expiresAt: string;
  resendAvailableAt: string;
  attemptsRemaining: number;
  lockedUntil: string | null;
}

export interface MobileCheckResult {
  exists: boolean;
  isOnboarded: boolean;
}

export interface AuthService {
  getSession(): Promise<Session | null>;
  /** Check if a mobile number has an existing user, without triggering OTP. */
  checkMobileExists(mobile: string): Promise<MobileCheckResult>;
  requestMobileOtp(mobile: string): Promise<OtpChallenge>;
  verifyMobileOtp(challengeId: string, code: string): Promise<Session>;
  requestEmailOtp(email: string): Promise<OtpChallenge>;
  verifyEmailOtp(challengeId: string, code: string): Promise<Session>;
  /**
   * Influencer password-based login. Accepts mobile number OR email as identifier.
   * Returns session on success. Throws generic error on failure (does not reveal
   * whether the account exists — standard security practice).
   */
  loginWithPassword(identifier: string, password: string): Promise<Session>;
  /**
   * Request an OTP for password reset. Accepts mobile number OR email.
   * Returns an OTP challenge to verify identity before allowing password change.
   */
  requestPasswordResetOtp(identifier: string): Promise<OtpChallenge>;
  /**
   * Reset password after successful OTP verification.
   * Logs out any existing session and returns void — user must log in again.
   */
  resetPassword(challengeId: string, code: string, newPassword: string): Promise<void>;
  logout(): Promise<void>;
  /**
   * Dev-only. Production api/ implementation must throw.
   * Switches the current session to a seeded user of the given role (or specific userId).
   */
  switchDemoUser(input: { role: UserRole; userId?: string }): Promise<Session>;
  listDemoUsers(): Promise<User[]>;
}
