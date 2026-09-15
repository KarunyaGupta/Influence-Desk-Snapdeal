import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/config/env";
import {
  canAccessPath,
  decodeSessionCookie,
  isPublicPath,
  ROLE_HOME,
} from "@/lib/auth/rbac";

/**
 * Edge middleware for route protection.
 *
 * In the prototype this reads the mock session cookie.
 * When a real backend is integrated, replace the cookie decode logic
 * with a proper JWT/session validation call — the structure stays identical.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes unconditionally
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Allow static files, API routes, and dev pages
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/mock-docs") ||
    pathname.startsWith("/dev") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Decode session
  const cookieValue = request.cookies.get(SESSION_COOKIE)?.value;
  const session = decodeSessionCookie(cookieValue);

  // No session → redirect to login
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Check RBAC: does this role have access to this path?
  if (!canAccessPath(session.role, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOME[session.role];
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
