"use client";

import React, { useState } from "react";
import { CheckCircle2, Phone, Mail, Eye, EyeOff, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOnboarding } from "../context";
import { useSession } from "@/components/providers";

/* ─── Password complexity rules ──────────────────────────────────────────── */

const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { id: "number", label: "One number", test: (v: string) => /\d/.test(v) },
  { id: "special", label: "One special character", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

function allRulesPass(pw: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(pw));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function StepContact() {
  const { state, update, nextStep } = useOnboarding();
  const { session } = useSession();

  const mobile = session?.user.mobile || state.mobile;

  const [email, setEmail] = useState(state.email || session?.user.email || "");
  const [emailError, setEmailError] = useState("");

  const [password, setPassword] = useState(state.password || "");
  const [confirmPassword, setConfirmPassword] = useState(state.confirmPassword || "");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  // Sync local state to context on unmount
  const localRef = React.useRef({ email, password, confirmPassword, mobile });
  localRef.current = { email, password, confirmPassword, mobile };
  React.useEffect(() => {
    return () => {
      const v = localRef.current;
      update({
        email: v.email,
        emailVerified: EMAIL_RE.test(v.email),
        password: v.password,
        confirmPassword: v.confirmPassword,
        mobile: v.mobile || "",
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emailValid = EMAIL_RE.test(email);
  const passwordValid = allRulesPass(password);
  const confirmValid = password === confirmPassword && confirmPassword.length > 0;
  const canContinue = emailValid && passwordValid && confirmValid;

  function handleContinue() {
    if (!emailValid) {
      setEmailError("Enter a valid email address.");
      return;
    }
    update({
      email,
      emailVerified: true,
      password,
      confirmPassword,
      mobile: mobile || "",
    });
    nextStep();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Contact & Account Setup</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirm your mobile, provide your email, and create a password.
        </p>
      </div>

      {/* ─── Mobile — read only, pre-verified ─── */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Mobile Number</label>
        <div className="flex items-center gap-2">
          <div className="flex h-11 min-h-[44px] flex-1 items-center rounded-md border border-input bg-muted px-3 text-sm">
            <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
            +91 {mobile}
          </div>
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Verified
          </span>
        </div>
      </div>

      {/* ─── Email — plain required field ─── */}
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email Address
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError("");
            }}
            className="pl-9"
            error={emailError || undefined}
          />
        </div>
        {email && !emailValid && !emailError && (
          <p className="text-xs text-muted-foreground">Enter a valid email address.</p>
        )}
      </div>

      {/* ─── Create Password ─── */}
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Create Password
        </label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

        {/* Live password checklist */}
        {password.length > 0 && (
          <ul className="mt-2 space-y-1">
            {PASSWORD_RULES.map((rule) => {
              const passes = rule.test(password);
              return (
                <li key={rule.id} className="flex items-center gap-2 text-xs">
                  {passes ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className={passes ? "text-emerald-600" : "text-muted-foreground"}>
                    {rule.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ─── Confirm Password ─── */}
      <div className="space-y-1.5">
        <label htmlFor="confirm-password" className="text-sm font-medium">
          Confirm Password
        </label>
        <div className="relative">
          <Input
            id="confirm-password"
            type={showConfirm ? "text" : "password"}
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (!confirmTouched) setConfirmTouched(true);
            }}
            className="pr-10"
            error={
              confirmTouched && confirmPassword.length > 0 && !confirmValid
                ? "Passwords do not match."
                : undefined
            }
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showConfirm ? "Hide password" : "Show password"}
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {confirmTouched && confirmPassword.length > 0 && confirmValid && (
          <p className="flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> Passwords match
          </p>
        )}
      </div>

      {/* ─── Continue ─── */}
      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-border bg-card px-4 py-4 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:pt-4">
        <Button
          className="flex-1 md:flex-none"
          onClick={handleContinue}
          disabled={!canContinue}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
