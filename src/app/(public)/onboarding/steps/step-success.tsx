"use client";

import React, { useState } from "react";
import { Send, Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { AuthHeroPanel } from "@/components/layout/auth-hero-panel";
import { SPOC } from "@/lib/config/spoc";
import { useServices, useSession } from "@/components/providers";

/**
 * Shown immediately after submitting the onboarding form.
 * The request is now "Pending BM Review" — no Influencer ID yet.
 * Includes an inline login form so the influencer can immediately log in to check status.
 */
export function StepSuccess() {
  const { auth } = useServices();
  const { refresh } = useSession();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginId.trim() || !password.trim()) {
      setError("Please enter your mobile number or email and password.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const session = await auth.loginWithPassword(loginId.trim(), password);
      await refresh();

      if (session.user.role === "influencer") {
        // Force full page reload to reset onboarding context state
        window.location.href = "/onboarding";
      } else {
        window.location.href = "/login";
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <AuthHeroPanel />

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Success message */}
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Send className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold">Application Submitted</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your onboarding application has been submitted and is now under review.
              You can log in to the portal anytime using your mobile number or email
              and the password you created to check your onboarding status.
            </p>
          </div>

          {/* What happens next */}
          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What happens next
            </p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Your application will be reviewed for approval</li>
              <li>Your identity and payout details will be verified</li>
              <li>Once approved, you&apos;ll receive your Influencer ID and can start submitting invoices</li>
            </ol>
          </div>

          {/* SPOC details */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Need help?
            </p>
            <p className="text-sm text-muted-foreground">
              Contact: <span className="font-medium text-foreground">{SPOC.name}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Phone: <span className="font-medium text-foreground">{SPOC.phone}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Email: <span className="font-medium text-foreground">{SPOC.email}</span>
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">Log in to check status</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Inline login form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-id" className="text-sm font-medium">
                Mobile Number or Email
              </label>
              <Input
                id="login-id"
                placeholder="Enter mobile number or email"
                value={loginId}
                onChange={(e) => { setLoginId(e.target.value); if (error) setError(""); }}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
                  className="pr-10"
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
              <LogIn className="h-4 w-4" />
              {loading ? "Logging in..." : "Log In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
