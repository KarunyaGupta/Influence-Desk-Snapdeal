"use client";

import React from "react";
import { ClipboardList, UserCheck, Users, Bell } from "lucide-react";
import { AppShell, type NavItem } from "@/components/layout/app-shell";

const NAV_ITEMS: NavItem[] = [
  { label: "Approval Queue", href: "/business/requests", icon: ClipboardList },
  { label: "Onboarding Requests", href: "/business/onboarding", icon: UserCheck },
  { label: "Influencer Details", href: "/business/influencers", icon: Users },
  { label: "Notifications", href: "/business/notifications", icon: Bell },
];

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return <AppShell navItems={NAV_ITEMS} role="business_manager">{children}</AppShell>;
}
