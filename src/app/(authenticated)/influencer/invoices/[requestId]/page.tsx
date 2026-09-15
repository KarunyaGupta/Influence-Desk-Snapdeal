"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Alert } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ApprovalTimeline,
  type TimelineItem,
} from "@/components/ui/approval-timeline";
import { SkeletonDetailPanel } from "@/components/ui/skeleton";
import { useServices } from "@/components/providers";
import type { InvoiceRequest } from "@/lib/types";

const ROLE_LABELS: Record<string, string> = {
  business_manager: "Reviewer",
  finance_manager: "Reviewer",
  admin: "Reviewer",
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

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildTimeline(request: InvoiceRequest): TimelineItem[] {
  const items: TimelineItem[] = [];

  // Step 1: Submitted
  items.push({
    id: "submitted",
    label: "Invoice Submitted",
    description: "By you",
    timestamp: formatDateTime(request.submittedAt),
    status: "completed",
  });

  // Step 2: Review (collapsed — influencer sees one "Under Review" / "Approved" / "Rejected")
  const bmStep = request.approvalSteps.find((s) => s.actorRole === "business_manager");
  const fmStep = request.approvalSteps.find(
    (s) => s.actorRole === "finance_manager" && s.action !== "mark_paid",
  );

  if (request.status === "rejected") {
    // Show rejection
    const rejectStep = bmStep?.action === "reject" ? bmStep : fmStep?.action === "reject" ? fmStep : null;
    items.push({
      id: "review",
      label: "Rejected",
      description: rejectStep ? `Reason: "${rejectStep.comment}"` : "Rejected during review",
      timestamp: rejectStep ? formatDateTime(rejectStep.createdAt) : undefined,
      status: "completed",
    });
  } else if (request.status === "pending_bm_approval") {
    items.push({
      id: "review",
      label: "Under Review",
      description: "Awaiting approval",
      status: "current",
    });
    items.push({
      id: "payment",
      label: "Payment",
      description: "Pending",
      status: "upcoming",
    });
  } else if (request.status === "pending_finance_approval") {
    items.push({
      id: "review",
      label: "Under Review",
      description: "Awaiting final approval",
      status: "current",
    });
    items.push({
      id: "payment",
      label: "Payment",
      description: "Pending",
      status: "upcoming",
    });
  } else {
    // approved_payment_pending or paid — show single "Approved"
    const approveTimestamp = fmStep?.action === "approve" ? fmStep.createdAt : bmStep?.action === "approve" ? bmStep.createdAt : null;
    items.push({
      id: "review",
      label: "Approved",
      timestamp: approveTimestamp ? formatDateTime(approveTimestamp) : undefined,
      status: "completed",
    });
  }

  // Step 3: Payment (only for non-rejected)
  if (request.status === "paid") {
    items.push({
      id: "payment",
      label: "Payment Processed",
      description: request.paymentReference ? `UTR: ${request.paymentReference}` : "Payment completed",
      timestamp: request.paidAt ? formatDateTime(request.paidAt) : undefined,
      status: "completed",
    });
  } else if (request.status === "approved_payment_pending") {
    items.push({
      id: "payment",
      label: "Payment",
      description: "Processing",
      status: "current",
    });
  }

  return items;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.requestId as string;
  const { invoices } = useServices();

  const [request, setRequest] = useState<InvoiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const inv = await invoices.getById(requestId);
        setRequest(inv);
      } catch {
        setError("Invoice request not found.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [requestId, invoices]);

  if (loading) return <SkeletonDetailPanel />;

  if (error || !request) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error || "Request not found."}</Alert>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const isRejected = request.status === "rejected";
  const timelineItems = buildTimeline(request);

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
            <StatusBadge status={request.status} variant="influencer" />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {request.youtubeVideoLinks[0] ?? ""}
          </p>
        </div>
      </div>

      {/* Rejection banner */}
      {isRejected && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="flex-1 space-y-2">
                <h3 className="text-sm font-semibold text-amber-900">
                  This request needs changes
                </h3>
                <div className="text-sm text-amber-800 space-y-1">
                  <p>
                    <span className="font-medium">Stage:</span>{" "}
                    Review
                  </p>
                  <p>
                    <span className="font-medium">Reason:</span>{" "}
                    {request.rejectionComment}
                  </p>
                  <p>
                    <span className="font-medium">Date:</span>{" "}
                    {request.rejectedAt ? formatDate(request.rejectedAt) : "—"}
                  </p>
                </div>
                <Link
                  href="/influencer/invoices/new"
                >
                  <Button size="sm" className="mt-2">
                    <Plus className="h-4 w-4" /> Submit a New Request
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Timeline */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Approval Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ApprovalTimeline items={timelineItems} />
          </CardContent>
        </Card>

        {/* Right: Invoice details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Invoice Number</p>
                <p className="text-sm font-medium">{request.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Invoice Date</p>
                <p className="text-sm font-medium">
                  {formatDate(request.invoiceDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="text-sm font-medium">
                  {formatCurrency(request.amountInr)}
                </p>
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
                <p className="text-sm font-medium">{formatDate(request.lastVideoUploadDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Submitted</p>
                <p className="text-sm font-medium">
                  {formatDateTime(request.submittedAt)}
                </p>
              </div>
              {request.paymentReference && (
                <div>
                  <p className="text-xs text-muted-foreground">UTR / Payment Date</p>
                  <p className="font-mono text-sm font-medium">
                    {request.paymentReference}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Document */}
            <div>
              <p className="mb-2 text-xs text-muted-foreground">
                Uploaded Document
              </p>
              <a
                href={request.document.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-input p-3 text-sm transition-colors hover:bg-accent"
              >
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1 truncate">
                  {request.document.fileName}
                </span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
