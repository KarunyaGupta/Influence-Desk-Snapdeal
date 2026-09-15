"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  ShieldCheck,
  Copy,
  Check,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";
import { ApprovalTimeline, type TimelineItem } from "@/components/ui/approval-timeline";
import { SPOC } from "@/lib/config/spoc";
import type { OnboardingRequest } from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildTimeline(req: OnboardingRequest): TimelineItem[] {
  const items: TimelineItem[] = [];

  // Step 1: Submitted
  items.push({
    id: "submitted",
    label: "Application Submitted",
    description: "By you",
    timestamp: formatDate(req.submittedAt),
    status: "completed",
  });

  // Step 2: First Review
  if (req.status === "pending_bm_review" || req.status === "on_hold_bm" || req.status === "on_hold_finance") {
    items.push({
      id: "review",
      label: "Under Review",
      description: "Awaiting approval",
      status: "current",
    });
    items.push({
      id: "activated",
      label: "Account Activation",
      description: "Pending",
      status: "upcoming",
    });
  } else if (req.rejectedByStage === "bm") {
    items.push({
      id: "review",
      label: "Rejected",
      description: req.bmComment ?? "Rejected",
      timestamp: req.bmReviewedAt ? formatDate(req.bmReviewedAt) : undefined,
      status: "completed",
    });
  } else {
    // First stage approved
    items.push({
      id: "review1",
      label: "Approved",
      timestamp: req.bmReviewedAt ? formatDate(req.bmReviewedAt) : undefined,
      status: "completed",
    });

    // Step 3: Final Review
    if (req.status === "pending_finance_review") {
      items.push({
        id: "review2",
        label: "Final Review",
        description: "Awaiting approval",
        status: "current",
      });
      items.push({
        id: "activated",
        label: "Account Activation",
        description: "Pending",
        status: "upcoming",
      });
    } else if (req.rejectedByStage === "finance") {
      items.push({
        id: "review2",
        label: "Rejected",
        description: req.financeComment ?? "Rejected",
        timestamp: req.financeReviewedAt ? formatDate(req.financeReviewedAt) : undefined,
        status: "completed",
      });
    } else if (req.status === "approved") {
      items.push({
        id: "review2",
        label: "Approved",
        timestamp: req.financeReviewedAt ? formatDate(req.financeReviewedAt) : undefined,
        status: "completed",
      });
      items.push({
        id: "activated",
        label: "Account Activated",
        description: req.generatedInfluencerId
          ? `ID: ${req.generatedInfluencerId}`
          : "Active",
        timestamp: req.financeReviewedAt ? formatDate(req.financeReviewedAt) : undefined,
        status: "completed",
      });
    }
  }

  return items;
}

interface OnboardingStatusScreenProps {
  request: OnboardingRequest;
  onResubmit: () => void;
}

export function OnboardingStatusScreen({ request, onResubmit }: OnboardingStatusScreenProps) {
  const router = useRouter();
  const isPending =
    request.status === "pending_bm_review" ||
    request.status === "pending_finance_review" ||
    request.status === "on_hold_bm" ||
    request.status === "on_hold_finance";
  const isRejected = request.status === "rejected";
  const isApproved = request.status === "approved";
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (request.generatedInfluencerId) {
      navigator.clipboard.writeText(request.generatedInfluencerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const timeline = buildTimeline(request);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto mb-6">
            <Logo size="md" className="mx-auto" />
          </div>

          {/* Icon + heading based on status */}
          {isPending && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
              <h1 className="mt-4 text-2xl font-bold">Approval Pending</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your onboarding application is being reviewed. You&apos;ll be
                notified when there&apos;s an update. You can log in anytime
                to check your status.
              </p>
              <Badge variant="outline" className="mt-3">Under Review</Badge>
            </>
          )}

          {isRejected && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-8 w-8 text-amber-600" />
              </div>
              <h1 className="mt-4 text-2xl font-bold">Changes Requested</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your application needs changes before it can be approved.
                Review the feedback below and resubmit.
              </p>
            </>
          )}

          {isApproved && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h1 className="mt-4 text-2xl font-bold">You&apos;re Onboarded!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your influencer profile has been created. You can now start
                submitting invoices for your collaborations.
              </p>
            </>
          )}
        </div>

        {/* Influencer ID (only when approved) */}
        {isApproved && request.generatedInfluencerId && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted px-4 py-3">
            <span className="text-sm text-muted-foreground">Influencer ID:</span>
            <span className="font-mono text-base font-semibold">
              {request.generatedInfluencerId}
            </span>
            <button
              onClick={handleCopy}
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Copy Influencer ID"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        )}

        {/* SPOC Contact — shown for pending/on_hold */}
        {isPending && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Need help? Contact your SPOC
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{SPOC.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{SPOC.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{SPOC.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rejection reason */}
        {isRejected && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-medium text-amber-900">
                Rejected during review
              </p>
              <p className="text-sm text-amber-800">
                {(request.rejectedByStage === "bm"
                  ? request.bmComment
                  : request.financeComment) || "No reason provided."}
              </p>
              <p className="text-xs text-amber-700">
                {request.rejectedByStage === "bm" && request.bmReviewedAt
                  ? formatDate(request.bmReviewedAt)
                  : request.financeReviewedAt
                    ? formatDate(request.financeReviewedAt)
                    : ""}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <Card>
          <CardContent className="p-4">
            <p className="mb-4 text-sm font-semibold">Application Progress</p>
            <ApprovalTimeline items={timeline} />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {isRejected && (
            <Button onClick={onResubmit} className="w-full">
              <Send className="h-4 w-4" /> Fix and Resubmit
            </Button>
          )}
          {isApproved && (
            <Button onClick={() => router.push("/influencer")} className="w-full">
              Go to Dashboard
            </Button>
          )}
          {isPending && (
            <p className="text-center text-xs text-muted-foreground">
              You can close this page. We&apos;ll notify you when there&apos;s an update.
            </p>
          )}
        </div>

        {/* Security note */}
        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Your submitted details are encrypted and only accessible to
            authorized reviewers.
          </p>
        </div>
      </div>
    </div>
  );
}
