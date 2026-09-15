"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { AuthHeroPanel } from "@/components/layout/auth-hero-panel";
import { useServices, useSession } from "@/components/providers";
import { ROLE_HOME } from "@/lib/auth/rbac";
import type { OtpChallenge } from "@/lib/services/contracts";

const OTP_LENGTH = 6;

interface StoredChallenge extends OtpChallenge {
  mobile: string;
  intent?: "login" | "signup";
}

export default function VerifyOtpPage() {
  const router = useRouter();
  const { auth, onboarding } = useServices();
  const { refresh } = useSession();

  // OTP input state
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Challenge state
  const [challenge, setChallenge] = useState<StoredChallenge | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);

  // Timer states
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiryCountdown, setExpiryCountdown] = useState(0);
  const [resending, setResending] = useState(false);

  // Load challenge from session storage
  useEffect(() => {
    const stored = sessionStorage.getItem("sih_otp_challenge");
    if (!stored) {
      router.replace("/login");
      return;
    }
    const parsed: StoredChallenge = JSON.parse(stored);
    setChallenge(parsed);
    setAttemptsRemaining(parsed.attemptsRemaining);

    // Calculate initial countdowns
    const now = Date.now();
    const resendAvail = new Date(parsed.resendAvailableAt).getTime();
    const expiry = new Date(parsed.expiresAt).getTime();
    setResendCooldown(Math.max(0, Math.ceil((resendAvail - now) / 1000)));
    setExpiryCountdown(Math.max(0, Math.ceil((expiry - now) / 1000)));
  }, [router]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Expiry countdown timer
  useEffect(() => {
    if (expiryCountdown <= 0) return;
    const timer = setInterval(() => {
      setExpiryCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [expiryCountdown]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, [challenge]);

  // Handle digit input
  function handleInput(index: number, value: string) {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    if (error) {
      setError("");
      setErrorCode("");
    }

    // Auto-advance to next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all digits filled
    if (digit && index === OTP_LENGTH - 1) {
      const code = newDigits.join("");
      if (code.length === OTP_LENGTH) {
        handleVerify(code);
      }
    }
  }

  // Handle paste
  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < OTP_LENGTH; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setDigits(newDigits);

    // Focus last filled or the next empty
    const lastIdx = Math.min(pasted.length, OTP_LENGTH) - 1;
    inputRefs.current[lastIdx]?.focus();

    // Auto-submit if complete
    if (pasted.length === OTP_LENGTH) {
      handleVerify(pasted);
    }
  }

  // Handle backspace
  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newDigits = [...digits];
      newDigits[index - 1] = "";
      setDigits(newDigits);
    }
  }

  // Verify OTP
  const handleVerify = useCallback(
    async (code: string) => {
      if (!challenge) return;
      setLoading(true);
      setError("");
      setErrorCode("");

      try {
        const session = await auth.verifyMobileOtp(challenge.challengeId, code);
        await refresh();

        // Determine post-login route
        if (session.user.role !== "influencer") {
          router.push(ROLE_HOME[session.user.role]);
          return;
        }

        // Check onboarding status for influencers
        try {
          const draft = await onboarding.getCurrentDraft();
          if (draft && draft.onboardingStatus === "active") {
            router.push("/influencer");
          } else {
            router.push("/onboarding");
          }
        } catch {
          // No draft found — new user, go to onboarding
          router.push("/onboarding");
        }
      } catch (err: unknown) {
        const svcErr = err as { code?: string; message?: string };
        const code2 = svcErr.code ?? "";
        const msg = svcErr.message ?? "Verification failed.";

        setErrorCode(code2);

        if (code2 === "OTP_LOCKED") {
          setError(msg);
          setAttemptsRemaining(0);
        } else if (code2 === "OTP_EXPIRED") {
          setError("This OTP has expired. Please request a new one.");
        } else if (code2 === "OTP_INVALID") {
          setAttemptsRemaining((prev) => Math.max(0, prev - 1));
          setError(msg);
        } else {
          setError(msg);
        }

        // Clear input on error
        setDigits(Array(OTP_LENGTH).fill(""));
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } finally {
        setLoading(false);
      }
    },
    [auth, challenge, onboarding, refresh, router],
  );

  // Resend OTP
  async function handleResend() {
    if (!challenge || resendCooldown > 0) return;
    setResending(true);
    setError("");
    setErrorCode("");

    try {
      const newChallenge = await auth.requestMobileOtp(challenge.mobile);
      const updated: StoredChallenge = { ...newChallenge, mobile: challenge.mobile };
      setChallenge(updated);
      setAttemptsRemaining(newChallenge.attemptsRemaining);
      sessionStorage.setItem("sih_otp_challenge", JSON.stringify(updated));

      // Reset timers
      const now = Date.now();
      setResendCooldown(
        Math.max(0, Math.ceil((new Date(newChallenge.resendAvailableAt).getTime() - now) / 1000)),
      );
      setExpiryCountdown(
        Math.max(0, Math.ceil((new Date(newChallenge.expiresAt).getTime() - now) / 1000)),
      );

      // Clear & refocus
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not resend OTP.";
      setError(msg);
    } finally {
      setResending(false);
    }
  }

  // Change number
  function handleChangeNumber() {
    sessionStorage.removeItem("sih_otp_challenge");
    router.push("/login");
  }

  if (!challenge) return null;

  const isLocked = errorCode === "OTP_LOCKED" || attemptsRemaining <= 0;
  const isExpired = errorCode === "OTP_EXPIRED" || expiryCountdown <= 0;

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="flex min-h-screen">
      {/* ─── Left Hero Panel ──────────────────────────────────── */}
      <AuthHeroPanel />

      {/* ─── Right Form Panel ───────────────────────────────────── */}
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
          <div className="w-full max-w-sm space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Verify OTP</h1>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code sent to{" "}
          <span className="font-medium text-foreground">
            +91 {challenge.destinationMasked}
          </span>
        </p>
      </div>

      {/* Locked state */}
      {isLocked && (
        <Alert variant="error" title="Account Locked">
          Too many failed attempts. Your account has been temporarily locked.
          Please try again after 15 minutes or contact support.
        </Alert>
      )}

      {/* Expired state */}
      {isExpired && !isLocked && (
        <Alert variant="warning" title="OTP Expired">
          This verification code has expired. Please request a new one.
        </Alert>
      )}

      {/* Attempt warning */}
      {!isLocked && !isExpired && attemptsRemaining === 1 && error && (
        <Alert variant="warning" title="Last Attempt">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            You have 1 attempt remaining. Your account will be locked after the
            next failure.
          </span>
        </Alert>
      )}

      {/* Invalid OTP error (not last attempt) */}
      {!isLocked && !isExpired && error && attemptsRemaining > 1 && errorCode === "OTP_INVALID" && (
        <Alert variant="error">
          Incorrect code. {attemptsRemaining} attempt{attemptsRemaining > 1 ? "s" : ""} remaining.
        </Alert>
      )}

      {/* Generic errors */}
      {error && errorCode !== "OTP_INVALID" && errorCode !== "OTP_LOCKED" && errorCode !== "OTP_EXPIRED" && !isLocked && !isExpired && (
        <Alert variant="error">{error}</Alert>
      )}

      {/* OTP Input boxes */}
      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            disabled={isLocked || loading}
            onChange={(e) => handleInput(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="h-12 w-11 min-w-[44px] rounded-md border border-input bg-background text-center text-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>

      {/* Expiry timer */}
      {!isExpired && !isLocked && expiryCountdown > 0 && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>Code expires in {formatTime(expiryCountdown)}</span>
        </div>
      )}

      {/* Verify button (manual trigger if auto-submit didn't fire) */}
      <Button
        className="w-full"
        disabled={
          isLocked || loading || digits.join("").length < OTP_LENGTH
        }
        onClick={() => handleVerify(digits.join(""))}
      >
        {loading ? "Verifying..." : "Verify"}
      </Button>

      {/* Resend + Change number */}
      <div className="flex items-center justify-between text-sm">
        <button
          onClick={handleResend}
          disabled={resendCooldown > 0 || resending || isLocked}
          className="text-primary font-medium disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm min-h-[44px] flex items-center"
        >
          {resending
            ? "Sending..."
            : resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : "Resend Code"}
        </button>
        <button
          onClick={handleChangeNumber}
          className="text-muted-foreground transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm min-h-[44px] flex items-center"
        >
          Change number
        </button>
      </div>

      {/* Dev hint */}
      <p className="text-center text-[10px] text-muted-foreground/60">
        Dev: The mock OTP code is <code className="font-mono">123456</code>.
        Enter any wrong code to test error states.
      </p>
          </div>
        </div>
      </div>
    </div>
  );
}
