"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  Clock,
  CreditCard,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useServices } from "@/components/providers";
import type { InvoiceRequest, User } from "@/lib/types";

interface Stats {
  totalInfluencers: number;
  onboardingCompletion: number;
  pendingBm: number;
  pendingFinance: number;
  paymentPending: number;
}

export default function AdminOverviewPage() {
  const { admin, invoices } = useServices();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [users, allInvoices] = await Promise.all([
          admin.listUsers(),
          invoices.listForCurrentUser(),
        ]);
        const influencerUsers = users.filter((u: User) => u.role === "influencer");
        const activeInfluencers = influencerUsers.filter((u: User) => u.status === "active");
        setStats({
          totalInfluencers: influencerUsers.length,
          onboardingCompletion:
            influencerUsers.length > 0
              ? Math.round((activeInfluencers.length / influencerUsers.length) * 100)
              : 0,
          pendingBm: allInvoices.filter((r: InvoiceRequest) => r.status === "pending_bm_approval").length,
          pendingFinance: allInvoices.filter((r: InvoiceRequest) => r.status === "pending_finance_approval").length,
          paymentPending: allInvoices.filter((r: InvoiceRequest) => r.status === "approved_payment_pending").length,
        });
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [admin, invoices]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Total Influencers", value: stats?.totalInfluencers ?? 0, icon: Users, color: "bg-blue-100 text-blue-600" },
    { label: "Onboarding %", value: `${stats?.onboardingCompletion ?? 0}%`, icon: UserCheck, color: "bg-emerald-100 text-emerald-600" },
    { label: "Pending BM", value: stats?.pendingBm ?? 0, icon: Clock, color: "bg-amber-100 text-amber-600" },
    { label: "Pending Finance", value: stats?.pendingFinance ?? 0, icon: FileText, color: "bg-purple-100 text-purple-600" },
    { label: "Payment Pending", value: stats?.paymentPending ?? 0, icon: CreditCard, color: "bg-red-100 text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Overview</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex flex-col items-center gap-3 p-4 py-5 text-center">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${c.color}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
