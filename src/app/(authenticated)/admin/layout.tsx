"use client";

import React from "react";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Activity,
  Bell,
  Settings,
} from "lucide-react";
import { AppShell, type NavItem } from "@/components/layout/app-shell";

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Influencer Details", href: "/admin/influencers", icon: UserCheck },
  { label: "Audit Log", href: "/admin/audit", icon: Activity },
  { label: "Notifications", href: "/admin/notifications", icon: Bell },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell navItems={NAV_ITEMS} role="admin">
      {children}
    </AppShell>
  );
}
