"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, ExternalLink, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Select } from "@/components/ui/select";
import { SkeletonDetailPanel } from "@/components/ui/skeleton";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Dialog, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useServices } from "@/components/providers";
import type { OnboardingRequest } from "@/lib/types";

type AssignableManager = { id: string; displayName: string };

const STATUS_LABELS: Record<string, string> = {
  pending_bm_review: "Pending BM Review",
  pending_finance_review: "Pending Finance Review",
  on_hold_bm: "On Hold",
  on_hold_finance: "On Hold",
  approved: "Approved",
  rejected: "Rejected",
};

const BM_PAYMENT_TERMS_OPTIONS = [
  { value: "30_days", label: "30 days" },
  { value: "45_days", label: "45 days" },
  { value: "60_days", label: "60 days" },
];

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

  // BM-required fields for approval
  const [bmUsers, setBmUsers] = useState<AssignableManager[]>([]);
  const [assignedManagerUserId, setAssignedManagerUserId] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [list, managers] = await Promise.all([
          onboarding.listOnboardingRequests(),
          onboarding.listAssignableManagers(),
        ]);
        const found = list.find((r) => r.id === requestId);
        setRequest(found ?? null);
        if (!found) setError("Onboarding request not found.");
        // Pre-fill if already set (viewing after approval)
        if (found?.assignedManagerUserId) setAssignedManagerUserId(found.assignedManagerUserId);
        if (found?.bmPaymentTerms) setPaymentTerms(found.bmPaymentTerms);
        // Active Business Managers assignable as Influencer Manager
        setBmUsers(managers);
      } catch {
        setError("Failed to load.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [requestId, onboarding]);

  const approvalFieldsComplete = Boolean(assignedManagerUserId.trim() && paymentTerms.trim());

  async function handleApprove() {
    if (!request || !approvalFieldsComplete) return;
    setApproving(true);
    try {
      const updated = await onboarding.approveOnboardingAsBM(request.id, {
        assignedManagerUserId,
        paymentTerms,
      });
      setRequest(updated);
      toast({ title: "Onboarding approved", description: "Request forwarded to Finance for review.", variant: "success" });
    } catch (err: unknown) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Error", variant: "error" });
    } finally { setApproving(false); }
  }

  async function handleReject() {
    if (!request) return;
    if (!rejectReason.trim()) { setRejectError("A rejection reason is required."); return; }
    setRejecting(true);
    try {
      const updated = await onboarding.rejectOnboardingAsBM(request.id, rejectReason.trim());
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
      const updated = await onboarding.holdOnboardingAsBM(request.id, holdReason.trim());
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
  const canAct = request.status === "pending_bm_review" || request.status === "on_hold_bm";

  const bmManagerOptions = bmUsers.map((u) => ({ value: u.id, label: u.displayName }));

  // For displaying assigned manager name (after approval)
  const assignedManagerName = bmUsers.find((u) => u.id === request.assignedManagerUserId)?.displayName ?? request.assignedManagerUserId;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <button onClick={() => router.back()} className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Go back"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold">Onboarding: {d.displayName}</h1>
            <Badge variant={request.status === "pending_bm_review" ? "warning" : request.status === "approved" ? "success" : request.status === "rejected" ? "destructive" : "default"} className="text-[10px]">
              {STATUS_LABELS[request.status]}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">+91 {d.mobile} · {d.email}</p>
        </div>
      </div>

      {/* Applicant details — BM sees full KYC */}
      <Card>
        <CardHeader><CardTitle className="text-base">Applicant Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><p className="text-xs text-muted-foreground">Name</p><p className="text-sm font-medium">{d.displayName}</p></div>
            <div><p className="text-xs text-muted-foreground">Mobile</p><p className="text-sm font-medium">+91 {d.mobile}</p></div>
            <div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm font-medium">{d.email}</p></div>
            <div><p className="text-xs text-muted-foreground">Submitted</p><p className="text-sm font-medium">{new Date(request.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p></div>
          </div>
          <Separator />

          {d.pan && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">PAN</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div><p className="text-xs text-muted-foreground">PAN Number</p><p className="font-mono text-sm">{d.pan.panNumber}</p></div>
                <div><p className="text-xs text-muted-foreground">Name on PAN</p><p className="text-sm">{d.pan.nameOnPan}</p></div>
              </div>
              {d.pan.document && (
                <a href={d.pan.document.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 rounded-md border border-input p-2 text-xs hover:bg-accent">
                  <FileText className="h-4 w-4 text-muted-foreground" />{d.pan.document.fileName}<ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              )}
              <Separator className="mt-3" />
            </div>
          )}

          {d.bank && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Bank</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div><p className="text-xs text-muted-foreground">Account Holder Name</p><p className="text-sm">{d.displayName ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Account</p><p className="font-mono text-sm">{d.bank.accountNumber}</p></div>
                <div><p className="text-xs text-muted-foreground">IFSC</p><p className="text-sm">{d.bank.ifsc}</p></div>
                <div><p className="text-xs text-muted-foreground">Bank</p><p className="text-sm">{d.bank.bankName}</p></div>
              </div>
              {d.bank.cancelledCheque && (
                <a href={d.bank.cancelledCheque.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 rounded-md border border-input p-2 text-xs hover:bg-accent">
                  <FileText className="h-4 w-4 text-muted-foreground" />{d.bank.cancelledCheque.fileName}<ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              )}
              <Separator className="mt-3" />
            </div>
          )}

          {d.address && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Address</p>
              <p className="text-sm">{[d.address.line1, d.address.line2, d.address.city, d.address.state, d.address.country, d.address.pincode].filter(Boolean).join(", ")}</p>
              <Separator className="mt-3" />
            </div>
          )}

          {d.socialDetails && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Social Details</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div><p className="text-xs text-muted-foreground">YouTube</p><p className="text-sm break-all">{d.socialDetails.youtubeUrl}</p></div>
                {d.socialDetails.instagramUrl && <div><p className="text-xs text-muted-foreground">Instagram</p><p className="text-sm break-all">{d.socialDetails.instagramUrl}</p></div>}
                <div><p className="text-xs text-muted-foreground">Content Language</p><p className="text-sm">{d.socialDetails.contentLanguage}</p></div>
              </div>
              <Separator className="mt-3" />
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">GST</p>
            <p className="text-sm">{d.gst?.applicable ? d.gst.gstin ?? "Registered" : "Not Applicable"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">MSME</p>
            <p className="text-sm">{d.msme?.applicable ? d.msme.registrationNumber ?? "Registered" : "Not Applicable"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Manager Assignment + Payment Terms — editable when pending, read-only after */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manager Assignment</CardTitle>
          {canAct && (
            <p className="text-xs text-muted-foreground">Assign an Influencer Manager and set Payment Terms before approving.</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {canAct ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="bm-manager" className="mb-1 block text-xs text-muted-foreground">Influencer Manager <span className="text-destructive">*</span></label>
                <Select id="bm-manager" options={bmManagerOptions} value={assignedManagerUserId} onChange={setAssignedManagerUserId} placeholder="Select a Business Manager" />
              </div>
              <div>
                <label htmlFor="bm-payment-terms" className="mb-1 block text-xs text-muted-foreground">Payment Terms <span className="text-destructive">*</span></label>
                <Select id="bm-payment-terms" options={BM_PAYMENT_TERMS_OPTIONS} value={paymentTerms} onChange={setPaymentTerms} placeholder="Select payment terms" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Influencer Manager</p><p className="text-sm font-medium">{request.assignedManagerUserId ? assignedManagerName : "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Payment Terms</p><p className="text-sm">{request.bmPaymentTerms ? request.bmPaymentTerms.replace(/_/g, " ") : "—"}</p></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {canAct && (
        <Card>
          <CardContent className="space-y-3 p-4">
            {!approvalFieldsComplete && (
              <p className="text-sm font-medium text-amber-600">Complete Manager Assignment before approving.</p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={handleApprove} disabled={approving || !approvalFieldsComplete} className="flex-1 sm:flex-none"><CheckCircle2 className="h-4 w-4" />{approving ? "Approving..." : "Approve"}</Button>
              <Button variant="outline" className="flex-1 sm:flex-none border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => setHoldOpen(true)}><AlertTriangle className="h-4 w-4" /> Hold</Button>
              <Button variant="destructive" onClick={() => setRejectOpen(true)} className="flex-1 sm:flex-none"><XCircle className="h-4 w-4" /> Reject</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {request.status === "on_hold_bm" && request.holdComment && (
        <Alert variant="warning" title="On Hold">{request.holdComment}</Alert>
      )}

      {request.status === "rejected" && (request.bmComment || request.financeComment) && (
        <Alert variant="warning" title="Rejected">{request.bmComment || request.financeComment}</Alert>
      )}

      {/* Reject modal */}
      <Dialog open={rejectOpen} onClose={() => { setRejectOpen(false); setRejectReason(""); setRejectError(""); }}>
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
          <div className="flex-1"><DialogTitle>Reject this application?</DialogTitle><DialogDescription>The applicant will be notified and can fix and resubmit.</DialogDescription></div>
        </div>
        <div className="mt-4 space-y-1.5">
          <label htmlFor="bm-onb-reject" className="text-sm font-medium">Reason for rejection</label>
          <Textarea id="bm-onb-reject" placeholder="e.g. PAN name does not match the submitted name." value={rejectReason} onChange={(e) => { setRejectReason(e.target.value); if (rejectError) setRejectError(""); }} error={rejectError || undefined} rows={3} />
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
            <label htmlFor="bm-onb-hold" className="text-sm font-medium">Reason for hold</label>
            <span className="text-xs text-muted-foreground">{holdReason.length}/500</span>
          </div>
          <Textarea id="bm-onb-hold" placeholder="e.g. Waiting for additional documents from the applicant." value={holdReason} onChange={(e) => { setHoldReason(e.target.value.slice(0, 500)); if (holdError) setHoldError(""); }} error={holdError || undefined} rows={3} maxLength={500} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setHoldOpen(false); setHoldReason(""); setHoldError(""); }} disabled={holding}>Cancel</Button>
          <Button className="border-amber-300 bg-amber-500 text-white hover:bg-amber-600" onClick={handleHold} disabled={holding}>{holding ? "Placing on hold..." : "Place on Hold"}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

export default function BmOnboardingDetailPage() {
  return <ToastProvider><DetailContent /></ToastProvider>;
}
