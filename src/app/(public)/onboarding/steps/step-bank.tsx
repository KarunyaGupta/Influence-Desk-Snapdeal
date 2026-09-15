"use client";

import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUpload, type FileUploadFile } from "@/components/ui/file-upload";
import { useOnboarding } from "../context";

export function StepBank() {
  const { state, update, nextStep, prevStep } = useOnboarding();

  const [accountHolderName, setAccountHolderName] = useState(state.accountHolderName);
  const [accountNumber, setAccountNumber] = useState(state.accountNumber);
  const [ifsc, setIfsc] = useState(state.ifsc);
  const [bankName, setBankName] = useState(state.bankName);
  const [chequeFile, setChequeFile] = useState<FileUploadFile | null>(
    state.chequeFile ? { file: state.chequeFile, progress: 100 } : null,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync local state to context on unmount
  const localRef = React.useRef({ accountHolderName, accountNumber, ifsc, bankName, chequeFile });
  localRef.current = { accountHolderName, accountNumber, ifsc, bankName, chequeFile };
  React.useEffect(() => {
    return () => {
      const v = localRef.current;
      update({
        accountHolderName: v.accountHolderName,
        accountNumber: v.accountNumber,
        confirmAccountNumber: v.accountNumber,
        ifsc: v.ifsc,
        bankName: v.bankName,
        chequeFile: v.chequeFile?.file ?? null,
        ifscValid: null,
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleContinue() {
    const errs: Record<string, string> = {};
    if (!accountHolderName.trim()) errs.holder = "Account holder name is required.";
    if (!accountNumber.trim()) errs.account = "Account number is required.";
    else if (accountNumber.length < 8) errs.account = "Account number must be at least 8 digits.";
    if (!ifsc.trim()) errs.ifsc = "IFSC code is required.";
    else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase())) {
      errs.ifsc = "IFSC must be in format AAAA0XXXXXX (11 characters).";
    }
    if (!bankName.trim()) errs.bank = "Bank name is required.";
    if (!chequeFile) errs.cheque = "Please upload a cancelled cheque.";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    update({
      accountHolderName: accountHolderName.trim(),
      accountNumber,
      confirmAccountNumber: accountNumber,
      ifsc: ifsc.toUpperCase(),
      bankName: bankName.trim(),
      chequeFile: chequeFile?.file ?? null,
      // Default to "pending" — real IFSC verification will be wired in Phase 2
      ifscValid: null,
      bankVerificationStatus: "pending",
    });
    nextStep();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Bank Details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This account will receive all invoice payments. Ensure details match
          your bank records exactly.
        </p>
      </div>

      {/* Account Holder Name */}
      <div className="space-y-1.5">
        <label htmlFor="holder" className="text-sm font-medium">Account Holder Name</label>
        <Input
          id="holder"
          placeholder="Name as per bank records"
          value={accountHolderName}
          onChange={(e) => { setAccountHolderName(e.target.value); setErrors((p) => ({ ...p, holder: "" })); }}
          error={errors.holder}
        />
      </div>

      {/* Account Number */}
      <div className="space-y-1.5">
        <label htmlFor="account" className="text-sm font-medium">Account Number</label>
        <Input
          id="account"
          inputMode="numeric"
          placeholder="Enter account number"
          value={accountNumber}
          onChange={(e) => { setAccountNumber(e.target.value.replace(/\D/g, "")); setErrors((p) => ({ ...p, account: "" })); }}
          error={errors.account}
          autoComplete="off"
        />
      </div>

      {/* IFSC Code — plain input, no validate button */}
      <div className="space-y-1.5">
        <label htmlFor="ifsc" className="text-sm font-medium">IFSC Code</label>
        <Input
          id="ifsc"
          placeholder="e.g. HDFC0001234"
          value={ifsc}
          onChange={(e) => {
            setIfsc(e.target.value.toUpperCase().slice(0, 11));
            setErrors((p) => ({ ...p, ifsc: "" }));
          }}
          error={errors.ifsc}
          maxLength={11}
        />
      </div>

      {/* Bank Name — manual entry */}
      <div className="space-y-1.5">
        <label htmlFor="bank-name" className="text-sm font-medium">Bank Name</label>
        <Input
          id="bank-name"
          placeholder="e.g. HDFC Bank"
          value={bankName}
          onChange={(e) => { setBankName(e.target.value); setErrors((p) => ({ ...p, bank: "" })); }}
          error={errors.bank}
        />
      </div>

      {/* Currency — locked read-only */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Currency</label>
        <div className="flex h-11 min-h-[44px] items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
          INR
        </div>
      </div>

      {/* Cancelled Cheque */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Cancelled Cheque</label>
        <FileUpload
          id="cheque-upload"
          value={chequeFile}
          onChange={setChequeFile}
          accept=".pdf,.jpg,.jpeg,.png"
          error={errors.cheque}
        />
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Your bank details are encrypted and stored securely. They are only
          used for payment processing and are never shared with third parties.
        </p>
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-border bg-card px-4 py-4 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:pt-4">
        <Button variant="outline" onClick={prevStep}>Back</Button>
        <Button className="flex-1 md:flex-none" onClick={handleContinue}>Continue</Button>
      </div>
    </div>
  );
}
