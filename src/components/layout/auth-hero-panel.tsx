import React from "react";
import { Logo } from "@/components/ui/logo";

/**
 * Shared left-side hero/marketing panel used across the entire public auth flow:
 * mobile number entry, OTP verification, and all 7 onboarding steps.
 *
 * This component is the single source of truth for the marketing content —
 * it renders identically on every screen so the layout stays visually
 * consistent as the user progresses through the flow.
 *
 * Hidden on mobile/tablet (<lg). Desktop only.
 */
export function AuthHeroPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 shrink-0 flex-col justify-between bg-gradient-to-br from-red-50 via-white to-orange-50 p-8 xl:p-10">
      <Logo size="md" />
      <div className="max-w-sm">
        <h2 className="text-3xl xl:text-4xl font-bold leading-tight text-foreground">
          Empowering influencers.
          <br />
          <span className="text-primary">Creating impact.</span>
        </h2>
        <div className="mt-4 h-1 w-10 bg-primary" />
        <p className="mt-5 text-sm xl:text-base text-muted-foreground">
          Manage your collaborations, invoices and payments — all in one place.
        </p>
      </div>
      <div className="flex items-end justify-center">
        <div className="h-40 w-56 rounded-2xl bg-gradient-to-t from-red-100/60 to-transparent" />
      </div>
    </div>
  );
}
