"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { User, ShieldCheck, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { AuthHeroPanel } from "@/components/layout/auth-hero-panel";
import { ENABLE_ROLE_SWITCHER } from "@/lib/config/env";
import { useServices, useSession } from "@/components/providers";
import { ROLE_HOME } from "@/lib/auth/rbac";

export default function LoginPage() {
  const router = useRouter();
  const { auth, onboarding } = useServices();
  const { refresh } = useSession();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState(() => {
    // Check for password reset success message
    if (typeof window !== "undefined") {
      const msg = sessionStorage.getItem("sih_login_success");
      if (msg) { sessionStorage.removeItem("sih_login_success"); return msg; }
    }
    return "";
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const trimmed = identifier.trim();
    if (!trimmed) {
      setError("Please enter your mobile number or email.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const session = await auth.loginWithPassword(trimmed, password);
      await refresh();

      // Route based on role and influencer status
      if (session.user.role !== "influencer") {
        router.push(ROLE_HOME[session.user.role]);
        return;
      }

      // For influencers, check onboarding status
      try {
        const draft = await onboarding.getCurrentDraft();
        if (draft && draft.onboardingStatus === "active") {
          router.push("/influencer");
        } else {
          // Pending/submitted — go to onboarding which shows status screen
          router.push("/onboarding");
        }
      } catch {
        router.push("/onboarding");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed.";
      setError(msg);
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
            <a href="#" className="font-medium text-primary hover:underline" onClick={(e) => e.preventDefault()}>
              Contact Support
            </a>
          </span>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 pb-8">
          <div className="w-full max-w-sm space-y-8">
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Welcome to
                  <br />
                  Snapdeal <span className="italic">Influencer Hub</span>
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter your mobile number or email and password to sign in.
                </p>
              </div>
            </div>

            {successMessage && (
              <Alert variant="success">{successMessage}</Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="identifier" className="text-sm font-medium">
                  Mobile Number or Email
                </label>
                <Input
                  id="identifier"
                  placeholder="Enter mobile number or email"
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); if (error) setError(""); }}
                  autoFocus
                  autoComplete="username"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => router.push("/login/forgot-password")}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
                    className="pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <Alert variant="error">{error}</Alert>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Log In"}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/login/signup")}
                  className="font-medium text-primary hover:underline"
                >
                  Sign Up
                </button>
              </p>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your data is encrypted and never shared with third parties.
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
                Dev: Use 9876543210 / Aisha@1234, or 9123456780 / Vikram@1234. For BM/FM/Admin, use the role switcher.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
