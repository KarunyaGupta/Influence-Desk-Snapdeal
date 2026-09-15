"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import type { AddressDetails, GstDetails, MsmeDetails, VerificationStatus } from "@/lib/types";

/* ─── STEP DEFINITIONS ────────────────────────────────────────────────────── */

export const STEPS = [
  { id: "contact", label: "Contact" },
  { id: "pan", label: "PAN" },
  { id: "bank", label: "Bank" },
  { id: "address", label: "Address" },
  { id: "social", label: "Social" },
  { id: "gst", label: "GST" },
  { id: "msme", label: "MSME" },
  { id: "review", label: "Review" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

/* ─── STATE SHAPE ─────────────────────────────────────────────────────────── */

export interface OnboardingState {
  currentStep: number;
  highestStepReached: number;
  completed: boolean;
  influencerId: string | null;

  // Step 1 — Contact & Account
  mobile: string;
  mobileVerified: boolean;
  email: string;
  emailVerified: boolean;
  password: string;
  confirmPassword: string;

  // Step 2 — PAN
  panNumber: string;
  nameOnPan: string;
  panFile: File | null;
  panVerificationStatus: VerificationStatus | "verifying" | null;
  panNameMatches: boolean | null;

  // Step 3 — Bank
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifsc: string;
  bankName: string;
  chequeFile: File | null;
  ifscValid: boolean | null;
  bankVerificationStatus: VerificationStatus | "verifying" | null;

  // Step 4 — Address
  address: AddressDetails;

  // Step 5 — Social Details
  youtubeUrl: string;
  instagramUrl: string;
  contentLanguage: string;

  // Step 6 — GST
  gstApplicable: boolean;
  gstin: string;
  gstFile: File | null;

  // Step 7 — MSME
  msmeApplicable: boolean;
  msmeRegistrationNumber: string;
  msmeFile: File | null;

  // Step 8 — Review
  termsAccepted: boolean;
}

const initialState: OnboardingState = {
  currentStep: 0,
  highestStepReached: 0,
  completed: false,
  influencerId: null,
  mobile: "",
  mobileVerified: true,
  email: "",
  emailVerified: false,
  password: "",
  confirmPassword: "",
  panNumber: "",
  nameOnPan: "",
  panFile: null,
  panVerificationStatus: null,
  panNameMatches: null,
  accountHolderName: "",
  accountNumber: "",
  confirmAccountNumber: "",
  ifsc: "",
  bankName: "",
  chequeFile: null,
  ifscValid: null,
  bankVerificationStatus: null,
  address: { line1: "", line2: "", city: "", state: "", pincode: "", country: "India" },
  youtubeUrl: "",
  instagramUrl: "",
  contentLanguage: "",
  gstApplicable: false,
  gstin: "",
  gstFile: null,
  msmeApplicable: false,
  msmeRegistrationNumber: "",
  msmeFile: null,
  termsAccepted: false,
};

/* ─── ACTIONS ─────────────────────────────────────────────────────────────── */

type Action =
  | { type: "SET_STEP"; step: number }
  | { type: "UPDATE"; payload: Partial<OnboardingState> }
  | { type: "COMPLETE"; influencerId: string }
  | { type: "RESET" };

function reducer(state: OnboardingState, action: Action): OnboardingState {
  switch (action.type) {
    case "SET_STEP":
      return {
        ...state,
        currentStep: action.step,
        highestStepReached: Math.max(state.highestStepReached, action.step),
      };
    case "UPDATE":
      return { ...state, ...action.payload };
    case "COMPLETE":
      return { ...state, completed: true, influencerId: action.influencerId };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

/* ─── CONTEXT ─────────────────────────────────────────────────────────────── */

interface OnboardingContextValue {
  state: OnboardingState;
  update: (payload: Partial<OnboardingState>) => void;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  complete: (influencerId: string) => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const update = useCallback(
    (payload: Partial<OnboardingState>) => dispatch({ type: "UPDATE", payload }),
    [],
  );
  const goToStep = useCallback(
    (step: number) => dispatch({ type: "SET_STEP", step }),
    [],
  );
  const nextStep = useCallback(
    () => dispatch({ type: "SET_STEP", step: Math.min(state.currentStep + 1, STEPS.length - 1) }),
    [state.currentStep],
  );
  const prevStep = useCallback(
    () => dispatch({ type: "SET_STEP", step: Math.max(state.currentStep - 1, 0) }),
    [state.currentStep],
  );
  const complete = useCallback(
    (influencerId: string) => dispatch({ type: "COMPLETE", influencerId }),
    [],
  );

  return (
    <OnboardingContext.Provider value={{ state, update, goToStep, nextStep, prevStep, complete }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be within <OnboardingProvider>");
  return ctx;
}
