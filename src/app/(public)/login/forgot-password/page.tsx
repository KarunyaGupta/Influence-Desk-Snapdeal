"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ArrowLeft, Eye, EyeOff, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { AuthHeroPanel } from "@/components/layout/auth-hero-panel";
import { useServices } from "@/components/providers";
import { ENABLE_ROLE_SWITCHER } from "@/lib/config/env";
import type { OtpChallenge } from "@/lib/services/contracts";

/* ─── Password complexity rules (same as onboarding) ─────────────────────── */

const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { id: "number", label: "One number", test: (v: string) => /\d/.test(v) },
  { id: "special", label: "One special character", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

function allRulesPass(pw: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(pw));
}

type Step = "identifier" | "otp" | "new-password";

const OTP_LENGTH = 6;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { auth } = useServices();

  const [step, setStep] = useState<Step>("identifier");

  // Step 1: identifier
  const [identifier, setIdentifier] = useState("");
  const [identifierError, setIdentifierError] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);

  // Step 2: OTP
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpError, setOtpError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [expiryCountdown, setExpiryCountdown] = useState(0);

  // Step 3: new password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetting, setResetting] = useState(false);

  // Expiry countdown timer
  useEffect(() => {
    if (expiryCountdown <= 0) return;
    const timer = setInterval(() => {
      setExpiryCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [expiryCountdown]);

  // Auto-focus first OTP input
  useEffect(() => {
    if (step === "otp") inputRefs.current[0]?.focus();
  }, [step]);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = identifier.trim();
    if (!trimmed) { setIdentifierError("Please enter your mobile number or email."); return; }
    setIdentifierError("");
    setSendingOtp(true);
    try {
      const ch = await auth.requestPasswordResetOtp(trimmed);
      setChallenge(ch);
      setExpiryCountdown(Math.max(0, Math.ceil((new Date(ch.expiresAt).getTime() - Date.now()) / 1000)));
      setStep("otp");
    } catch (err: unknown) {
      setIdentifierError(err instanceof Error ? err.message : "Failed to send verification code.");
    } finally { setSendingOtp(false); }
  }

  function handleOtpInput(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    if (otpError) setOtpError("");
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    if (digit && index === OTP_LENGTH - 1) {
      const code = newDigits.join("");
      if (code.length === OTP_LENGTH) handleVerifyOtp(code);
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const newDigits = [...digits];
    for (let i = 0; i < OTP_LENGTH; i++) newDigits[i] = pasted[i] || "";
    setDigits(newDigits);
    const lastIdx = Math.min(pasted.length, OTP_LENGTH) - 1;
    inputRefs.current[lastIdx]?.focus();
    if (pasted.length === OTP_LENGTH) handleVerifyOtp(pasted);
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newDigits = [...digits];
      newDigits[index - 1] = "";
      setDigits(newDigits);
    }
  }

  const handleVerifyOtp = useCallback(async (code: string) => {
    // Just move to password step — actual verification happens on reset
    // We store the code to send with the reset call
    setVerifying(true);
    setOtpError("");
    // Validate the code format
    if (code.length !== OTP_LENGTH) { setOtpError("Enter all 6 digits."); setVerifying(false); return; }
    // Move to new-password step (code will be sent with the reset request)
    setVerifying(false);
    setStep("new-password");
  }, []);

  const passwordValid = allRulesPass(newPassword);
  const confirmValid = newPassword === confirmPassword && confirmPassword.length > 0;

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordValid || !confirmValid || !challenge) return;
    setResetError("");
    setResetting(true);
    try {
      await auth.resetPassword(challenge.challengeId, digits.join(""), newPassword);
      // Store success message for login page
      sessionStorage.setItem("sih_login_success", "Password reset successful. Please log in with your new password.");
      router.push("/login");
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : "Password reset failed.");
    } finally { setResetting(false); }
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="flex min-h-screen">
      <AuthHeroPanel />

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between px-6 py-4">
          <button
            onClick={() => step === "identifier" ? router.push("/login") : setStep("identifier")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <span className="text-sm text-muted-foreground">
            Need help?{" "}
            <a href="#" className="font-medium text-primary hover:underline" onClick={(e2) => e2.preventDefault()}>
              Contact Support
            </a>
          </span>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 pb-8">
          <div className="w-full max-w-sm space-y-6">

            {/* ─── Step 1: Enter identifier ─── */}
            {step === "identifier" && (
              <>
                <div className="text-center space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <KeyRound className="h-7 w-7 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight">Reset Password</h1>
                  <p className="text-sm text-muted-foreground">
                    Enter your registered mobile number or email. We&apos;ll send a verification
                    code to confirm your identity.
                  </p>
                </div>

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="reset-id" className="text-sm font-medium">Mobile Number or Email</label>
                    <Input
                      id="reset-id"
                      placeholder="Enter mobile number or email"
                      value={identifier}
                      onChange={(e) => { setIdentifier(e.target.value); if (identifierError) setIdentifierError(""); }}
                      autoFocus
                      error={identifierError || undefined}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={sendingOtp || !identifier.trim()}>
                    {sendingOtp ? "Sending..." : "Send Verification Code"}
                  </Button>
                </form>
              </>
            )}

            {/* ─── Step 2: Enter OTP ─── */}
            {step === "otp" && challenge && (
              <>
                <div className="text-center space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <KeyRound className="h-7 w-7 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight">Verify Identity</h1>
                  <p className="text-sm text-muted-foreground">
                    Enter the 6-digit code sent to{" "}
                    <span className="font-medium text-foreground">{challenge.destinationMasked}</span>
                  </p>
                </div>

                {otpError && <Alert variant="error">{otpError}</Alert>}

                <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                  {digits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      disabled={verifying}
                      onChange={(e) => handleOtpInput(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="h-12 w-11 min-w-[44px] rounded-md border border-input bg-background text-center text-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Digit ${i + 1}`}
                    />
                  ))}
                </div>

                {expiryCountdown > 0 && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Code expires in {formatTime(expiryCountdown)}</span>
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={verifying || digits.join("").length < OTP_LENGTH}
                  onClick={() => handleVerifyOtp(digits.join(""))}
                >
                  {verifying ? "Verifying..." : "Continue"}
                </Button>

                {ENABLE_ROLE_SWITCHER && (
                  <p className="text-center text-[10px] text-muted-foreground/60">
                    Dev: The mock OTP code is <code className="font-mono">123456</code>.
                  </p>
                )}
              </>
            )}

            {/* ─── Step 3: Set new password ─── */}
            {step === "new-password" && (
              <>
                <div className="text-center space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <KeyRound className="h-7 w-7 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight">Set New Password</h1>
                  <p className="text-sm text-muted-foreground">
                    Create a new password for your account.
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="new-pw" className="text-sm font-medium">New Password</label>
                    <div className="relative">
                      <Input
                        id="new-pw"
                        type={showNew ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button type="button" onClick={() => setShowNew((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showNew ? "Hide password" : "Show password"}>
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {newPassword.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {PASSWORD_RULES.map((rule) => {
                          const passes = rule.test(newPassword);
                          return (
                            <li key={rule.id} className="flex items-center gap-2 text-xs">
                              {passes ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-muted-foreground" />}
                              <span className={passes ? "text-emerald-600" : "text-muted-foreground"}>{rule.label}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="confirm-new-pw" className="text-sm font-medium">Confirm New Password</label>
                    <div className="relative">
                      <Input
                        id="confirm-new-pw"
                        type={showConfirm ? "text" : "password"}
                        placeholder="Re-enter your new password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); if (!confirmTouched) setConfirmTouched(true); }}
                        className="pr-10"
                        error={confirmTouched && confirmPassword.length > 0 && !confirmValid ? "Passwords do not match." : undefined}
                      />
                      <button type="button" onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showConfirm ? "Hide password" : "Show password"}>
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {resetError && <Alert variant="error">{resetError}</Alert>}

                  <Button type="submit" className="w-full" disabled={resetting || !passwordValid || !confirmValid}>
                    {resetting ? "Resetting..." : "Reset Password"}
                  </Button>
                </form>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
