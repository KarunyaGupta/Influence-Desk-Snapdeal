"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useServices } from "@/components/providers";
import type { OnboardingRequest, OnboardingRequestStatus } from "@/lib/types";

const STATUS_FILTERS: { label: string; value: OnboardingRequestStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending BM", value: "pending_bm_review" },
  { label: "Pending Finance", value: "pending_finance_review" },
  { label: "On Hold", value: "on_hold_bm" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const STATUS_STYLES: Record<OnboardingRequestStatus, { label: string; variant: "default" | "warning" | "success" | "destructive" | "outline" }> = {
  pending_bm_review: { label: "Pending BM Review", variant: "warning" },
  pending_finance_review: { label: "Pending Finance Review", variant: "default" },
  on_hold_bm: { label: "On Hold (BM)", variant: "warning" },
  on_hold_finance: { label: "On Hold (Finance)", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function BmOnboardingQueuePage() {
  const router = useRouter();
  const { onboarding } = useServices();
  const [requests, setRequests] = useState<OnboardingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OnboardingRequestStatus | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    onboarding.listOnboardingRequests().then(setRequests).catch(() => {}).finally(() => setLoading(false));
  }, [onboarding]);

  const pendingCount = requests.filter((r) => r.status === "pending_bm_review").length;

  const filtered = useMemo(() => {
    let list = requests;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.draftData.displayName.toLowerCase().includes(q) ||
        r.draftData.mobile.includes(q) ||
        r.id.toLowerCase().includes(q),
      );
    }
    return list;
  }, [requests, statusFilter, search]);

  const columns: ColumnDef<OnboardingRequest>[] = [
    {
      key: "name", header: "Applicant",
      render: (row) => <span className="text-sm font-medium">{row.draftData.displayName}</span>,
    },
    {
      key: "mobile", header: "Mobile",
      render: (row) => <span className="text-sm text-muted-foreground">+91 {row.draftData.mobile}</span>,
    },
    {
      key: "submitted", header: "Submitted",
      render: (row) => <span className="text-sm text-muted-foreground">{formatDate(row.submittedAt)}</span>,
    },
    {
      key: "status", header: "Status",
      render: (row) => {
        const s = STATUS_STYLES[row.status];
        return <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>;
      },
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Onboarding Requests</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {pendingCount > 0 ? `${pendingCount} pending your review` : "Nothing needs your attention"}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${statusFilter === f.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >{f.label}</button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, mobile..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CheckCircle2} heading="You're all caught up" description="No onboarding requests match your filters." />
      ) : (
        <DataTable columns={columns} data={filtered} rowKey={(r) => r.id} onRowClick={(r) => router.push(`/business/onboarding/${r.id}`)} />
      )}
    </div>
  );
}
