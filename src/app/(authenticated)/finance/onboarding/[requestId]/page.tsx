"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, ExternalLink, CheckCircle2, XCircle, AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { SkeletonDetailPanel } from "@/components/ui/skeleton";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Dialog, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useServices } from "@/components/providers";
import type { OnboardingRequest } from "@/lib/types";

const ACTOR_NAMES: Record<string, string> = {
  usr_bm_priya: "Priya Sharma",
  usr_bm_rahul: "Rahul Sharma",
  usr_admin: "Ops Admin",
};

const STATUS_LABELS: Record<string, string> = {
  pending_bm_review: "Pending BM Review",
  pending_finance_review: "Pending Finance Review",
  on_hold_bm: "On Hold",
  on_hold_finance: "On Hold",
  approved: "Approved",
  rejected: "Rejected",
};

const VENDOR_TDS_OPTIONS = [
  { value: "individual_ind", label: "Individual - IND" },
  { value: "company_ind", label: "Company - IND" },
  { value: "huf_ind", label: "Hindu Undivided Family - IND" },
  { value: "other_ind", label: "Other Persons - IND" },
];

const MODE_OF_PAYMENT_OPTIONS = [
  { value: "RTGS", label: "RTGS" },
];

const SUPPLIER_TYPE_OPTIONS = [
  { value: "Influencer Marketing", label: "Influencer Marketing" },
];

function VerificationBadge({ status }: { status: string | undefined }) {
  if (status === "valid") return <Badge variant="success" className="text-[10px]"><CheckCircle2 className="h-3 w-3" /> Verified</Badge>;
  if (status === "inoperative") return <Badge variant="warning" className="text-[10px]"><AlertTriangle className="h-3 w-3" /> Inoperative</Badge>;
  if (status === "invalid") return <Badge variant="destructive" className="text-[10px]"><XCircle className="h-3 w-3" /> Invalid</Badge>;
  return <Badge variant="outline" className="text-[10px]">Pending</Badge>;
}

function DetailContent() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.requestId as string;
  const { onboarding } = useServices();
  const { toast } = useToast();

  const [request, setRequest] = useState<OnboardingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approving, setApproving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Hold modal state
  const [holdOpen, setHoldOpen] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [holdError, setHoldError] = useState("");
  const [holding, setHolding] = useState(false);

  // Finance-owned payment fields
  const [supplierType, setSupplierType] = useState("Influencer Marketing");
  const [modeOfPayment, setModeOfPayment] = useState("RTGS");
  const [vendorTdsType, setVendorTdsType] = useState("");

  useEffect(() => {
    onboarding.listOnboardingRequests().then((list) => {
      const found = list.find((r) => r.id === requestId);
      setRequest(found ?? null);
      if (found?.financePaymentDetails) {
        setSupplierType(found.financePaymentDetails.supplierType);
        setModeOfPayment(found.financePaymentDetails.modeOfPayment);
        setVendorTdsType(found.financePaymentDetails.vendorTdsType);
      }
      if (!found) setError("Onboarding request not found.");
    }).catch(() => setError("Failed to load.")).finally(() => setLoading(false));
  }, [requestId, onboarding]);

  const paymentComplete = Boolean(
    supplierType.trim() && modeOfPayment.trim() && vendorTdsType.trim()
  );

  async function handleApprove() {
    if (!request || !paymentComplete) return;
    setApproving(true);
    try {
      const updated = await onboarding.approveOnboardingAsFinance(request.id, {
        supplierType,
        modeOfPayment,
        vendorTdsType,
      });
      setRequest(updated);
      toast({
        title: "Influencer onboarded successfully",
        description: `${request.draftData.displayName} has been activated as ${updated.generatedInfluencerId}. Welcome notifications sent.`,
        variant: "success",
        duration: 8000,
      });
    } catch (err: unknown) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Error", variant: "error" });
    } finally { setApproving(false); }
  }

  async function handleReject() {
    if (!request) return;
    if (!rejectReason.trim()) { setRejectError("A rejection reason is required."); return; }
    setRejecting(true);
    try {
      const updated = await onboarding.rejectOnboardingAsFinance(request.id, rejectReason.trim());
      setRequest(updated);
      setRejectOpen(false);
      setRejectReason("");
      toast({ title: "Onboarding rejected", description: "The applicant will be notified.", variant: "warning" });
    } catch (err: unknown) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Error", variant: "error" });
    } finally { setRejecting(false); }
  }

  async function handleHold() {
    if (!request) return;
    if (!holdReason.trim()) { setHoldError("A hold reason is required."); return; }
    if (holdReason.length > 500) { setHoldError("Hold reason must be 500 characters or less."); return; }
    setHolding(true);
    try {
      const updated = await onboarding.holdOnboardingAsFinance(request.id, holdReason.trim());
      setRequest(updated);
      setHoldOpen(false);
      setHoldReason("");
      toast({ title: "Application placed on hold", description: "You can resume review at any time.", variant: "warning" });
    } catch (err: unknown) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Error", variant: "error" });
    } finally { setHolding(false); }
  }

  if (loading) return <SkeletonDetailPanel />;
  if (error || !request) return <div className="space-y-4"><Alert variant="error">{error}</Alert><Button variant="outline" onClick={() => router.back()}>Go Back</Button></div>;

  const d = request.draftData;
  const canAct = request.status === "pending_finance_review" || request.status === "on_hold_finance";
  const isApproved = request.status === "approved";
  const fp = request.financePaymentDetails;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <button onClick={() => router.back()} className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Go back"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold">Onboarding: {d.displayName}</h1>
            <Badge variant={request.status === "pending_finance_review" ? "default" : request.status === "approved" ? "success" : request.status === "rejected" ? "destructive" : "warning"} className="text-[10px]">
              {STATUS_LABELS[request.status]}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">+91 {d.mobile} · {d.email}</p>
          {request.generatedInfluencerId && (
            <p className="mt-0.5 text-sm font-medium text-emerald-600">ID: {request.generatedInfluencerId}</p>
          )}
        </div>
      </div>

      {/* Identity & Payout Verification — FM sees FULL unmasked KYC */}
      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Identity &amp; Payout Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* PAN — UNMASKED for Finance */}
            <div className="space-y-2 rounded-md border border-border bg-background p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PAN</span>
                <VerificationBadge status={d.pan?.verificationStatus} />
              </div>
              <p className="font-mono text-sm font-medium">{d.pan?.panNumber ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{d.pan?.nameOnPan ?? "—"}</p>
              {d.pan?.document && (
                <a href={d.pan.document.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <FileText className="h-3 w-3" /> {d.pan.document.fileName}
                </a>
              )}
            </div>

            {/* Bank — full account number for FM */}
            <div className="space-y-2 rounded-md border border-border bg-background p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bank Account</span>
                <VerificationBadge status={d.bank?.verificationStatus} />
              </div>
              <p className="font-mono text-sm font-medium">{d.bank?.accountNumber ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{d.bank?.bankName ?? "—"} · {d.bank?.ifsc ?? "—"}</p>
              {d.bank?.cancelledCheque && (
                <a href={d.bank.cancelledCheque.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <FileText className="h-3 w-3" /> {d.bank.cancelledCheque.fileName}
                </a>
              )}
            </div>

            {/* GST */}
            <div className="space-y-2 rounded-md border border-border bg-background p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">GST</span>
              <p className="text-sm font-medium">{d.gst?.applicable ? d.gst.gstin ?? "Registered" : "Not Applicable"}</p>
            </div>

            {/* MSME */}
            <div className="space-y-2 rounded-md border border-border bg-background p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">MSME</span>
              <p className="text-sm font-medium">{d.msme?.applicable ? d.msme.registrationNumber ?? "Registered" : "Not Applicable"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact + Address details */}
      <Card>
        <CardHeader><CardTitle className="text-base">Applicant Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><p className="text-xs text-muted-foreground">Name</p><p className="text-sm font-medium">{d.displayName}</p></div>
            <div><p className="text-xs text-muted-foreground">Mobile</p><p className="text-sm font-medium">+91 {d.mobile}</p></div>
            <div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm font-medium">{d.email}</p></div>
            <div><p className="text-xs text-muted-foreground">BM Approved By</p><p className="text-sm font-medium">{request.bmReviewerUserId ? ACTOR_NAMES[request.bmReviewerUserId] ?? request.bmReviewerUserId : "—"}</p><p className="text-[11px] text-muted-foreground">{request.bmReviewedAt ? new Date(request.bmReviewedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}</p></div>
          </div>
          {d.address && (
            <>
              <Separator />
              <div><p className="text-xs text-muted-foreground">Address</p><p className="text-sm">{[d.address.line1, d.address.line2, d.address.city, d.address.state, d.address.country, d.address.pincode].filter(Boolean).join(", ")}</p></div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Social Details */}
      {d.socialDetails && (
        <Card>
          <CardHeader><CardTitle className="text-base">Social Details</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">YouTube</p><p className="text-sm break-all">{d.socialDetails.youtubeUrl}</p></div>
              {d.socialDetails.instagramUrl && <div><p className="text-xs text-muted-foreground">Instagram</p><p className="text-sm break-all">{d.socialDetails.instagramUrl}</p></div>}
              <div><p className="text-xs text-muted-foreground">Content Language</p><p className="text-sm">{d.socialDetails.contentLanguage}</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Details — Finance-owned fields editable when pending, read-only after */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Details</CardTitle>
          {canAct && (
            <p className="text-xs text-muted-foreground">Complete all fields below before approving.</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Finance-owned: 4 fields — editable when canAct, read-only otherwise */}
          {canAct ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="fm-supplier-type" className="mb-1 block text-xs text-muted-foreground">Supplier Type</label>
                <Select id="fm-supplier-type" options={SUPPLIER_TYPE_OPTIONS} value={supplierType} onChange={setSupplierType} />
              </div>
              <div>
                <label htmlFor="fm-mode-payment" className="mb-1 block text-xs text-muted-foreground">Mode of Payment</label>
                <Select id="fm-mode-payment" options={MODE_OF_PAYMENT_OPTIONS} value={modeOfPayment} onChange={setModeOfPayment} />
              </div>
              <div>
                <label htmlFor="fm-vendor-tds" className="mb-1 block text-xs text-muted-foreground">Vendor TDS Type <span className="text-destructive">*</span></label>
                <Select id="fm-vendor-tds" options={VENDOR_TDS_OPTIONS} value={vendorTdsType} onChange={setVendorTdsType} placeholder="Select vendor TDS type" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Supplier Type</p><p className="text-sm">{fp?.supplierType ?? "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Mode of Payment</p><p className="text-sm">{fp?.modeOfPayment ?? "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Vendor TDS Type</p><p className="text-sm">{fp?.vendorTdsType ? fp.vendorTdsType.replace(/_/g, " ") : "—"}</p></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {canAct && (
        <Card>
          <CardContent className="space-y-3 p-4">
            {!paymentComplete && (
              <p className="text-sm font-medium text-amber-600">Complete Payment Details before approving.</p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={handleApprove} disabled={approving || !paymentComplete} className="flex-1 sm:flex-none"><CheckCircle2 className="h-4 w-4" />{approving ? "Approving..." : "Approve & Activate"}</Button>
              <Button variant="outline" className="flex-1 sm:flex-none border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => setHoldOpen(true)}><AlertTriangle className="h-4 w-4" /> Hold</Button>
              <Button variant="destructive" onClick={() => setRejectOpen(true)} className="flex-1 sm:flex-none"><XCircle className="h-4 w-4" /> Reject</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {request.status === "on_hold_finance" && request.holdComment && (
        <Alert variant="warning" title="On Hold">{request.holdComment}</Alert>
      )}

      {request.status === "rejected" && (request.financeComment || request.bmComment) && (
        <Alert variant="warning" title="Rejected">{request.financeComment || request.bmComment}</Alert>
      )}

      {isApproved && request.generatedInfluencerId && (
        <Alert variant="success" title="Onboarded">
          Influencer ID {request.generatedInfluencerId} has been generated and the applicant has been notified.
        </Alert>
      )}

      {/* Reject modal */}
      <Dialog open={rejectOpen} onClose={() => { setRejectOpen(false); setRejectReason(""); setRejectError(""); }}>
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
          <div className="flex-1"><DialogTitle>Reject this application?</DialogTitle><DialogDescription>The applicant will be notified and can fix and resubmit.</DialogDescription></div>
        </div>
        <div className="mt-4 space-y-1.5">
          <label htmlFor="fm-onb-reject" className="text-sm font-medium">Reason for rejection</label>
          <Textarea id="fm-onb-reject" placeholder="e.g. Bank account verification failed — IFSC does not match." value={rejectReason} onChange={(e) => { setRejectReason(e.target.value); if (rejectError) setRejectError(""); }} error={rejectError || undefined} rows={3} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setRejectOpen(false); setRejectReason(""); setRejectError(""); }} disabled={rejecting}>Cancel</Button>
          <Button variant="destructive" onClick={handleReject} disabled={rejecting}>{rejecting ? "Rejecting..." : "Reject Application"}</Button>
        </DialogFooter>
      </Dialog>

      {/* Hold modal */}
      <Dialog open={holdOpen} onClose={() => { setHoldOpen(false); setHoldReason(""); setHoldError(""); }}>
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
          <div className="flex-1"><DialogTitle>Place on hold?</DialogTitle><DialogDescription>The application will remain in your queue for later review.</DialogDescription></div>
        </div>
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="fm-onb-hold" className="text-sm font-medium">Reason for hold</label>
            <span className="text-xs text-muted-foreground">{holdReason.length}/500</span>
          </div>
          <Textarea id="fm-onb-hold" placeholder="e.g. Awaiting bank verification documents." value={holdReason} onChange={(e) => { setHoldReason(e.target.value.slice(0, 500)); if (holdError) setHoldError(""); }} error={holdError || undefined} rows={3} maxLength={500} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setHoldOpen(false); setHoldReason(""); setHoldError(""); }} disabled={holding}>Cancel</Button>
          <Button className="border-amber-300 bg-amber-500 text-white hover:bg-amber-600" onClick={handleHold} disabled={holding}>{holding ? "Placing on hold..." : "Place on Hold"}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

export default function FmOnboardingDetailPage() {
  return <ToastProvider><DetailContent /></ToastProvider>;
}
