"use client";

import React, { useState } from "react";
import { Dialog, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

interface RejectModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function RejectModal({ open, onClose, onConfirm }: RejectModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!reason.trim()) {
      setError("A rejection reason is required.");
      return;
    }
    if (reason.length > 250) {
      setError("Rejection reason must be 250 characters or less.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setReason("");
    } catch {
      setError("Failed to reject. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setReason("");
    setError("");
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <div className="flex gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="flex-1">
          <DialogTitle>Reject this request?</DialogTitle>
          <DialogDescription>
            The influencer will be notified and will need to address the issue
            before resubmitting.
          </DialogDescription>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="reject-reason" className="text-sm font-medium">Reason for rejection</label>
          <span className="text-xs text-muted-foreground">{reason.length}/250</span>
        </div>
        <Textarea
          id="reject-reason"
          placeholder="e.g. Invoice amount does not match the agreed rate."
          value={reason}
          onChange={(e) => {
            setReason(e.target.value.slice(0, 250));
            if (error) setError("");
          }}
          error={error || undefined}
          rows={3}
          maxLength={250}
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={handleClose} disabled={submitting}>Cancel</Button>
        <Button variant="destructive" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Rejecting..." : "Reject Request"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
