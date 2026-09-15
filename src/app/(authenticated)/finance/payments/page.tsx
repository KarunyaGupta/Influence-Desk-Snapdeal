"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useServices } from "@/components/providers";
import { getDaysUntilDue, formatDueStatus, getDueStatusColor } from "@/lib/utils/due-date";
import type { Influencer, InvoiceRequest } from "@/lib/types";

const INFLUENCER_NAMES: Record<string, string> = {
  SIF1000001: "Aisha Khan",
  SIF1000002: "Vikram Rao",
};

const ACTOR_NAMES: Record<string, string> = {
  usr_bm_priya: "Priya Sharma",
  usr_bm_rahul: "Rahul Sharma",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function getBmApproverName(req: InvoiceRequest): string {
  const bmStep = req.approvalSteps.find((s) => s.actorRole === "business_manager" && s.action === "approve");
  return bmStep ? ACTOR_NAMES[bmStep.actorUserId] ?? bmStep.actorUserId : "—";
}

export default function FinancePaymentsPage() {
  const router = useRouter();
  const { invoices, kyc } = useServices();
  const [requests, setRequests] = useState<InvoiceRequest[]>([]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [invList, infList] = await Promise.all([
          invoices.listForCurrentUser(),
          kyc.listActiveInfluencers(),
        ]);
        setRequests(invList.filter((r) => r.status === "approved_payment_pending"));
        setInfluencers(infList);
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

  const filtered = useMemo(() => {
    if (!search.trim()) return requests;
    const q = search.toLowerCase();
    return requests.filter((r) =>
      r.requestId.toLowerCase().includes(q) ||
      r.invoiceNumber.toLowerCase().includes(q) ||
      r.influencerId.toLowerCase().includes(q) ||
      (INFLUENCER_NAMES[r.influencerId] ?? "").toLowerCase().includes(q),
    );
  }, [requests, search]);

  function DueBadge({ invoice }: { invoice: InvoiceRequest }) {
    const inf = infMap.get(invoice.influencerId);
    const days = getDaysUntilDue(invoice, inf);
    if (days === null) return <span className="text-xs text-muted-foreground">—</span>;
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
    { key: "due", header: "Due", render: (row) => <DueBadge invoice={row} /> },
    { key: "bmApprover", header: "BM Approved By", render: (row) => <span className="text-sm text-muted-foreground">{getBmApproverName(row)}</span> },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Payment Pending</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {requests.length > 0 ? `${requests.length} invoice${requests.length > 1 ? "s" : ""} awaiting payment` : "No payments pending"}
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by ID, influencer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CreditCard} heading="No payments pending" description="All approved invoices have been paid, or none are awaiting payment." />
      ) : (
        <DataTable columns={columns} data={filtered} rowKey={(row) => row.requestId} onRowClick={(row) => router.push(`/finance/requests/${row.requestId}`)} />
      )}
    </div>
  );
}
