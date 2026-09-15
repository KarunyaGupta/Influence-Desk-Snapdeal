"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession, useServices } from "@/components/providers";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { Separator } from "@/components/ui/separator";
import type { UserRole } from "@/lib/types";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Short label for mobile bottom nav (optional, falls back to label) */
  mobileLabel?: string;
}

interface AppShellProps {
  children: React.ReactNode;
  navItems: NavItem[];
  role: UserRole;
  /** Items shown in mobile bottom nav. If not provided, no bottom nav is shown (mobile uses hamburger/header only). */
  mobileNavItems?: NavItem[];
}

const ROLE_TITLES: Record<UserRole, string> = {
  influencer: "Influencer Portal",
  business_manager: "Business Manager",
  finance_manager: "Finance Manager",
  admin: "Admin Console",
};

/**
 * Shared authenticated shell: desktop sidebar + optional mobile bottom nav.
 * Each role's layout passes its own navItems and optionally mobileNavItems.
 */
export function AppShell({
  children,
  navItems,
  role,
  mobileNavItems,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useSession();
  const { auth } = useServices();

  const initials = session?.user.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleLogout() {
    await auth.logout();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen">
      {/* ─── Desktop Sidebar ──────────────────────────────────── */}
      <aside className="hidden w-60 flex-shrink-0 border-r border-sidebar-border bg-sidebar-background md:flex md:flex-col">
        {/* Logo */}
        <div className="flex h-14 items-center px-4">
          <Logo size="sm" />
          <Separator orientation="vertical" className="mx-2 h-5" />
          <span className="text-xs text-muted-foreground">
            {ROLE_TITLES[role]}
          </span>
        </div>
        <Separator />

        {/* Nav links */}
        <nav className="flex-1 space-y-1 px-2 py-3" aria-label="Main navigation">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Separator />

        {/* User footer */}
        <div className="flex items-center gap-2 px-4 py-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {session?.user.displayName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {session?.user.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* ─── Main Content ─────────────────────────────────────── */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center justify-between border-b px-4 md:hidden">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-xs text-muted-foreground">
              {ROLE_TITLES[role]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-[10px]">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </div>

        {/* ─── Mobile Bottom Nav (roles with explicit mobile items) ── */}
        {mobileNavItems && (
          <nav
            className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-background pb-safe md:hidden"
            aria-label="Mobile navigation"
          >
            {mobileNavItems.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  <span>{item.mobileLabel ?? item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* ─── Mobile Bottom Nav (fallback for roles without explicit mobile items) ── */}
        {!mobileNavItems && (
          <nav
            className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-background pb-safe md:hidden"
            aria-label="Mobile navigation"
          >
            {navItems.slice(0, 4).map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  <span className="truncate max-w-[64px]">{item.mobileLabel ?? item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </main>
    </div>
  );
}
