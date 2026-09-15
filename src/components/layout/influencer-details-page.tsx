"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search, Download, ArrowRightLeft } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { useServices, useSession } from "@/components/providers";
import type { Influencer, OnboardingRequest, User } from "@/lib/types";

const ACTOR_NAMES: Record<string, string> = {
  usr_bm_priya: "Priya Sharma",
  usr_bm_rahul: "Rahul Sharma",
  usr_fm: "Ananya Gupta",
  usr_admin: "Ops Admin",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function boolLabel(v: boolean | null | undefined): string {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "";
}

interface InfluencerRow {
  inf: Influencer;
  req: OnboardingRequest | null;
}

function InfluencerDetailsContent() {
  const { kyc, onboarding, admin } = useServices();
  const { session } = useSession();
  const { toast } = useToast();
  const isAdmin = session?.user.role === "admin";

  const [rows, setRows] = useState<InfluencerRow[]>([]);
  const [bmUsers, setBmUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [gstFilter, setGstFilter] = useState<"all" | "yes" | "no">("all");
  const [msmeFilter, setMsmeFilter] = useState<"all" | "yes" | "no">("all");
  const [stateFilter, setStateFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Reassign modal state
  const [reassignTarget, setReassignTarget] = useState<InfluencerRow | null>(null);
  const [reassignManagerId, setReassignManagerId] = useState("");
  const [reassigning, setReassigning] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [influencers, requests, users] = await Promise.all([
          kyc.listActiveInfluencers(),
          onboarding.listOnboardingRequests({ status: "approved" }),
          isAdmin ? admin.listUsers() : Promise.resolve([]),
        ]);
        const reqByUser = new Map<string, OnboardingRequest>();
        for (const r of requests) {
          if (r.status === "approved" && r.generatedInfluencerId) {
            reqByUser.set(r.userId, r);
          }
        }
        setRows(influencers.map((inf) => ({ inf, req: reqByUser.get(inf.userId) ?? null })));
        setBmUsers(users.filter((u) => u.role === "business_manager" && u.status === "active"));
      } catch { /* fallback */ }
      setLoading(false);
    }
    load();
  }, [kyc, onboarding, admin, isAdmin]);

  // Build BM name lookup from loaded users or fallback to ACTOR_NAMES
  const bmNameMap = useMemo(() => {
    const map: Record<string, string> = { ...ACTOR_NAMES };
    for (const u of bmUsers) map[u.id] = u.displayName;
    return map;
  }, [bmUsers]);

  const stateOptions = useMemo(() => {
    const states = new Set(rows.map((r) => r.inf.kyc.address?.state).filter(Boolean) as string[]);
    return [{ value: "", label: "All States" }, ...Array.from(states).sort().map((s) => ({ value: s, label: s }))];
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.inf.displayName.toLowerCase().includes(q) ||
        r.inf.mobile.includes(q) ||
        r.inf.influencerId.toLowerCase().includes(q),
      );
    }
    if (gstFilter === "yes") list = list.filter((r) => r.inf.kyc.gst?.applicable);
    if (gstFilter === "no") list = list.filter((r) => !r.inf.kyc.gst?.applicable);
    if (msmeFilter === "yes") list = list.filter((r) => r.inf.kyc.msme?.applicable);
    if (msmeFilter === "no") list = list.filter((r) => !r.inf.kyc.msme?.applicable);
    if (stateFilter) list = list.filter((r) => r.inf.kyc.address?.state === stateFilter);
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      list = list.filter((r) => {
        const d = r.req?.financeReviewedAt ?? r.inf.createdAt;
        return new Date(d).getTime() >= from;
      });
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000;
      list = list.filter((r) => {
        const d = r.req?.financeReviewedAt ?? r.inf.createdAt;
        return new Date(d).getTime() < to;
      });
    }
    return list;
  }, [rows, search, gstFilter, msmeFilter, stateFilter, dateFrom, dateTo]);

  function handleExport() {
    const exportRows = filtered.map((r) => {
      const i = r.inf;
      const req = r.req;
      const d = req?.draftData;
      const fp = req?.financePaymentDetails;

      return {
        "Name": i.displayName,
        "Influencer ID": i.influencerId,
        "Mobile": i.mobile,
        "Email": i.email,
        "Onboarding Date": req?.financeReviewedAt ? formatDate(req.financeReviewedAt) : formatDate(i.createdAt),
        "Influencer Manager": i.assignedManagerUserId ? (bmNameMap[i.assignedManagerUserId] ?? i.assignedManagerUserId) : "",
        "PAN Number": i.kyc.pan?.panNumber ?? "",
        "Name as on PAN": i.kyc.pan?.nameOnPan ?? "",
        "PAN Verification Status": i.kyc.pan?.verificationStatus ?? "",
        "Account Holder Name": d?.displayName ?? i.displayName,
        "Account Number": i.kyc.bank?.accountNumber ?? "",
        "IFSC Code": i.kyc.bank?.ifsc ?? "",
        "Bank Name": i.kyc.bank?.bankName ?? "",
        "Bank Verification Status": i.kyc.bank?.verificationStatus ?? "",
        "Address Line 1": i.kyc.address?.line1 ?? "",
        "Address Line 2": i.kyc.address?.line2 ?? "",
        "City": i.kyc.address?.city ?? "",
        "State": i.kyc.address?.state ?? "",
        "Country": i.kyc.address?.country ?? "India",
        "PIN Code": i.kyc.address?.pincode ?? "",
        "GST Registered": boolLabel(i.kyc.gst?.applicable),
        "GSTIN": i.kyc.gst?.applicable ? (i.kyc.gst.gstin ?? "") : "",
        "GST Verification Status": i.kyc.gst?.applicable ? "Verified" : "",
        "MSME Registered": boolLabel(i.kyc.msme?.applicable),
        "MSME Registration Number": i.kyc.msme?.applicable ? (i.kyc.msme.registrationNumber ?? "") : "",
        "MSME Verification Status": i.kyc.msme?.applicable ? "Verified" : "",
        "YouTube": d?.socialDetails?.youtubeUrl ?? "",
        "Instagram": d?.socialDetails?.instagramUrl ?? "",
        "Content Language": d?.socialDetails?.contentLanguage ?? "",
        "Supplier Type": fp?.supplierType ?? "",
        "Mode of Payment": fp?.modeOfPayment ?? "",
        "Payment Terms": i.paymentTerms ? i.paymentTerms.replace(/_/g, " ") : "",
        "Vendor TDS Type": fp?.vendorTdsType ? fp.vendorTdsType.replace(/_/g, " ") : "",
        "Currency": d?.currency ?? "INR",
        "Onboarding Request Status": req?.status ?? "Approved",
        "BM Approved By": req?.bmReviewerUserId ? (bmNameMap[req.bmReviewerUserId] ?? req.bmReviewerUserId) : "",
        "FM Approved By": req?.financeReviewerUserId ? (ACTOR_NAMES[req.financeReviewerUserId] ?? req.financeReviewerUserId) : "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Influencers");
    XLSX.writeFile(wb, `influencer-details-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function openReassign(row: InfluencerRow) {
    setReassignTarget(row);
    setReassignManagerId(row.inf.assignedManagerUserId ?? "");
  }

  async function handleReassign() {
    if (!reassignTarget || !reassignManagerId) return;
    setReassigning(true);
    try {
      const updated = await kyc.reassignManager(reassignTarget.inf.influencerId, reassignManagerId);
      // Update local state
      setRows((prev) =>
        prev.map((r) =>
          r.inf.influencerId === updated.influencerId ? { ...r, inf: updated } : r,
        ),
      );
      setReassignTarget(null);
      toast({
        title: "Manager reassigned",
        description: `${updated.displayName} is now managed by ${bmNameMap[reassignManagerId] ?? reassignManagerId}.`,
        variant: "success",
      });
    } catch (err: unknown) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Error", variant: "error" });
    } finally { setReassigning(false); }
  }

  const columns: ColumnDef<InfluencerRow>[] = [
    { key: "name", header: "Name", render: (r) => <span className="text-sm font-medium">{r.inf.displayName}</span> },
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs">{r.inf.influencerId}</span> },
    { key: "mobile", header: "Mobile", render: (r) => <span className="text-sm">+91 {r.inf.mobile}</span> },
    {
      key: "manager",
      header: "Manager",
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{r.inf.assignedManagerUserId ? (bmNameMap[r.inf.assignedManagerUserId] ?? r.inf.assignedManagerUserId) : "—"}</span>
          {isAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); openReassign(r); }}
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Reassign manager"
              title="Reassign manager"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
    },
    { key: "pan", header: "PAN", render: (r) => <span className="font-mono text-xs">{r.inf.kyc.pan?.panNumber ?? "—"}</span> },
    { key: "account", header: "Account", render: (r) => <span className="font-mono text-xs">{r.inf.kyc.bank?.accountNumber ?? "—"}</span> },
    { key: "ifsc", header: "IFSC", render: (r) => <span className="text-xs">{r.inf.kyc.bank?.ifsc ?? "—"}</span> },
    { key: "bank", header: "Bank", render: (r) => <span className="text-xs">{r.inf.kyc.bank?.bankName ?? "—"}</span>, hideOnMobile: true },
    { key: "gst", header: "GST", render: (r) => <span className="text-xs">{r.inf.kyc.gst?.applicable ? r.inf.kyc.gst.gstin ?? "Yes" : "No"}</span>, hideOnMobile: true },
    { key: "msme", header: "MSME", render: (r) => <span className="text-xs">{r.inf.kyc.msme?.applicable ? "Yes" : "No"}</span>, hideOnMobile: true },
    { key: "onboarded", header: "Onboarded", render: (r) => <span className="text-xs text-muted-foreground">{formatDate(r.req?.financeReviewedAt ?? r.inf.createdAt)}</span> },
  ];

  const bmManagerOptions = bmUsers.map((u) => ({ value: u.id, label: u.displayName }));

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Influencer Details</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {filtered.length} influencer{filtered.length !== 1 ? "s" : ""}{filtered.length !== rows.length ? ` (filtered from ${rows.length})` : ""}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
          <Download className="h-4 w-4" /> Export to Excel
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name, mobile, ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="sm:w-36">
          <Select id="gst-filter" options={[{ value: "all", label: "GST: All" }, { value: "yes", label: "GST: Yes" }, { value: "no", label: "GST: No" }]}
            value={gstFilter} onChange={(v) => setGstFilter(v as "all" | "yes" | "no")} />
        </div>
        <div className="sm:w-36">
          <Select id="msme-filter" options={[{ value: "all", label: "MSME: All" }, { value: "yes", label: "MSME: Yes" }, { value: "no", label: "MSME: No" }]}
            value={msmeFilter} onChange={(v) => setMsmeFilter(v as "all" | "yes" | "no")} />
        </div>
        <div className="sm:w-44">
          <Select id="state-filter" options={stateOptions} value={stateFilter} onChange={setStateFilter} />
        </div>
        <div className="flex items-end gap-2 sm:w-auto">
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground">From</p>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground">To</p>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} heading="No influencers found" description="Try adjusting your filters or search." />
      ) : (
        <DataTable columns={columns} data={filtered} rowKey={(r) => r.inf.influencerId} />
      )}

      {/* Admin reassign modal */}
      {reassignTarget && (
        <Dialog open={Boolean(reassignTarget)} onClose={() => setReassignTarget(null)}>
          <DialogTitle>Reassign Influencer Manager</DialogTitle>
          <DialogDescription>
            Change the assigned manager for <strong>{reassignTarget.inf.displayName}</strong> ({reassignTarget.inf.influencerId}).
          </DialogDescription>
          <div className="mt-4 space-y-1.5">
            <label htmlFor="reassign-manager" className="text-sm font-medium">New Influencer Manager</label>
            <Select
              id="reassign-manager"
              options={bmManagerOptions}
              value={reassignManagerId}
              onChange={setReassignManagerId}
              placeholder="Select a Business Manager"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignTarget(null)} disabled={reassigning}>Cancel</Button>
            <Button onClick={handleReassign} disabled={reassigning || !reassignManagerId}>
              {reassigning ? "Reassigning..." : "Confirm Reassignment"}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}

export function InfluencerDetailsPage() {
  return <ToastProvider><InfluencerDetailsContent /></ToastProvider>;
}
