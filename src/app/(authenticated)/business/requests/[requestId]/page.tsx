"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Alert } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { SkeletonDetailPanel } from "@/components/ui/skeleton";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Dialog, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useServices } from "@/components/providers";
import { RejectModal } from "./reject-modal";
import type { InvoiceRequest, KycRecord } from "@/lib/types";

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

function DetailContent() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.requestId as string;
  const { invoices, kyc: kycService } = useServices();
  const { toast } = useToast();

  const [request, setRequest] = useState<InvoiceRequest | null>(null);
  const [kycData, setKycData] = useState<KycRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approving, setApproving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
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
          const kyc = await kycService.getByInfluencerId(inv.influencerId);
          setKycData(kyc);
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
        title: "Request approved and sent to Finance",
        description: `${request.requestId} is now pending finance review.`,
        variant: "success",
      });
    } catch (err: unknown) {
      toast({
        title: "Approval failed",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "error",
      });
    } finally {
      setApproving(false);
    }
  }

  async function handleReject(reason: string) {
    if (!request) return;
    try {
      const updated = await invoices.reject(request.requestId, reason);
      setRequest(updated);
      setRejectOpen(false);
      toast({ title: "Request rejected", description: "The influencer will be notified to make changes.", variant: "warning" });
    } catch (err: unknown) {
      toast({ title: "Rejection failed", description: err instanceof Error ? err.message : "Something went wrong.", variant: "error" });
    }
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

  const canAct = request.status === "pending_bm_approval" || request.status === "on_hold_bm";
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

      {/* Details */}
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
          </div>

          <Separator />

          {/* Document */}
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

      {/* Actions */}
      {canAct && (
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

      {request.status === "on_hold_bm" && request.holdComment && (
        <Alert variant="warning" title="On Hold">{request.holdComment}</Alert>
      )}

      {/* Already acted */}
      {request.status === "rejected" && request.rejectionComment && (
        <Alert variant="warning" title="Rejected">
          {request.rejectionComment}
        </Alert>
      )}

      {/* Reject modal */}
      <RejectModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={handleReject}
      />

      {/* Hold modal */}
      <Dialog open={holdOpen} onClose={() => { setHoldOpen(false); setHoldReason(""); setHoldError(""); }}>
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
          <div className="flex-1"><DialogTitle>Place on hold?</DialogTitle><DialogDescription>The request will remain in your queue for later review.</DialogDescription></div>
        </div>
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="bm-inv-hold" className="text-sm font-medium">Reason for hold</label>
            <span className="text-xs text-muted-foreground">{holdReason.length}/500</span>
          </div>
          <Textarea id="bm-inv-hold" placeholder="e.g. Waiting for additional information from the influencer." value={holdReason} onChange={(e) => { setHoldReason(e.target.value.slice(0, 500)); if (holdError) setHoldError(""); }} error={holdError || undefined} rows={3} maxLength={500} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setHoldOpen(false); setHoldReason(""); setHoldError(""); }} disabled={holding}>Cancel</Button>
          <Button className="border-amber-300 bg-amber-500 text-white hover:bg-amber-600" onClick={handleHold} disabled={holding}>{holding ? "Placing on hold..." : "Place on Hold"}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

export default function BusinessRequestDetailPage() {
  return (
    <ToastProvider>
      <DetailContent />
    </ToastProvider>
  );
}
