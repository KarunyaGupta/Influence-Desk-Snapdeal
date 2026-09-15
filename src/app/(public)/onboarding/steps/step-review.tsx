"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { CheckCircle2, XCircle, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useOnboarding } from "../context";
import { useServices } from "@/components/providers";

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

/* ─── Terms & Conditions Modal ───────────────────────────────────────────── */

function TermsModal({
  open,
  onClose,
  onAccept,
}: {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
}) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Consider "scrolled to bottom" when within 20px of the end
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
    if (atBottom && !scrolledToBottom) setScrolledToBottom(true);
  }, [scrolledToBottom]);

  // Reset scroll state when modal opens
  React.useEffect(() => {
    if (open) setScrolledToBottom(false);
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} persistent className="max-w-lg">
      <DialogTitle className="flex items-center gap-2">
        <ScrollText className="h-5 w-5 text-primary" />
        Terms &amp; Conditions
      </DialogTitle>
      <p className="mt-1 text-xs text-muted-foreground">
        DRAFT — Placeholder text for review. To be replaced with final legal copy.
      </p>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="mt-4 max-h-[50vh] overflow-y-auto rounded-md border border-border bg-muted/30 p-4 text-sm leading-relaxed text-foreground/90"
      >
        <h3 className="font-semibold mb-2">1. Scope of Agreement</h3>
        <p className="mb-3">
          These Terms &amp; Conditions (&quot;Agreement&quot;) govern your use of the
          Snapdeal Influencer Hub platform (&quot;Platform&quot;) operated by Snapdeal
          Limited (&quot;Company&quot;). By completing the onboarding process and
          submitting invoices through the Platform, you (&quot;Influencer&quot;) agree
          to be bound by these terms. This Agreement covers the relationship
          between the Company and the Influencer for the purpose of content
          creation, promotion, and associated invoice management services.
        </p>

        <h3 className="font-semibold mb-2">2. Payment Terms &amp; Timelines</h3>
        <p className="mb-3">
          All payments for approved invoices will be processed in Indian Rupees
          (INR) via the payment method specified by the Finance team during
          onboarding approval. Payment timelines are determined by the
          Finance team at the time of onboarding approval and may include
          Immediate, 7-day, 15-day, 30-day, 45-day, or 60-day terms from
          the date of invoice approval. The Company reserves the right to
          withhold payment if invoices are found to contain inaccurate
          information or if the associated campaign deliverables are
          incomplete.
        </p>

        <h3 className="font-semibold mb-2">3. Tax &amp; Compliance Responsibility</h3>
        <p className="mb-3">
          The Influencer is solely responsible for maintaining accurate tax
          records, including but not limited to PAN, GST registration (if
          applicable), and MSME registration (if applicable). The Influencer
          acknowledges that TDS (Tax Deducted at Source) will be applied to
          all payments as per applicable Indian tax laws. It is the
          Influencer&apos;s responsibility to file tax returns and claim TDS
          credits as applicable. The Company will provide TDS certificates
          as required by law.
        </p>

        <h3 className="font-semibold mb-2">4. Data Usage &amp; Privacy</h3>
        <p className="mb-3">
          The Company collects and processes personal data including identity
          documents (PAN, bank details), contact information, and social
          media profiles solely for the purpose of onboarding verification,
          payment processing, and regulatory compliance. All data is stored
          securely and encrypted at rest. The Company will not share your
          personal data with third parties except as required by law or for
          payment processing. You may request access to, correction of, or
          deletion of your personal data in accordance with the Digital
          Personal Data Protection Act, 2023.
        </p>

        <h3 className="font-semibold mb-2">5. Content &amp; Intellectual Property</h3>
        <p className="mb-3">
          Content created by the Influencer under campaign agreements remains
          the intellectual property of the Influencer unless explicitly
          transferred via a separate written agreement. The Company is
          granted a non-exclusive license to use campaign content for
          promotional purposes for the duration specified in the campaign
          brief.
        </p>

        <h3 className="font-semibold mb-2">6. Termination</h3>
        <p className="mb-3">
          Either party may terminate this Agreement with 30 days&apos; written
          notice. The Company may immediately suspend or terminate access
          to the Platform if the Influencer breaches these terms, provides
          fraudulent information, or fails to comply with applicable laws.
          Upon termination, any pending approved invoices will be processed
          per the agreed payment terms. Unpaid invoices that have not yet
          been approved will be voided.
        </p>

        <h3 className="font-semibold mb-2">7. Dispute Resolution</h3>
        <p className="mb-3">
          Any disputes arising from this Agreement shall first be resolved
          through good-faith negotiation between the parties. If no
          resolution is reached within 30 days, the dispute shall be
          referred to arbitration in accordance with the Arbitration and
          Conciliation Act, 1996, with the seat of arbitration in New
          Delhi, India. The language of arbitration shall be English.
        </p>

        <h3 className="font-semibold mb-2">8. Amendments</h3>
        <p className="mb-0">
          The Company reserves the right to modify these Terms &amp; Conditions
          at any time. Material changes will be communicated via email or
          in-app notification at least 15 days before taking effect.
          Continued use of the Platform after such notice constitutes
          acceptance of the updated terms.
        </p>
      </div>

      {!scrolledToBottom && (
        <p className="mt-2 text-xs text-muted-foreground text-center">
          ↓ Scroll to the bottom to enable acceptance
        </p>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onAccept} disabled={!scrolledToBottom}>
          {scrolledToBottom ? "Accept Terms & Conditions" : "Read to Accept"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/* ─── Review Step ────────────────────────────────────────────────────────── */

export function StepReview() {
  const { state, update, prevStep, complete } = useOnboarding();
  const { onboarding } = useServices();
  const [termsAccepted, setTermsAccepted] = useState(state.termsAccepted);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const legalName = state.nameOnPan.trim();

  const signatureMatches = useMemo(
    () => signature.trim().toLowerCase() === legalName.toLowerCase() && signature.trim().length > 0,
    [signature, legalName],
  );

  const canSubmit = termsAccepted && signatureMatches && !submitting;

  function handleTermsClick(e: React.MouseEvent) {
    e.preventDefault();
    if (!termsAccepted) {
      setTermsModalOpen(true);
    }
  }

  function handleTermsAccepted() {
    setTermsAccepted(true);
    update({ termsAccepted: true });
    setTermsModalOpen(false);
    if (error) setError("");
  }

  async function handleSubmit() {
    if (!termsAccepted) {
      setError("You must accept the terms to continue.");
      return;
    }
    if (!signatureMatches) {
      setError(`Please type your full name exactly as "${legalName}" to sign.`);
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      await onboarding.saveDraft({
        pan: {
          panNumber: state.panNumber,
          nameOnPan: state.nameOnPan,
          document: null,
          verificationStatus:
            (state.panVerificationStatus as
              | "pending"
              | "valid"
              | "invalid"
              | "inoperative") ?? "pending",
        },
        bank: {
          accountNumber: state.accountNumber,
          ifsc: state.ifsc,
          bankName: state.bankName,
          cancelledCheque: null,
          verificationStatus: "pending",
        },
        address: state.address,
        socialDetails: {
          youtubeUrl: state.youtubeUrl,
          instagramUrl: state.instagramUrl,
          contentLanguage: state.contentLanguage,
        },
        gst: {
          applicable: state.gstApplicable,
          gstin: state.gstApplicable ? state.gstin : null,
          certificate: null,
        },
        msme: {
          applicable: state.msmeApplicable,
          registrationNumber: state.msmeApplicable
            ? state.msmeRegistrationNumber
            : null,
          certificate: null,
        },
        termsAccepted: true,
        password: state.password,
      });

      await onboarding.submit();
      complete("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Review &amp; Submit</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Please review your details before submitting. You can go back to
          edit any section.
        </p>
      </div>

      {/* Contact */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Contact
        </h3>
        <ReviewRow label="Mobile" value={`+91 ${state.mobile}`} />
        <ReviewRow label="Email" value={state.email} />
        <Separator />
      </div>

      {/* PAN */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          PAN
        </h3>
        <ReviewRow label="Name" value={state.nameOnPan} />
        <ReviewRow label="PAN Number" value={state.panNumber} />
        <Separator />
      </div>

      {/* Bank */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Bank
        </h3>
        <ReviewRow label="Account" value={state.accountNumber} />
        <ReviewRow label="IFSC" value={state.ifsc} />
        <ReviewRow label="Bank" value={state.bankName} />
        <ReviewRow label="Currency" value="INR" />
        <Separator />
      </div>

      {/* Address */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Address
        </h3>
        <ReviewRow
          label="Address"
          value={[
            state.address.line1, state.address.line2,
            state.address.city, state.address.state, state.address.pincode, state.address.country,
          ].filter(Boolean).join(", ")}
        />
        <Separator />
      </div>

      {/* Social Details */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Social Details
        </h3>
        <ReviewRow label="YouTube" value={state.youtubeUrl} />
        {state.instagramUrl && <ReviewRow label="Instagram" value={state.instagramUrl} />}
        <ReviewRow label="Content Language" value={state.contentLanguage} />
        <Separator />
      </div>

      {/* GST */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          GST
        </h3>
        <ReviewRow label="Registered" value={state.gstApplicable ? "Yes" : "No"} />
        {state.gstApplicable && <ReviewRow label="GSTIN" value={state.gstin} />}
        <Separator />
      </div>

      {/* MSME */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          MSME
        </h3>
        <ReviewRow label="Registered" value={state.msmeApplicable ? "Yes" : "No"} />
        {state.msmeApplicable && <ReviewRow label="Udyam No." value={state.msmeRegistrationNumber} />}
        <Separator />
      </div>

      {/* Terms & Conditions — click opens modal */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleTermsClick}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleTermsClick(e as unknown as React.MouseEvent); }}
        className={`flex min-h-[44px] items-start gap-3 rounded-md border p-3 transition-colors ${
          termsAccepted
            ? "border-emerald-300 bg-emerald-50/50 cursor-default"
            : "border-input cursor-pointer hover:bg-accent/50"
        }`}
      >
        <input
          type="checkbox"
          checked={termsAccepted}
          readOnly
          className="mt-0.5 h-5 w-5 rounded border-input accent-primary pointer-events-none"
          tabIndex={-1}
        />
        <span className="text-sm">
          I confirm that the information provided is accurate and I accept the{" "}
          <span className="text-primary underline font-medium">Terms &amp; Conditions</span> and{" "}
          <span className="text-primary underline font-medium">Privacy Policy</span> of
          Snapdeal Influencer Hub.
        </span>
      </div>
      {termsAccepted && (
        <p className="flex items-center gap-1.5 text-xs text-emerald-600 -mt-4">
          <CheckCircle2 className="h-3.5 w-3.5" /> Terms accepted
        </p>
      )}

      {/* Signature */}
      <div className="space-y-1.5">
        <label htmlFor="signature" className="text-sm font-medium">
          Type your full name as your signature
        </label>
        <Input
          id="signature"
          placeholder={legalName || "Your full legal name"}
          value={signature}
          onChange={(e) => {
            setSignature(e.target.value);
            if (error) setError("");
          }}
        />
        {signature.trim().length > 0 && (
          signatureMatches ? (
            <p className="flex items-center gap-1.5 text-xs text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Signature matches your legal name.
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <XCircle className="h-3.5 w-3.5" /> Must exactly match &quot;{legalName}&quot; (case-insensitive).
            </p>
          )
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Navigation */}
      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-border bg-card px-4 py-4 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:pt-4">
        <Button variant="outline" onClick={prevStep} disabled={submitting}>
          Back
        </Button>
        <Button
          className="flex-1 md:flex-none"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? "Submitting..." : "Submit Application"}
        </Button>
      </div>

      {/* T&C Modal */}
      <TermsModal
        open={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
        onAccept={handleTermsAccepted}
      />
    </div>
  );
}
