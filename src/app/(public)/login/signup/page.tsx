"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { AuthHeroPanel } from "@/components/layout/auth-hero-panel";
import { ENABLE_ROLE_SWITCHER } from "@/lib/config/env";
import { useServices } from "@/components/providers";

export default function SignupPage() {
  const router = useRouter();
  const { auth } = useServices();

  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const cleaned = mobile.replace(/\s/g, "");
    if (!/^\d{10}$/.test(cleaned)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    try {
      // Check if account already exists
      const check = await auth.checkMobileExists(cleaned);
      if (check.exists && check.isOnboarded) {
        setError("An account with this number already exists. Please log in instead.");
        setLoading(false);
        return;
      }

      // Request OTP for mobile verification
      const challenge = await auth.requestMobileOtp(cleaned);
      sessionStorage.setItem(
        "sih_otp_challenge",
        JSON.stringify({ ...challenge, mobile: cleaned, intent: "signup" }),
      );
      router.push("/login/verify");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <AuthHeroPanel />

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end px-6 py-4">
          <span className="text-sm text-muted-foreground">
            Need help?{" "}
            <a href="#" className="font-medium text-primary hover:underline" onClick={(e2) => e2.preventDefault()}>
              Contact Support
            </a>
          </span>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 pb-8">
          <div className="w-full max-w-sm space-y-8">
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <UserPlus className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Create Your Account
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter your mobile number to get started. We&apos;ll send a
                  verification code to confirm your identity.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="mobile" className="text-sm font-medium">Mobile Number</label>
                <div className="flex gap-2">
                  <div className="flex h-11 min-h-[44px] w-14 items-center justify-center rounded-md border border-input bg-muted text-sm text-muted-foreground">+91</div>
                  <Input
                    id="mobile"
                    type="tel"
                    inputMode="numeric"
                    placeholder="Enter mobile number"
                    value={mobile}
                    onChange={(e) => { setMobile(e.target.value.replace(/\D/g, "").slice(0, 10)); if (error) setError(""); }}
                    autoFocus
                    autoComplete="tel"
                  />
                </div>
              </div>

              {error && <Alert variant="error">{error}</Alert>}

              <Button type="submit" className="w-full" disabled={loading || mobile.length < 10}>
                {loading ? "Sending OTP..." : "Continue"}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="font-medium text-primary hover:underline"
                >
                  Log In
                </button>
              </p>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                We&apos;ll send a one-time verification code to this number. After
                verification, you&apos;ll complete your profile and set a password
                during onboarding.
              </p>
            </div>

            <div className="flex flex-col items-center gap-2 pt-2">
              <div className="h-px w-full bg-border" />
              <div className="flex items-center gap-1.5 pt-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Secured by industry-standard practices</span>
              </div>
            </div>

            {ENABLE_ROLE_SWITCHER && (
              <p className="text-center text-[10px] text-muted-foreground/60">
                Dev: Enter any 10-digit number for new user. OTP is 123456.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
