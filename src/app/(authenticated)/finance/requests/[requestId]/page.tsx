"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Alert } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { SkeletonDetailPanel } from "@/components/ui/skeleton";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { useServices } from "@/components/providers";
import { MarkPaidModal } from "./mark-paid-modal";
import { getDaysUntilDue, formatDueStatus, getDueStatusColor, getPaymentDueDate } from "@/lib/utils/due-date";
import type { InvoiceRequest, KycRecord, Influencer } from "@/lib/types";

// Reuse reject modal from BM — same pattern
import { Dialog, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const ACTOR_NAMES: Record<string, string> = {
  usr_bm_priya: "Priya Sharma",
  usr_bm_rahul: "Rahul Sharma",
  usr_fm: "Ananya Gupta",
  usr_admin: "Ops Admin",
};

const INFLUENCER_NAMES: Record<string, string> = {
  SIF1000001: "Aisha Khan",
  SIF1000002: "Vikram Rao",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function VerificationBadge({ status }: { status: string | undefined }) {
  if (status === "valid")
    return <Badge variant="success" className="text-[10px]"><CheckCircle2 className="h-3 w-3" /> Verified</Badge>;
  if (status === "inoperative")
    return <Badge variant="warning" className="text-[10px]"><AlertTriangle className="h-3 w-3" /> Inoperative</Badge>;
  if (status === "invalid")
    return <Badge variant="destructive" className="text-[10px]"><XCircle className="h-3 w-3" /> Invalid</Badge>;
  return <Badge variant="outline" className="text-[10px]">Pending</Badge>;
}

/* ─── Reject Modal (inline, same pattern as BM) ──────────────────────────── */

function RejectModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [duplicateInvoice, setDuplicateInvoice] = useState(false);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [alreadyPaidUtr, setAlreadyPaidUtr] = useState("");
  const [others, setOthers] = useState(false);
  const [othersText, setOthersText] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function resetState() {
    setDuplicateInvoice(false);
    setAlreadyPaid(false);
    setAlreadyPaidUtr("");
    setOthers(false);
    setOthersText("");
    setError("");
  }

  function buildComment(): string {
    const parts: string[] = [];
    if (duplicateInvoice) parts.push("Duplicate Invoice");
    if (alreadyPaid) parts.push(`Already Paid (UTR: ${alreadyPaidUtr.trim()})`);
    if (others) parts.push(othersText.trim());
    return parts.join("; ");
  }

  async function handleSubmit() {
    if (!duplicateInvoice && !alreadyPaid && !others) {
      setError("Select at least one reason.");
      return;
    }
    if (alreadyPaid && !alreadyPaidUtr.trim()) {
      setError("UTR / payment details required for 'Already Paid'.");
      return;
    }
    if (others && !othersText.trim()) {
      setError("Please describe the reason under 'Others'.");
      return;
    }
    if (others && othersText.length > 500) {
      setError("'Others' reason must be 500 characters or less.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await onConfirm(buildComment());
      resetState();
    } catch {
      setError("Failed to reject. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={() => { resetState(); onClose(); }}>
      <div className="flex gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="flex-1">
          <DialogTitle>Reject this request?</DialogTitle>
          <DialogDescription>Select one or more reasons. The influencer will be notified.</DialogDescription>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {/* Duplicate Invoice */}
        <label className="flex min-h-[44px] items-center gap-3 rounded-md border border-input p-3 cursor-pointer hover:bg-accent/50">
          <input type="checkbox" checked={duplicateInvoice} onChange={(e) => { setDuplicateInvoice(e.target.checked); if (error) setError(""); }}
            className="h-4 w-4 rounded border-input accent-primary" />
          <span className="text-sm font-medium">Duplicate Invoice</span>
        </label>

        {/* Already Paid */}
        <div className="rounded-md border border-input p-3 space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={alreadyPaid} onChange={(e) => { setAlreadyPaid(e.target.checked); if (error) setError(""); }}
              className="h-4 w-4 rounded border-input accent-primary" />
            <span className="text-sm font-medium">Already Paid</span>
          </label>
          {alreadyPaid && (
            <div className="pl-7">
              <label htmlFor="fm-utr" className="text-xs text-muted-foreground">UTR / Payment Details <span className="text-destructive">*</span></label>
              <input id="fm-utr" type="text" placeholder="Enter UTR number or payment reference" value={alreadyPaidUtr}
                onChange={(e) => { setAlreadyPaidUtr(e.target.value); if (error) setError(""); }}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          )}
        </div>

        {/* Others */}
        <div className="rounded-md border border-input p-3 space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={others} onChange={(e) => { setOthers(e.target.checked); if (error) setError(""); }}
              className="h-4 w-4 rounded border-input accent-primary" />
            <span className="text-sm font-medium">Others</span>
          </label>
          {others && (
            <div className="pl-7">
              <div className="flex items-center justify-between">
                <label htmlFor="fm-others" className="text-xs text-muted-foreground">Reason <span className="text-destructive">*</span></label>
                <span className="text-[10px] text-muted-foreground">{othersText.length}/500</span>
              </div>
              <Textarea id="fm-others" placeholder="Describe the reason..." value={othersText}
                onChange={(e) => { setOthersText(e.target.value.slice(0, 500)); if (error) setError(""); }}
                rows={2} maxLength={500} className="mt-1" />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => { resetState(); onClose(); }} disabled={submitting}>Cancel</Button>
        <Button variant="destructive" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Rejecting..." : "Reject Request"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/* ─── Main Detail ─────────────────────────────────────────────────────────── */

function DetailContent() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.requestId as string;
  const { invoices, kyc: kycService } = useServices();
  const { toast } = useToast();

  const [request, setRequest] = useState<InvoiceRequest | null>(null);
  const [kycData, setKycData] = useState<KycRecord | null>(null);
  const [influencer, setInfluencer] = useState<Influencer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approving, setApproving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [holdError, setHoldError] = useState("");
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const inv = await invoices.getById(requestId);
        setRequest(inv);
        try {
          const [kycResult, infList] = await Promise.all([
            kycService.getByInfluencerId(inv.influencerId),
            kycService.listActiveInfluencers(),
          ]);
          setKycData(kycResult);
          setInfluencer(infList.find((i) => i.influencerId === inv.influencerId) ?? null);
        } catch { /* not critical */ }
      } catch {
        setError("Request not found.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [requestId, invoices, kycService]);

  async function handleApprove() {
    if (!request) return;
    setApproving(true);
    try {
      const updated = await invoices.approve(request.requestId);
      setRequest(updated);
      toast({
        title: "Request approved",
        description: `${request.requestId} is now Approved – Payment Pending.`,
        variant: "success",
      });
    } catch (err: unknown) {
      toast({ title: "Approval failed", description: err instanceof Error ? err.message : "Error", variant: "error" });
    } finally {
      setApproving(false);
    }
  }

  async function handleReject(reason: string) {
    if (!request) return;
    const updated = await invoices.reject(request.requestId, reason);
    setRequest(updated);
    setRejectOpen(false);
    toast({ title: "Request rejected", description: "The influencer will be notified.", variant: "warning" });
  }

  async function handleMarkPaid(paymentReference: string) {
    if (!request) return;
    const updated = await invoices.markPaid(request.requestId, paymentReference);
    setRequest(updated);
    setMarkPaidOpen(false);
    toast({ title: "Payment recorded successfully", description: `UTR: ${paymentReference}`, variant: "success" });
  }

  async function handleHold() {
    if (!request) return;
    if (!holdReason.trim()) { setHoldError("A hold reason is required."); return; }
    if (holdReason.length > 500) { setHoldError("Hold reason must be 500 characters or less."); return; }
    setHolding(true);
    try {
      const updated = await invoices.hold(request.requestId, holdReason.trim());
      setRequest(updated);
      setHoldOpen(false);
      setHoldReason("");
      toast({ title: "Request placed on hold", description: "You can resume review at any time.", variant: "warning" });
    } catch (err: unknown) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Error", variant: "error" });
    } finally { setHolding(false); }
  }

  if (loading) return <SkeletonDetailPanel />;

  if (error || !request) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error || "Request not found."}</Alert>
        <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const canApprove = request.status === "pending_finance_approval" || request.status === "on_hold_finance";
  const canMarkPaid = request.status === "approved_payment_pending";
  const influencerName = INFLUENCER_NAMES[request.influencerId] ?? request.influencerId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.back()}
          className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold">{request.requestId}</h1>
            <StatusBadge status={request.status} />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {influencerName}
          </p>
        </div>
      </div>

      {/* ─── Identity & Payout Verification ─────────────────────── */}
      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Identity &amp; Payout Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          {kycData ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* PAN — unmasked for finance */}
              <div className="space-y-2 rounded-md border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PAN</span>
                  <VerificationBadge status={kycData.pan?.verificationStatus} />
                </div>
                <p className="font-mono text-sm font-medium">
                  {kycData.pan?.panNumber ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {kycData.pan?.nameOnPan ?? "—"}
                </p>
              </div>

              {/* Bank — full account for finance */}
              <div className="space-y-2 rounded-md border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bank Account</span>
                  <VerificationBadge status={kycData.bank?.verificationStatus} />
                </div>
                <p className="font-mono text-sm font-medium">
                  {kycData.bank?.accountNumber ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {kycData.bank?.bankName ?? "—"} · {kycData.bank?.ifsc ?? "—"}
                </p>
              </div>

              {/* GST */}
              <div className="space-y-2 rounded-md border border-border bg-background p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">GST</span>
                <p className="text-sm font-medium">
                  {kycData.gst?.applicable ? kycData.gst.gstin ?? "Available" : "Not Applicable"}
                </p>
              </div>

              {/* MSME */}
              <div className="space-y-2 rounded-md border border-border bg-background p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">MSME</span>
                <p className="text-sm font-medium">
                  {kycData.msme?.applicable ? kycData.msme.registrationNumber ?? "Available" : "Not Applicable"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">KYC data not available.</p>
          )}
        </CardContent>
      </Card>

      {/* KYC Documents */}
      {kycData && (kycData.pan?.document || kycData.bank?.cancelledCheque || kycData.gst?.certificate || kycData.msme?.certificate) && (
        <Card>
          <CardHeader><CardTitle className="text-base">KYC Documents</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {kycData.pan?.document && (
                <a href={kycData.pan.document.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-input p-2 text-xs hover:bg-accent">
                  <FileText className="h-4 w-4 text-muted-foreground" /> PAN Copy — {kycData.pan.document.fileName} <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              )}
              {kycData.bank?.cancelledCheque && (
                <a href={kycData.bank.cancelledCheque.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-input p-2 text-xs hover:bg-accent">
                  <FileText className="h-4 w-4 text-muted-foreground" /> Cancelled Cheque — {kycData.bank.cancelledCheque.fileName} <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              )}
              {kycData.gst?.certificate && (
                <a href={kycData.gst.certificate.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-input p-2 text-xs hover:bg-accent">
                  <FileText className="h-4 w-4 text-muted-foreground" /> GST Certificate — {kycData.gst.certificate.fileName} <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              )}
              {kycData.msme?.certificate && (
                <a href={kycData.msme.certificate.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-input p-2 text-xs hover:bg-accent">
                  <FileText className="h-4 w-4 text-muted-foreground" /> MSME Certificate — {kycData.msme.certificate.fileName} <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Invoice Details ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Influencer</p>
              <p className="text-sm font-medium">{influencerName}</p>
              <p className="text-[11px] text-muted-foreground">{request.influencerId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">YouTube Video(s)</p>
              <div className="space-y-1">
                {request.youtubeVideoLinks.map((link, i) => (
                  <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="block text-sm font-medium text-primary hover:underline break-all">{link}</a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Video Upload</p>
              <p className="text-sm font-medium">{new Date(request.lastVideoUploadDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="text-sm font-medium">{formatCurrency(request.amountInr)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Invoice Date</p>
              <p className="text-sm font-medium">{formatDate(request.invoiceDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Invoice Number</p>
              <p className="text-sm font-medium">{request.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Submitted</p>
              <p className="text-sm font-medium">{formatDate(request.submittedAt)}</p>
            </div>
            {request.paymentReference && (
              <div>
                <p className="text-xs text-muted-foreground">UTR / Payment Date</p>
                <p className="font-mono text-sm font-medium">{request.paymentReference}</p>
              </div>
            )}
            {(() => {
              const bmStep = request.approvalSteps.find(
                (s) => s.actorRole === "business_manager" && s.action === "approve",
              );
              return bmStep ? (
                <div>
                  <p className="text-xs text-muted-foreground">BM Approved By</p>
                  <p className="text-sm font-medium">{ACTOR_NAMES[bmStep.actorUserId] ?? bmStep.actorUserId}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDate(bmStep.createdAt)}</p>
                </div>
              ) : null;
            })()}
          </div>

          <Separator />

          <div>
            <p className="mb-2 text-xs text-muted-foreground">Invoice Document</p>
            <a
              href={request.document.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-input p-3 text-sm transition-colors hover:bg-accent"
            >
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 truncate">{request.document.fileName}</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* ─── Actions ──────────────────────────────────────────────── */}
      {canApprove && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
            <Button onClick={handleApprove} disabled={approving} className="flex-1 sm:flex-none">
              <CheckCircle2 className="h-4 w-4" /> {approving ? "Approving..." : "Approve"}
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-none border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => setHoldOpen(true)}>
              <AlertTriangle className="h-4 w-4" /> Hold
            </Button>
            <Button variant="destructive" onClick={() => setRejectOpen(true)} className="flex-1 sm:flex-none">
              <XCircle className="h-4 w-4" /> Reject
            </Button>
          </CardContent>
        </Card>
      )}

      {(request.status === "on_hold_finance" || request.status === "on_hold_bm") && request.holdComment && (
        <Alert variant="warning" title="On Hold">{request.holdComment}</Alert>
      )}

      {canMarkPaid && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CreditCard className="mt-0.5 h-5 w-5 text-emerald-600" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-emerald-900">Ready for Payment</p>
                  {(() => {
                    const days = getDaysUntilDue(request, influencer ?? undefined);
                    if (days === null) return null;
                    const dueDate = getPaymentDueDate(request, influencer ?? undefined);
                    return (
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${getDueStatusColor(days)}`}>
                        {formatDueStatus(days)}
                        {dueDate && <span className="ml-1 font-normal">({dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })})</span>}
                      </span>
                    );
                  })()}
                </div>
                <p className="mt-0.5 text-xs text-emerald-800">
                  This invoice has been fully approved. Mark as paid once the
                  payment has been processed in your banking/ERP system.
                </p>
                <Button size="sm" className="mt-3" onClick={() => setMarkPaidOpen(true)}>
                  <CreditCard className="h-4 w-4" /> Mark as Paid
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {request.status === "rejected" && request.rejectionComment && (
        <Alert variant="warning" title="Rejected">
          {request.rejectionComment}
        </Alert>
      )}

      {/* Modals */}
      <RejectModal open={rejectOpen} onClose={() => setRejectOpen(false)} onConfirm={handleReject} />
      <MarkPaidModal open={markPaidOpen} onClose={() => setMarkPaidOpen(false)} onConfirm={handleMarkPaid} />

      {/* Hold modal */}
      <Dialog open={holdOpen} onClose={() => { setHoldOpen(false); setHoldReason(""); setHoldError(""); }}>
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
          <div className="flex-1"><DialogTitle>Place on hold?</DialogTitle><DialogDescription>The request will remain in your queue for later review.</DialogDescription></div>
        </div>
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="fm-inv-hold" className="text-sm font-medium">Reason for hold</label>
            <span className="text-xs text-muted-foreground">{holdReason.length}/500</span>
          </div>
          <Textarea id="fm-inv-hold" placeholder="e.g. Awaiting bank verification." value={holdReason} onChange={(e) => { setHoldReason(e.target.value.slice(0, 500)); if (holdError) setHoldError(""); }} error={holdError || undefined} rows={3} maxLength={500} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setHoldOpen(false); setHoldReason(""); setHoldError(""); }} disabled={holding}>Cancel</Button>
          <Button className="border-amber-300 bg-amber-500 text-white hover:bg-amber-600" onClick={handleHold} disabled={holding}>{holding ? "Placing on hold..." : "Place on Hold"}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

export default function FinanceRequestDetailPage() {
  return (
    <ToastProvider>
      <DetailContent />
    </ToastProvider>
  );
}
