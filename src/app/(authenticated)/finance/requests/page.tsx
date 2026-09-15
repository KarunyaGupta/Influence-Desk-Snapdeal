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
import { getDaysUntilDue, formatDueStatus, getDueStatusColor } from "@/lib/utils/due-date";
import { checkPaymentDueNotifications } from "@/lib/utils/payment-due-notifications";
import type { Influencer, InvoiceRequest } from "@/lib/types";

type TabKey = "all" | "review" | "payment_pending" | "paid";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "review", label: "Needs Review" },
  { key: "payment_pending", label: "Payment Pending" },
  { key: "paid", label: "Paid" },
];

const INFLUENCER_NAMES: Record<string, string> = {
  SIF1000001: "Aisha Khan",
  SIF1000002: "Vikram Rao",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getBmApprovalDate(req: InvoiceRequest): string {
  const bmStep = req.approvalSteps.find((s) => s.actorRole === "business_manager" && s.action === "approve");
  return bmStep ? formatDate(bmStep.createdAt) : "—";
}

export default function FinanceRequestsPage() {
  const router = useRouter();
  const { invoices, kyc } = useServices();
  const [requests, setRequests] = useState<InvoiceRequest[]>([]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [invList, infList] = await Promise.all([
          invoices.listForCurrentUser(),
          kyc.listActiveInfluencers(),
        ]);
        setRequests(invList);
        setInfluencers(infList);
        // Trigger 7-day payment due notifications (prototype: computed on page load)
        checkPaymentDueNotifications(invList, infList);
      } catch { /* fallback */ }
      setLoading(false);
    }
    load();
  }, [invoices, kyc]);

  const infMap = useMemo(() => {
    const map = new Map<string, Influencer>();
    for (const i of influencers) map.set(i.influencerId, i);
    return map;
  }, [influencers]);

  const tabCounts = useMemo(() => ({
    all: requests.length,
    review: requests.filter((r) => r.status === "pending_finance_approval").length,
    payment_pending: requests.filter((r) => r.status === "approved_payment_pending").length,
    paid: requests.filter((r) => r.status === "paid").length,
  }), [requests]);

  const filtered = useMemo(() => {
    let list = requests;
    if (activeTab === "review") list = list.filter((r) => r.status === "pending_finance_approval");
    else if (activeTab === "payment_pending") list = list.filter((r) => r.status === "approved_payment_pending");
    else if (activeTab === "paid") list = list.filter((r) => r.status === "paid");
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
  }, [requests, activeTab, search]);

  function DueBadge({ invoice }: { invoice: InvoiceRequest }) {
    if (invoice.status !== "approved_payment_pending") return null;
    const inf = infMap.get(invoice.influencerId);
    const days = getDaysUntilDue(invoice, inf);
    if (days === null) return null;
    return (
      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${getDueStatusColor(days)}`}>
        {formatDueStatus(days)}
      </span>
    );
  }

  const columns: ColumnDef<InvoiceRequest>[] = [
    { key: "requestId", header: "Request ID", render: (row) => <span className="font-mono text-xs">{row.requestId}</span> },
    {
      key: "influencer", header: "Influencer",
      render: (row) => (
        <div>
          <p className="text-sm font-medium">{INFLUENCER_NAMES[row.influencerId] ?? row.influencerId}</p>
          <p className="text-[11px] text-muted-foreground">{row.influencerId}</p>
        </div>
      ),
    },
    { key: "amountInr", header: "Amount", render: (row) => <span className="text-sm font-medium">{formatCurrency(row.amountInr)}</span> },
    { key: "bmApproval", header: "BM Approved", render: (row) => <span className="text-sm text-muted-foreground">{getBmApprovalDate(row)}</span> },
    {
      key: "due", header: "Due",
      render: (row) => <DueBadge invoice={row} />,
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
  ];

  function handleExportFm() {
    const rows = filtered.map((r) => {
      const inf = infMap.get(r.influencerId);
      const days = getDaysUntilDue(r, inf);
      return {
        "Request ID": r.requestId,
        "Influencer": INFLUENCER_NAMES[r.influencerId] ?? r.influencerId,
        "Influencer ID": r.influencerId,
        "YouTube Links": r.youtubeVideoLinks.join(", "),
        "Last Video Upload": r.lastVideoUploadDate,
        "Amount": r.amountInr,
        "Invoice #": r.invoiceNumber,
        "BM Approved": getBmApprovalDate(r),
        "Due Status": r.status === "approved_payment_pending" && days !== null ? formatDueStatus(days) : "",
        "Status": r.status.replace(/_/g, " "),
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Requests");
    XLSX.writeFile(wb, `fm-approval-queue-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-xl font-semibold">Approval Queue</h1>
        <Button size="sm" variant="outline" onClick={handleExportFm} disabled={filtered.length === 0}>
          <Download className="h-4 w-4" /> Export to Excel
        </Button>
      </div>

      <div className="flex border-b border-border">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`relative min-h-[44px] px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.key ? "text-primary after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {tab.label}
            {tabCounts[tab.key] > 0 && <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-semibold">{tabCounts[tab.key]}</span>}
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by ID, influencer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CheckCircle2} heading={activeTab === "review" ? "No requests pending review" : activeTab === "payment_pending" ? "No payments pending" : "No records"} description="Check back later or adjust your search." />
      ) : (
        <DataTable columns={columns} data={filtered} rowKey={(row) => row.requestId} onRowClick={(row) => router.push(`/finance/requests/${row.requestId}`)} />
      )}
    </div>
  );
}
