export type UserRole =
  | "influencer"
  | "business_manager"
  | "finance_manager"
  | "admin";

export type UserStatus = "active" | "locked" | "invited";

export interface User {
  id: string;
  role: UserRole;
  displayName: string;
  email: string;
  /** E.164-ish Indian mobile, 10 digits stored without prefix in prototype. */
  mobile: string;
  /**
   * TODO: SECURITY — Production must hash this with bcrypt/argon2 before persisting.
   * Stored as plain text ONLY for mock/prototype purposes.
   */
  password: string;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Session {
  user: User;
  /** ISO timestamp when the session should expire (idle timeout). */
  expiresAt: string;
}
