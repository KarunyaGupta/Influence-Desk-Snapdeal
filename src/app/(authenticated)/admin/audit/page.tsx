"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useServices } from "@/components/providers";
import type { AuditLogEntry, AuditAction, AuditEntityType } from "@/lib/types";

const ACTOR_NAMES: Record<string, string> = {
  usr_admin: "Ops Admin",
  usr_bm_priya: "Priya Sharma",
  usr_bm_rahul: "Rahul Sharma",
  usr_fm: "Ananya Gupta",
  usr_inf_aisha: "Aisha Khan",
  usr_inf_vikram: "Vikram Rao",
};

const ACTION_LABELS: Record<AuditAction, string> = {
  login: "Login",
  logout: "Logout",
  otp_requested: "OTP Requested",
  otp_verified: "OTP Verified",
  otp_failed: "OTP Failed",
  onboarding_submitted: "Onboarding Submitted",
  onboarding_bm_approved: "Onboarding BM Approved",
  onboarding_bm_rejected: "Onboarding BM Rejected",
  onboarding_finance_approved: "Onboarding FM Approved",
  onboarding_finance_rejected: "Onboarding FM Rejected",
  onboarding_bm_held: "Onboarding BM Held",
  onboarding_finance_held: "Onboarding FM Held",
  invoice_submitted: "Invoice Submitted",
  invoice_approved: "Invoice Approved",
  invoice_rejected: "Invoice Rejected",
  invoice_held: "Invoice Held",
  invoice_marked_paid: "Invoice Marked Paid",
  profile_edit_requested: "Profile Edit Requested",
  influencer_manager_reassigned: "Manager Reassigned",
  user_created: "User Created",
  user_updated: "User Updated",
};

const ENTITY_COLORS: Record<AuditEntityType, string> = {
  user: "bg-blue-100 text-blue-800",
  influencer: "bg-purple-100 text-purple-800",
  kyc: "bg-emerald-100 text-emerald-800",
  invoice_request: "bg-red-100 text-red-800",
  profile_edit_request: "bg-pink-100 text-pink-800",
  onboarding_request: "bg-blue-100 text-blue-800",
  session: "bg-muted text-muted-foreground",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminAuditPage() {
  const { audit } = useServices();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<AuditEntityType | "all">("all");

  useEffect(() => {
    audit.list().then(setEntries).catch(() => {}).finally(() => setLoading(false));
  }, [audit]);

  const filtered = useMemo(() => {
    let list = entries;
    if (entityFilter !== "all") list = list.filter((e) => e.entityType === entityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.action.toLowerCase().includes(q) ||
          e.entityId.toLowerCase().includes(q) ||
          (ACTOR_NAMES[e.actorUserId ?? ""] ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [entries, entityFilter, search]);

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      key: "createdAt",
      header: "Timestamp",
      render: (row) => <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(row.createdAt)}</span>,
    },
    {
      key: "actor",
      header: "Actor",
      render: (row) => <span className="text-sm">{ACTOR_NAMES[row.actorUserId ?? ""] ?? row.actorRole ?? "System"}</span>,
    },
    {
      key: "action",
      header: "Action",
      render: (row) => <span className="text-sm font-medium">{ACTION_LABELS[row.action] ?? row.action}</span>,
    },
    {
      key: "entityType",
      header: "Entity",
      render: (row) => (
        <Badge variant="outline" className={`text-[10px] ${ENTITY_COLORS[row.entityType]}`}>
          {row.entityType.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "entityId",
      header: "Details",
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{row.entityId}</span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Audit Log</h1>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          {(["all", "invoice_request", "user", "influencer", "onboarding_request", "session", "profile_edit_request"] as const).map((e) => (
            <button
              key={e}
              onClick={() => setEntityFilter(e)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${entityFilter === e ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {e === "all" ? "All" : e.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search audit log..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} heading="No audit entries" description="Actions taken in the app will appear here as an audit trail." />
      ) : (
        <DataTable columns={columns} data={filtered} rowKey={(row) => row.id} />
      )}
    </div>
  );
}
