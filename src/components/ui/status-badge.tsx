"use client";

import * as React from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  CircleDot,
  PauseCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { InvoiceRequestStatus } from "@/lib/types";

interface StatusConfig {
  label: string;
  icon: React.ElementType;
  className: string;
}

/** Internal labels — used by BM, FM, Admin portals */
const STATUS_MAP: Record<InvoiceRequestStatus, StatusConfig> = {
  pending_bm_approval: {
    label: "Pending BM Approval",
    icon: Clock,
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  pending_finance_approval: {
    label: "Pending Finance Approval",
    icon: CircleDot,
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  on_hold_bm: {
    label: "On Hold (BM)",
    icon: PauseCircle,
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  on_hold_finance: {
    label: "On Hold (Finance)",
    icon: PauseCircle,
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  approved_payment_pending: {
    label: "Approved – Payment Pending",
    icon: CreditCard,
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
  paid: {
    label: "Paid",
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

/** Influencer-friendly labels — no BM/FM/Business/Finance terminology */
const INFLUENCER_STATUS_MAP: Record<InvoiceRequestStatus, StatusConfig> = {
  pending_bm_approval: {
    label: "Approval Pending",
    icon: Clock,
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  pending_finance_approval: {
    label: "Approval Pending",
    icon: Clock,
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  on_hold_bm: {
    label: "Under Review",
    icon: Clock,
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  on_hold_finance: {
    label: "Under Review",
    icon: Clock,
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  approved_payment_pending: {
    label: "Approved – Payment Pending",
    icon: CreditCard,
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
  paid: {
    label: "Paid",
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

export interface StatusBadgeProps {
  status: InvoiceRequestStatus;
  /** Use "influencer" to show generic labels without BM/FM terminology */
  variant?: "internal" | "influencer";
  className?: string;
}

export function StatusBadge({
  status,
  variant = "internal",
  className,
}: StatusBadgeProps) {
  const map = variant === "influencer" ? INFLUENCER_STATUS_MAP : STATUS_MAP;
  const config = map[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        config.className,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {config.label}
    </span>
  );
}
