"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  CreditCard,
  MapPin,
  FileText,
  Building,
  PenLine,
  CheckCircle2,
  Phone,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SkeletonDetailPanel } from "@/components/ui/skeleton";
import { useServices, useSession } from "@/components/providers";
import { RequestEditModal } from "./request-edit-modal";
import type { KycRecord, ProfileEditFieldGroup } from "@/lib/types";

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className={`text-sm text-right font-medium ${mono ? "font-mono tracking-wider" : ""}`}>
        {value || "—"}
      </span>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  fieldGroup,
  onRequestEdit,
}: {
  icon: React.ElementType;
  title: string;
  fieldGroup: ProfileEditFieldGroup;
  onRequestEdit: (fieldGroup: ProfileEditFieldGroup) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-xs text-muted-foreground"
        onClick={() => onRequestEdit(fieldGroup)}
      >
        <PenLine className="h-3.5 w-3.5" /> Request Update
      </Button>
    </div>
  );
}

export default function InfluencerProfilePage() {
  const { kyc: kycService, onboarding } = useServices();
  const { session } = useSession();
  const [kyc, setKyc] = useState<KycRecord | null>(null);
  const [influencerId, setInfluencerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<{
    open: boolean;
    fieldGroup: ProfileEditFieldGroup;
  }>({ open: false, fieldGroup: "pan" });

  useEffect(() => {
    async function load() {
      try {
        const draft = await onboarding.getCurrentDraft();
        if (draft) {
          setInfluencerId(draft.influencerId);
          const kycData = await kycService.getByInfluencerId(draft.influencerId);
          setKyc(kycData);
        }
      } catch {
        // no data
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [kycService, onboarding]);

  function handleRequestEdit(fieldGroup: ProfileEditFieldGroup) {
    setEditModal({ open: true, fieldGroup });
  }

  if (loading) return <SkeletonDetailPanel />;

  if (!kyc) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No KYC data found.</p>
      </div>
    );
  }

  const verificationBadge = (status: string | undefined) => {
    if (status === "valid")
      return <Badge variant="success" className="text-[10px]"><CheckCircle2 className="h-3 w-3" /> Verified</Badge>;
    if (status === "inoperative")
      return <Badge variant="warning" className="text-[10px]">Inoperative</Badge>;
    if (status === "invalid")
      return <Badge variant="destructive" className="text-[10px]">Invalid</Badge>;
    return <Badge variant="outline" className="text-[10px]">Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Profile &amp; KYC</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Your verified onboarding details. To update sensitive fields, submit a
          change request for admin review.
        </p>
      </div>

      {/* Personal Info + Contact change requests */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Personal Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DetailRow label="Name" value={session?.user.displayName} />
          <div className="flex items-start justify-between gap-4 py-2">
            <span className="text-sm text-muted-foreground shrink-0">Mobile</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">+91 {session?.user.mobile}</span>
              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-muted-foreground"
                onClick={() => handleRequestEdit("mobile")}>
                <PenLine className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex items-start justify-between gap-4 py-2">
            <span className="text-sm text-muted-foreground shrink-0">Email</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{session?.user.email}</span>
              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-muted-foreground"
                onClick={() => handleRequestEdit("email")}>
                <PenLine className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <DetailRow label="Influencer ID" value={influencerId} />
        </CardContent>
      </Card>

      {/* PAN — UNMASKED */}
      <Card>
        <CardHeader className="pb-2">
          <SectionHeader icon={FileText} title="PAN Details" fieldGroup="pan" onRequestEdit={handleRequestEdit} />
        </CardHeader>
        <CardContent>
          {kyc.pan ? (
            <>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Status</span>
                {verificationBadge(kyc.pan.verificationStatus)}
              </div>
              <DetailRow label="PAN Number" value={kyc.pan.panNumber} mono />
              <DetailRow label="Name on PAN" value={kyc.pan.nameOnPan} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-2">Not provided</p>
          )}
        </CardContent>
      </Card>

      {/* Bank — UNMASKED */}
      <Card>
        <CardHeader className="pb-2">
          <SectionHeader icon={CreditCard} title="Bank Details" fieldGroup="bank" onRequestEdit={handleRequestEdit} />
        </CardHeader>
        <CardContent>
          {kyc.bank ? (
            <>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Status</span>
                {verificationBadge(kyc.bank.verificationStatus)}
              </div>
              <DetailRow label="Account Number" value={kyc.bank.accountNumber} mono />
              <DetailRow label="IFSC" value={kyc.bank.ifsc} />
              <DetailRow label="Bank Name" value={kyc.bank.bankName} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-2">Not provided</p>
          )}
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader className="pb-2">
          <SectionHeader icon={MapPin} title="Address" fieldGroup="address" onRequestEdit={handleRequestEdit} />
        </CardHeader>
        <CardContent>
          {kyc.address ? (
            <DetailRow
              label="Full Address"
              value={[kyc.address.line1, kyc.address.line2, kyc.address.city, kyc.address.state, kyc.address.country, kyc.address.pincode].filter(Boolean).join(", ")}
            />
          ) : (
            <p className="text-sm text-muted-foreground py-2">Not provided</p>
          )}
        </CardContent>
      </Card>

      {/* GST */}
      <Card>
        <CardHeader className="pb-2">
          <SectionHeader icon={Building} title="GST Registration" fieldGroup="gst" onRequestEdit={handleRequestEdit} />
        </CardHeader>
        <CardContent>
          <DetailRow label="GST Registered" value={kyc.gst?.applicable ? "Yes" : "No"} />
          {kyc.gst?.applicable && <DetailRow label="GSTIN" value={kyc.gst.gstin} />}
        </CardContent>
      </Card>

      {/* MSME */}
      <Card>
        <CardHeader className="pb-2">
          <SectionHeader icon={Building} title="MSME Registration" fieldGroup="msme" onRequestEdit={handleRequestEdit} />
        </CardHeader>
        <CardContent>
          <DetailRow label="MSME Registered" value={kyc.msme?.applicable ? "Yes" : "No"} />
          {kyc.msme?.applicable && <DetailRow label="Udyam Number" value={kyc.msme.registrationNumber} />}
        </CardContent>
      </Card>

      <Separator />

      <p className="text-xs text-muted-foreground">
        All sensitive data is encrypted at rest and visible only to you and
        authorized finance/admin personnel.
      </p>

      {/* Request Edit Modal */}
      <RequestEditModal
        open={editModal.open}
        fieldGroup={editModal.fieldGroup}
        influencerId={influencerId ?? ""}
        onClose={() => setEditModal({ ...editModal, open: false })}
      />
    </div>
  );
}
