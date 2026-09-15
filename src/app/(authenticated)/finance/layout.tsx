"use client";

import React from "react";
import { ClipboardList, UserCheck, CreditCard, Users, Bell } from "lucide-react";
import { AppShell, type NavItem } from "@/components/layout/app-shell";

const NAV_ITEMS: NavItem[] = [
  { label: "Approval Queue", href: "/finance/requests", icon: ClipboardList },
  { label: "Onboarding Requests", href: "/finance/onboarding", icon: UserCheck },
  { label: "Influencer Details", href: "/finance/influencers", icon: Users },
  { label: "Payment Pending", href: "/finance/payments", icon: CreditCard },
  { label: "Notifications", href: "/finance/notifications", icon: Bell },
];

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return <AppShell navItems={NAV_ITEMS} role="finance_manager">{children}</AppShell>;
}
