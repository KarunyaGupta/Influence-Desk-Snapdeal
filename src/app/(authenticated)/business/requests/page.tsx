"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useServices } from "@/components/providers";
import type { InvoiceRequest, InvoiceRequestStatus } from "@/lib/types";

const STATUS_FILTERS: { label: string; value: InvoiceRequestStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending BM", value: "pending_bm_approval" },
  { label: "Pending Finance", value: "pending_finance_approval" },
  { label: "Payment Pending", value: "approved_payment_pending" },
  { label: "Paid", value: "paid" },
  { label: "Rejected", value: "rejected" },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const INFLUENCER_NAMES: Record<string, string> = {
  SIF1000001: "Aisha Khan",
  SIF1000002: "Vikram Rao",
};

export default function BusinessRequestsPage() {
  const router = useRouter();
  const { invoices } = useServices();
  const [requests, setRequests] = useState<InvoiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InvoiceRequestStatus | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    invoices.listForCurrentUser().then(setRequests).catch(() => {}).finally(() => setLoading(false));
  }, [invoices]);

  const awaitingCount = requests.filter((r) => r.status === "pending_bm_approval").length;

  const filtered = useMemo(() => {
    let list = requests;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.requestId.toLowerCase().includes(q) ||
        r.invoiceNumber.toLowerCase().includes(q) ||
        r.influencerId.toLowerCase().includes(q) ||
        (INFLUENCER_NAMES[r.influencerId] ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [requests, statusFilter, search]);

  const columns: ColumnDef<InvoiceRequest>[] = [
    {
      key: "influencer", header: "Influencer",
      render: (row) => (
        <div>
          <p className="text-sm font-medium">{INFLUENCER_NAMES[row.influencerId] ?? row.influencerId}</p>
          <p className="text-[11px] text-muted-foreground">{row.influencerId}</p>
        </div>
      ),
    },
    { key: "invoiceNumber", header: "Invoice #", render: (row) => <span className="text-sm">{row.invoiceNumber}</span> },
    { key: "amountInr", header: "Amount", render: (row) => <span className="text-sm">{formatCurrency(row.amountInr)}</span> },
    { key: "submittedAt", header: "Submitted", render: (row) => <span className="text-sm text-muted-foreground">{formatDate(row.submittedAt)}</span> },
    { key: "requestId", header: "Request ID", render: (row) => <span className="font-mono text-xs">{row.requestId}</span> },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
  ];

  function handleExportBm() {
    const rows = filtered.map((r) => ({
      "Request ID": r.requestId,
      "Influencer": INFLUENCER_NAMES[r.influencerId] ?? r.influencerId,
      "Influencer ID": r.influencerId,
      "YouTube Links": r.youtubeVideoLinks.join(", "),
      "Last Video Upload": r.lastVideoUploadDate,
      "Amount": r.amountInr,
      "Invoice #": r.invoiceNumber,
      "Submitted": new Date(r.submittedAt).toLocaleDateString("en-IN"),
      "Status": r.status.replace(/_/g, " "),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Requests");
    XLSX.writeFile(wb, `bm-approval-queue-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-11 w-full max-w-sm" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Requests Needing Your Review</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{awaitingCount > 0 ? `${awaitingCount} awaiting review` : "No pending requests"}</p>
        </div>
        <Button size="sm" variant="outline" onClick={handleExportBm} disabled={filtered.length === 0}>
          <Download className="h-4 w-4" /> Export to Excel
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${statusFilter === f.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by ID, influencer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CheckCircle2} heading="You're all caught up" description="No requests match your current filters." />
      ) : (
        <DataTable columns={columns} data={filtered} rowKey={(row) => row.requestId} onRowClick={(row) => router.push(`/business/requests/${row.requestId}`)} />
      )}
    </div>
  );
}
