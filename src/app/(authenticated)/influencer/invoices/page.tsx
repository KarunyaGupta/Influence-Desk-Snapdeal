"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useServices } from "@/components/providers";
import type { InvoiceRequest, InvoiceRequestStatus } from "@/lib/types";

const STATUS_FILTERS: { label: string; value: InvoiceRequestStatus | "all" | "pending" }[] = [
  { label: "All", value: "all" },
  { label: "Approval Pending", value: "pending" },
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

export default function InfluencerInvoicesPage() {
  const router = useRouter();
  const { invoices } = useServices();
  const [requests, setRequests] = useState<InvoiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InvoiceRequestStatus | "all" | "pending">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    invoices.listForCurrentUser().then(setRequests).catch(() => {}).finally(() => setLoading(false));
  }, [invoices]);

  const filtered = useMemo(() => {
    let list = requests;
    if (statusFilter === "pending") {
      list = list.filter((r) => r.status === "pending_bm_approval" || r.status === "pending_finance_approval");
    } else if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.requestId.toLowerCase().includes(q) ||
        r.invoiceNumber.toLowerCase().includes(q),
      );
    }
    return list;
  }, [requests, statusFilter, search]);

  const columns: ColumnDef<InvoiceRequest>[] = [
    { key: "requestId", header: "Request ID", render: (row) => <span className="font-mono text-xs">{row.requestId}</span> },
    { key: "invoiceNumber", header: "Invoice #", render: (row) => <span>{row.invoiceNumber}</span> },
    { key: "amountInr", header: "Amount", render: (row) => <span>{formatCurrency(row.amountInr)}</span> },
    { key: "submittedAt", header: "Submitted", render: (row) => <span className="text-muted-foreground">{formatDate(row.submittedAt)}</span> },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} variant="influencer" /> },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-11 w-full max-w-sm" />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">My Invoices</h1>
        <Link href="/influencer/invoices/new"><Button size="sm"><Plus className="h-4 w-4" /> Submit Invoice</Button></Link>
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
          <Input placeholder="Search by ID, invoice #..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} heading="No invoices found"
          description={statusFilter !== "all" || search ? "Try adjusting your filters or search query." : "Submit your first invoice to get started."}
          action={!search && statusFilter === "all" ? <Link href="/influencer/invoices/new"><Button size="sm"><Plus className="h-4 w-4" /> Submit Invoice</Button></Link> : undefined} />
      ) : (
        <DataTable columns={columns} data={filtered} rowKey={(row) => row.requestId} onRowClick={(row) => router.push(`/influencer/invoices/${row.requestId}`)} />
      )}
    </div>
  );
}
