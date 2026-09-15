"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  FileText,
  User,
  Bell,
} from "lucide-react";
import { AppShell, type NavItem } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useServices } from "@/components/providers";

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/influencer", icon: Home },
  { label: "Invoices", href: "/influencer/invoices", icon: FileText },
  { label: "Profile & KYC", href: "/influencer/profile", icon: User },
  { label: "Notifications", href: "/influencer/notifications", icon: Bell },
];

const MOBILE_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/influencer", icon: Home, mobileLabel: "Home" },
  { label: "Invoices", href: "/influencer/invoices", icon: FileText, mobileLabel: "Invoices" },
  { label: "Profile", href: "/influencer/profile", icon: User, mobileLabel: "Profile" },
  { label: "Notifications", href: "/influencer/notifications", icon: Bell, mobileLabel: "Alerts" },
];

/**
 * Influencer layout guard.
 * Only renders the dashboard shell if the influencer is fully onboarded (active).
 * Otherwise redirects to /onboarding where status screens handle pending/rejected states.
 */
export default function InfluencerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { onboarding } = useServices();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const draft = await onboarding.getCurrentDraft();
        if (cancelled) return;
        if (draft && draft.onboardingStatus === "active") {
          setReady(true);
        } else {
          router.replace("/onboarding");
        }
      } catch {
        if (!cancelled) router.replace("/onboarding");
      }
    }
    check();
    return () => { cancelled = true; };
  }, [onboarding, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen">
        <aside className="hidden w-60 flex-shrink-0 border-r border-border bg-card md:flex md:flex-col p-4 space-y-4">
          <Skeleton className="h-8 w-20" />
          <div className="space-y-2 mt-6">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </aside>
        <main className="flex-1 p-4 md:p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </main>
      </div>
    );
  }

  return (
    <AppShell navItems={NAV_ITEMS} mobileNavItems={MOBILE_NAV_ITEMS} role="influencer">
      {children}
    </AppShell>
  );
}
