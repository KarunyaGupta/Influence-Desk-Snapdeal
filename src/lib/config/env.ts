export const DATA_SOURCE = (process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock") as
  | "mock"
  | "api";

export const ENABLE_ROLE_SWITCHER =
  process.env.NEXT_PUBLIC_ENABLE_ROLE_SWITCHER === "true";

export const MOCK_LATENCY_MS = Number(process.env.NEXT_PUBLIC_MOCK_LATENCY_MS ?? 350);

export const SESSION_COOKIE = "sih_session";

/** Prototype-only OTP accepted by mock AuthService. Never used in api/. */
export const MOCK_OTP_CODE = "123456";

export const OTP_MAX_ATTEMPTS = 3;
export const OTP_RESEND_COOLDOWN_SECONDS = 30;
export const OTP_EXPIRY_SECONDS = 5 * 60;
