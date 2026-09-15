"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding, STEPS } from "./context";
import { ProgressBar } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Check,
  Lock,
  Phone,
  ShieldCheck,
  CreditCard,
  MapPin,
  Share2,
  Receipt,
  Briefcase,
  CheckCircle2,
} from "lucide-react";
import { useSession, useServices } from "@/components/providers";
import { AuthHeroPanel } from "@/components/layout/auth-hero-panel";
import { Skeleton } from "@/components/ui/skeleton";
import type { OnboardingRequest } from "@/lib/types";
import type { LucideIcon } from "lucide-react";

import { StepContact } from "./steps/step-contact";
import { StepPan } from "./steps/step-pan";
import { StepBank } from "./steps/step-bank";
import { StepAddress } from "./steps/step-address";
import { StepSocial } from "./steps/step-social";
import { StepGst } from "./steps/step-gst";
import { StepMsme } from "./steps/step-msme";
import { StepReview } from "./steps/step-review";
import { StepSuccess } from "./steps/step-success";
import { OnboardingStatusScreen } from "./status-screen";

const STEP_COMPONENTS = [
  StepContact, StepPan, StepBank, StepAddress, StepSocial, StepGst, StepMsme, StepReview,
];

const STEP_ICONS: LucideIcon[] = [
  Phone, ShieldCheck, CreditCard, MapPin, Share2, Receipt, Briefcase, CheckCircle2,
];

type PageMode = "loading" | "form" | "submitted" | "status";

export default function OnboardingPage() {
  const router = useRouter();
  const { state, goToStep, update } = useOnboarding();
  const { session } = useSession();
  const { onboarding } = useServices();

  const [mode, setMode] = useState<PageMode>("loading");
  const [existingRequest, setExistingRequest] = useState<OnboardingRequest | null>(null);

  // Hydrate context from session whenever session becomes available
  useEffect(() => {
    if (session?.user && !state.mobile) {
      update({
        mobile: session.user.mobile,
        mobileVerified: true,
        email: session.user.email || state.email || "",
        emailVerified: Boolean(session.user.email),
        password: "",
        confirmPassword: "",
      });
    }
  }, [session, state.mobile, state.email, update]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (state.completed) { setMode("submitted"); return; }
      try {
        const draft = await onboarding.getCurrentDraft();
        if (cancelled) return;
        if (draft && draft.onboardingStatus === "active") { router.replace("/influencer"); return; }
      } catch { /* continue */ }
      try {
        const req = await onboarding.getMyOnboardingRequest();
        if (cancelled) return;
        if (req) {
          if (req.status === "pending_bm_review" || req.status === "pending_finance_review" || req.status === "on_hold_bm" || req.status === "on_hold_finance") { setExistingRequest(req); setMode("status"); return; }
          if (req.status === "approved") { router.replace("/influencer"); return; }
          if (req.status === "rejected") { setExistingRequest(req); setMode("status"); return; }
        }
      } catch { /* new user */ }
      if (!cancelled) setMode("form");
    }
    init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStartResubmit() {
    if (existingRequest?.draftData) {
      const d = existingRequest.draftData;
      update({
        mobile: d.mobile, mobileVerified: true, email: d.email, emailVerified: Boolean(d.email),
        password: "", confirmPassword: "",
        panNumber: d.pan?.panNumber ?? "", nameOnPan: d.pan?.nameOnPan ?? "",
        panVerificationStatus: d.pan?.verificationStatus ?? null,
        accountHolderName: "", accountNumber: d.bank?.accountNumber ?? "",
        confirmAccountNumber: "", ifsc: d.bank?.ifsc ?? "", bankName: d.bank?.bankName ?? "",
        ifscValid: null,
        address: d.address ?? { line1: "", line2: "", city: "", state: "", pincode: "", country: "India" },
        youtubeUrl: d.socialDetails?.youtubeUrl ?? "",
        instagramUrl: d.socialDetails?.instagramUrl ?? "",
        contentLanguage: d.socialDetails?.contentLanguage ?? "",
        gstApplicable: d.gst?.applicable ?? false, gstin: d.gst?.gstin ?? "",
        msmeApplicable: d.msme?.applicable ?? false, msmeRegistrationNumber: d.msme?.registrationNumber ?? "",
        termsAccepted: false, completed: false, influencerId: null, currentStep: 0,
      });
    }
    setExistingRequest(null);
    setMode("form");
  }

  // ─── Non-form modes ─────────────────────────────────────────────────

  if (mode === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="mx-auto h-12 w-12 rounded-full" />
          <Skeleton className="mx-auto h-4 w-48" />
        </div>
      </div>
    );
  }

  if (mode === "status" && existingRequest) {
    return <OnboardingStatusScreen request={existingRequest} onResubmit={handleStartResubmit} />;
  }

  if (mode === "submitted" || state.completed) {
    return <StepSuccess />;
  }

  // ─── Form mode — 3-column layout ───────────────────────────────────

  const CurrentStepComponent = STEP_COMPONENTS[state.currentStep];
  const StepIcon = STEP_ICONS[state.currentStep];
  const progress = ((state.currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="flex min-h-screen">
      {/* ─── Left: Shared hero panel (identical to login/OTP) ─── */}
      <AuthHeroPanel />

      {/* ─── Center: Form content ─────────────────────────────── */}
      <main className="flex flex-1 flex-col min-w-0">
        {/* Mobile step indicator (visible < lg) */}
        <div className="border-b border-border p-4 lg:hidden">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Step {state.currentStep + 1} of {STEPS.length}</span>
            <span>{STEPS[state.currentStep].label}</span>
          </div>
          <ProgressBar value={progress} max={100} />
        </div>

        {/* Form content — no card wrapper, matches login/OTP unwrapped style */}
        <div className="flex flex-1 items-start justify-center overflow-y-auto px-6 py-6 lg:py-10">
          <div className="w-full max-w-md space-y-6">
            {/* Step heading with icon */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <StepIcon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">
                Step {state.currentStep + 1} of {STEPS.length}
              </p>
            </div>
            <CurrentStepComponent />
          </div>
        </div>
      </main>

      {/* ─── Right: Step navigator (desktop only) ─────────────── */}
      <aside className="hidden w-48 shrink-0 border-l border-border bg-card p-4 lg:flex lg:flex-col">
        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span className="font-medium text-[11px]">Step {state.currentStep + 1}/{STEPS.length}</span>
            <span className="text-[11px]">{Math.round(progress)}%</span>
          </div>
          <ProgressBar value={progress} max={100} />
        </div>

        {/* Step list */}
        <nav className="space-y-1" aria-label="Onboarding steps">
          {STEPS.map((step, i) => {
            const isCurrent = i === state.currentStep;
            const isCompleted = i < state.currentStep;
            const isReachable = i <= state.highestStepReached;
            const isLocked = !isCurrent && !isReachable;
            return (
              <button
                key={step.id}
                onClick={() => isReachable && goToStep(i)}
                disabled={isLocked}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-xs transition-colors",
                  isCurrent && "bg-primary/10 font-medium text-primary",
                  !isCurrent && isReachable && "text-foreground hover:bg-accent cursor-pointer",
                  isLocked && "text-muted-foreground/50 cursor-not-allowed",
                )}
              >
                <span className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  isCurrent && "bg-primary text-primary-foreground",
                  isCompleted && !isCurrent && "bg-primary text-primary-foreground",
                  !isCurrent && !isCompleted && isReachable && "border border-primary/50 text-primary",
                  isLocked && "border border-muted-foreground/20 text-muted-foreground/40",
                )}>
                  {isCompleted && !isCurrent ? <Check className="h-3.5 w-3.5" /> : isLocked ? <Lock className="h-3 w-3" /> : i + 1}
                </span>
                {step.label}
              </button>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
