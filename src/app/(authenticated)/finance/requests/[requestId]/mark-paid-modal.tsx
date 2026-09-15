"use client";

import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

interface MarkPaidModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (paymentReference: string) => Promise<void>;
}

export function MarkPaidModal({ open, onClose, onConfirm }: MarkPaidModalProps) {
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!reference.trim()) {
      setError("UTR number or payment date is required.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await onConfirm(reference.trim());
      setReference("");
    } catch {
      setError("Failed to record payment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setReference("");
    setError("");
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Mark as Paid</DialogTitle>
      <DialogDescription>
        Confirm that payment has been processed externally (via ERP/NEFT/RTGS)
        and enter the UTR number or payment date.
      </DialogDescription>

      <Alert variant="warning" className="mt-4">
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" />
          Only mark as paid after the payment has been completed and confirmed
          in your banking/ERP system. This action cannot be undone.
        </span>
      </Alert>

      <div className="mt-4 space-y-1.5">
        <label htmlFor="payment-ref" className="text-sm font-medium">
          UTR Number or Payment Date
        </label>
        <Input
          id="payment-ref"
          placeholder="e.g. UTRNEFT260812001 or 25/08/2026"
          value={reference}
          onChange={(e) => {
            setReference(e.target.value);
            if (error) setError("");
          }}
          error={error || undefined}
        />
        <p className="text-xs text-muted-foreground">
          Enter a UTR number, transaction reference, or the date payment was processed.
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Recording..." : "Confirm Payment"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
