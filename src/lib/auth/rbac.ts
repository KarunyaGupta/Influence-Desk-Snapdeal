import type { UserRole } from "@/lib/types";

export const ROLE_HOME: Record<UserRole, string> = {
  influencer: "/influencer",
  business_manager: "/business",
  finance_manager: "/finance",
  admin: "/admin",
};

const ROLE_PREFIX: Record<UserRole, string> = {
  influencer: "/influencer",
  business_manager: "/business",
  finance_manager: "/finance",
  admin: "/admin",
};

export const PUBLIC_PATHS = ["/login", "/onboarding"];

export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  );
}

export function roleForPath(pathname: string): UserRole | null {
  for (const [role, prefix] of Object.entries(ROLE_PREFIX) as [UserRole, string][]) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return role;
  }
  return null;
}

export function canAccessPath(role: UserRole, pathname: string): boolean {
  if (isPublicPath(pathname)) return true;
  const required = roleForPath(pathname);
  if (!required) return true;
  return required === role;
}

export interface SessionCookiePayload {
  userId: string;
  role: UserRole;
  expiresAt: string;
}

export function encodeSessionCookie(payload: SessionCookiePayload): string {
  return encodeURIComponent(JSON.stringify(payload));
}

export function decodeSessionCookie(value: string | undefined): SessionCookiePayload | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as SessionCookiePayload;
    if (!parsed.userId || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}
