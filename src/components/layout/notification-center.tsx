"use client";

import React, { useEffect, useState } from "react";
import {
  Bell,
  CheckCircle2,
  XCircle,
  CreditCard,
  FileText,
  UserCheck,
  Inbox,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useServices } from "@/components/providers";
import type { Notification, NotificationType } from "@/lib/types";

/* ─── Category config ─────────────────────────────────────────────────────── */

type CategoryKey = "onboarding" | "invoice" | "approval" | "rejection" | "payment" | "other";

const CATEGORY_MAP: Record<NotificationType, CategoryKey> = {
  otp: "onboarding",
  welcome: "onboarding",
  invoice_submitted: "invoice",
  invoice_approved: "approval",
  invoice_rejected: "rejection",
  invoice_paid: "payment",
  payment_due_reminder: "payment",
  profile_edit_update: "other",
};

const CATEGORY_CONFIG: Record<CategoryKey, { label: string; icon: React.ElementType; className: string }> = {
  onboarding: { label: "Onboarding", icon: UserCheck, className: "bg-blue-100 text-blue-800 border-blue-200" },
  invoice: { label: "Invoice", icon: FileText, className: "bg-purple-100 text-purple-800 border-purple-200" },
  approval: { label: "Approval", icon: CheckCircle2, className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rejection: { label: "Rejection", icon: XCircle, className: "bg-red-100 text-red-800 border-red-200" },
  payment: { label: "Payment", icon: CreditCard, className: "bg-amber-100 text-amber-800 border-amber-200" },
  other: { label: "Update", icon: Bell, className: "bg-muted text-muted-foreground border-border" },
};

const CATEGORIES: { key: CategoryKey | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "onboarding", label: "Onboarding" },
  { key: "invoice", label: "Invoice" },
  { key: "approval", label: "Approval" },
  { key: "rejection", label: "Rejection" },
  { key: "payment", label: "Payment" },
];

/* ─── Component ───────────────────────────────────────────────────────────── */

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function NotificationCenter() {
  const { notifications: notifService } = useServices();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CategoryKey | "all">("all");

  useEffect(() => {
    notifService
      .listForCurrentUser()
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [notifService]);

  async function handleMarkRead(id: string) {
    await notifService.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
  }

  const filtered =
    filter === "all"
      ? notifications
      : notifications.filter((n) => CATEGORY_MAP[n.type] === filter);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Notifications</h1>
        {unreadCount > 0 && (
          <Badge variant="default" className="text-xs">
            {unreadCount} new
          </Badge>
        )}
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === cat.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          heading="All caught up"
          description="You have no notifications in this category."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const cat = CATEGORY_MAP[n.type];
            const config = CATEGORY_CONFIG[cat];
            const Icon = config.icon;
            const isUnread = !n.readAt;

            return (
              <Card
                key={n.id}
                className={isUnread ? "border-l-4 border-l-primary" : ""}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.className}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${isUnread ? "font-semibold" : "font-medium"}`}>
                        {n.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {n.body}
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] ${config.className}`}>
                        {config.label}
                      </Badge>
                      {isUnread && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] text-muted-foreground"
                          onClick={() => handleMarkRead(n.id)}
                        >
                          Mark read
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
