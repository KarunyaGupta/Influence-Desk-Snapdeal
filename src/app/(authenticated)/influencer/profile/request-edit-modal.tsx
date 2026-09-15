"use client";

import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Dialog, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useServices } from "@/components/providers";
import type { ProfileEditFieldGroup } from "@/lib/types";

const FIELD_LABELS: Record<ProfileEditFieldGroup, string> = {
  pan: "PAN Details",
  bank: "Bank Details",
  address: "Address",
  gst: "GST Registration",
  msme: "MSME Registration",
  mobile: "Mobile Number",
  email: "Email Address",
};

interface RequestEditModalProps {
  open: boolean;
  fieldGroup: ProfileEditFieldGroup;
  influencerId: string;
  onClose: () => void;
}

export function RequestEditModal({
  open,
  fieldGroup,
  influencerId,
  onClose,
}: RequestEditModalProps) {
  const { kyc } = useServices();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    if (!reason.trim()) {
      setError("Please describe what needs to be updated.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await kyc.requestEdit({ influencerId, fieldGroup, reason: reason.trim() });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setReason("");
    setError("");
    setSuccess(false);
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      {success ? (
        <div className="space-y-4 text-center py-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
          </div>
          <DialogTitle>Request Submitted</DialogTitle>
          <DialogDescription>
            Your update request for {FIELD_LABELS[fieldGroup]} has been submitted.
            An admin will review it and you&apos;ll be notified once approved.
          </DialogDescription>
          <DialogFooter className="justify-center">
            <Button onClick={handleClose}>Done</Button>
          </DialogFooter>
        </div>
      ) : (
        <>
          <DialogTitle>
            Request Update — {FIELD_LABELS[fieldGroup]}
          </DialogTitle>
          <DialogDescription>
            For security, sensitive profile fields cannot be edited directly.
            Describe what needs to change and our team will review your request
            within 2 business days.
          </DialogDescription>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="edit-reason" className="text-sm font-medium">
                What needs to be updated?
              </label>
              <Textarea
                id="edit-reason"
                placeholder="Describe what needs to be updated"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError("");
                }}
                error={error || undefined}
                rows={4}
              />
            </div>

            {/* Security helper */}
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Do not include full PAN numbers or complete bank account numbers
                in this form. Our team will contact you securely to verify
                sensitive details during the review process.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </>
      )}
    </Dialog>
  );
}
