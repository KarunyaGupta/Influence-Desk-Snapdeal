"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  IndianRupee,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { FileUpload, type FileUploadFile } from "@/components/ui/file-upload";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useServices } from "@/components/providers";
import type { InvoiceRequest } from "@/lib/types";

const URL_RE = /^https?:\/\/.+/i;

type FlowStep = "form" | "review" | "success";

export default function NewInvoicePage() {
  const router = useRouter();
  const { invoices } = useServices();

  const [step, setStep] = useState<FlowStep>("form");
  const [submittedRequest, setSubmittedRequest] = useState<InvoiceRequest | null>(null);

  // Form state
  const [youtubeLinks, setYoutubeLinks] = useState<string[]>([""]);
  const [lastVideoDate, setLastVideoDate] = useState("");
  const [amount, setAmount] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [file, setFile] = useState<FileUploadFile | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function addLink() {
    setYoutubeLinks((prev) => [...prev, ""]);
  }

  function removeLink(index: number) {
    setYoutubeLinks((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLink(index: number, value: string) {
    setYoutubeLinks((prev) => prev.map((v, i) => (i === index ? value : v)));
    if (errors.youtube) setErrors((p) => ({ ...p, youtube: "" }));
  }

  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    const validLinks = youtubeLinks.filter((l) => l.trim());
    if (!validLinks.length) {
      errs.youtube = "At least one YouTube video link is required.";
    } else {
      for (const link of validLinks) {
        if (!URL_RE.test(link.trim())) {
          errs.youtube = "All YouTube links must be valid URLs (https://...).";
          break;
        }
      }
    }
    if (!lastVideoDate) errs.lastVideoDate = "Last video upload date is required.";
    if (!amount || Number(amount) <= 0) errs.amount = "Enter a valid amount.";
    if (!invoiceNumber.trim()) errs.invoiceNumber = "Invoice number is required.";
    if (!invoiceDate) errs.invoiceDate = "Invoice date is required.";
    if (!file) errs.file = "Please upload your invoice document.";
    return errs;
  }, [youtubeLinks, lastVideoDate, amount, invoiceNumber, invoiceDate, file]);

  function handleContinueToReview() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStep("review");
  }

  async function handleSubmit() {
    setSubmitting(true);
    setErrors({});
    try {
      const result = await invoices.submit({
        youtubeVideoLinks: youtubeLinks.filter((l) => l.trim()).map((l) => l.trim()),
        lastVideoUploadDate: lastVideoDate,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate,
        amountInr: Number(amount),
        fileName: file!.file.name,
        mimeType: file!.file.type as "application/pdf" | "image/jpeg" | "image/png",
      });
      setSubmittedRequest(result);
      setStep("success");
    } catch (err: unknown) {
      const svcErr = err as { code?: string; message?: string };
      if (svcErr.code === "DUPLICATE_INVOICE") {
        setErrors({ invoiceNumber: "This invoice number has already been submitted. Please use a unique invoice number." });
        setStep("form");
      } else {
        setErrors({ submit: svcErr.message ?? "Submission failed." });
      }
    } finally { setSubmitting(false); }
  }

  function formatCurrency(val: string): string {
    const num = Number(val);
    if (!num) return "";
    return new Intl.NumberFormat("en-IN").format(num);
  }

  // ─── FORM STEP ─────────────────────────────────────────────────────────
  if (step === "form") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold">Submit Invoice</h1>
            <p className="text-sm text-muted-foreground">Fill in the details below to submit a new invoice claim.</p>
          </div>
        </div>

        {errors.submit && <Alert variant="error">{errors.submit}</Alert>}

        {/* YouTube Video Links — repeatable */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Video className="h-4 w-4 text-red-600" />
            YouTube Video Link(s)
          </label>
          {youtubeLinks.map((link, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={link}
                onChange={(e) => updateLink(i, e.target.value)}
                type="url"
              />
              {youtubeLinks.length > 1 && (
                <button type="button" onClick={() => removeLink(i)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" aria-label="Remove link">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addLink} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
            <Plus className="h-3.5 w-3.5" /> Add another link
          </button>
          {errors.youtube && <p className="text-sm text-destructive">{errors.youtube}</p>}
        </div>

        {/* Last Video Upload Date */}
        <div className="space-y-1.5">
          <label htmlFor="last-video-date" className="text-sm font-medium">Last Video Upload Date</label>
          <DatePicker
            id="last-video-date"
            value={lastVideoDate}
            onChange={(val) => { setLastVideoDate(val); if (errors.lastVideoDate) setErrors((p) => ({ ...p, lastVideoDate: "" })); }}
            error={errors.lastVideoDate}
          />
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <label htmlFor="amount" className="text-sm font-medium">Invoice Amount (₹)</label>
          <div className="relative">
            <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="amount" type="text" inputMode="numeric" placeholder="0" value={amount}
              onChange={(e) => { setAmount(e.target.value.replace(/[^\d]/g, "")); if (errors.amount) setErrors((p) => ({ ...p, amount: "" })); }}
              className="pl-9" error={errors.amount} />
          </div>
          {amount && Number(amount) > 0 && <p className="text-xs text-muted-foreground">₹{formatCurrency(amount)}</p>}
        </div>

        {/* Invoice Number */}
        <div className="space-y-1.5">
          <label htmlFor="inv-number" className="text-sm font-medium">Invoice Number</label>
          <Input id="inv-number" placeholder="e.g. INV-2026-001" value={invoiceNumber}
            onChange={(e) => { setInvoiceNumber(e.target.value); if (errors.invoiceNumber) setErrors((p) => ({ ...p, invoiceNumber: "" })); }}
            error={errors.invoiceNumber} />
        </div>

        {/* Invoice Date */}
        <div className="space-y-1.5">
          <label htmlFor="inv-date" className="text-sm font-medium">Invoice Date</label>
          <DatePicker id="inv-date" value={invoiceDate}
            onChange={(val) => { setInvoiceDate(val); if (errors.invoiceDate) setErrors((p) => ({ ...p, invoiceDate: "" })); }}
            error={errors.invoiceDate} />
        </div>

        {/* File Upload */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Invoice Document</label>
          <FileUpload id="invoice-file" value={file}
            onChange={(f) => { setFile(f); if (errors.file) setErrors((p) => ({ ...p, file: "" })); }}
            accept=".pdf,.jpg,.jpeg,.png" error={errors.file} />
          <a
            href="/sample-invoice-template.doc"
            download="Snapdeal-Invoice-Template.doc"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Download className="h-3.5 w-3.5" /> Download sample invoice template
          </a>
        </div>

        <div className="sticky bottom-0 -mx-4 border-t border-border bg-background px-4 py-4 md:static md:mx-0 md:border-0 md:px-0 md:py-0 md:pt-2">
          <Button className="w-full md:w-auto" onClick={handleContinueToReview}>Continue to Review</Button>
        </div>
      </div>
    );
  }

  // ─── REVIEW STEP ───────────────────────────────────────────────────────
  if (step === "review") {
    const validLinks = youtubeLinks.filter((l) => l.trim());
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep("form")} className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Go back to form">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold">Review Invoice</h1>
            <p className="text-sm text-muted-foreground">Confirm the details below before submitting your claim.</p>
          </div>
        </div>

        {errors.submit && <Alert variant="error">{errors.submit}</Alert>}

        <Card>
          <CardContent className="space-y-4 p-4 md:p-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">YouTube Video Link(s)</p>
              <div className="space-y-1">
                {validLinks.map((link, i) => (
                  <p key={i} className="text-sm font-medium break-all">{link}</p>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Last Video Upload Date</p>
                <p className="text-sm font-medium">{new Date(lastVideoDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="text-sm font-medium">₹{formatCurrency(amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Invoice Number</p>
                <p className="text-sm font-medium">{invoiceNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Invoice Date</p>
                <p className="text-sm font-medium">{new Date(invoiceDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground mb-2">Document</p>
              <div className="flex items-center gap-2 rounded-md border border-input p-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm truncate">{file?.file.name}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-border bg-background px-4 py-4 md:static md:mx-0 md:border-0 md:px-0 md:py-0 md:pt-2">
          <Button variant="outline" onClick={() => setStep("form")}>Edit</Button>
          <Button className="flex-1 md:flex-none" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Claim"}
          </Button>
        </div>
      </div>
    );
  }

  // ─── SUCCESS STEP ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>
      <h1 className="mt-5 text-xl font-bold">Invoice Submitted!</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Your invoice claim has been submitted and is now pending approval.
      </p>
      <Card className="mt-6 w-full max-w-sm text-left">
        <CardContent className="space-y-3 p-4">
          <div className="flex justify-between">
            <span className="text-xs text-muted-foreground">Request ID</span>
            <span className="font-mono text-sm font-semibold">{submittedRequest?.requestId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-muted-foreground">Status</span>
            <StatusBadge status="pending_bm_approval" variant="influencer" />
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-muted-foreground">Amount</span>
            <span className="text-sm font-medium">₹{formatCurrency(amount)}</span>
          </div>
        </CardContent>
      </Card>
      <div className="mt-6 flex gap-3">
        <Link href={`/influencer/invoices/${submittedRequest?.requestId}`}>
          <Button variant="outline">View Request</Button>
        </Link>
        <Link href="/influencer">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
