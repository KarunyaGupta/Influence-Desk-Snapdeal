"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Clock,
  CreditCard,
  CheckCircle2,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession, useServices } from "@/components/providers";
import type { InvoiceRequest } from "@/lib/types";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

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

export default function InfluencerDashboard() {
  const { session } = useSession();
  const { invoices } = useServices();
  const [requests, setRequests] = useState<InvoiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const invList = await invoices.listForCurrentUser();
        setRequests(invList);
      } catch {
        // fallback empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [invoices]);

  const firstName = session?.user.displayName.split(" ")[0] ?? "there";

  // Compute summary counts
  const awaitingApproval = requests.filter(
    (r) => r.status === "pending_bm_approval" || r.status === "pending_finance_approval",
  ).length;
  const paymentPending = requests.filter(
    (r) => r.status === "approved_payment_pending",
  ).length;
  const paid = requests.filter((r) => r.status === "paid").length;

  const recentRequests = requests.slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">
          {getGreeting()}, {firstName}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Here&apos;s an overview of your invoice activity.
        </p>
      </div>

      {/* Hero CTA — Submit Invoice */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Ready to submit an invoice?</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Upload your invoice and video details to start the approval process.
            </p>
          </div>
          <Link href="/influencer/invoices/new">
            <Button size="lg" className="w-full sm:w-auto text-base px-8 py-6">
              <Plus className="h-5 w-5" /> Submit Invoice
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Onboarding</p>
              <p className="text-lg font-semibold text-emerald-600">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Awaiting Approval</p>
              <p className="text-lg font-semibold">{awaitingApproval}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
              <CreditCard className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payment Pending</p>
              <p className="text-lg font-semibold">{paymentPending}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="text-lg font-semibold">{paid}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Requests</CardTitle>
          <Link
            href="/influencer/invoices"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {recentRequests.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              No invoices submitted yet. Submit your first invoice to get started.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentRequests.map((req) => (
                <Link
                  key={req.requestId}
                  href={`/influencer/invoices/${req.requestId}`}
                  className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-accent/50 -mx-4 px-4 md:-mx-6 md:px-6 rounded-md"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {req.invoiceNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(req.amountInr)} · {formatDate(req.submittedAt)}
                    </p>
                  </div>
                  <StatusBadge status={req.status} variant="influencer" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
