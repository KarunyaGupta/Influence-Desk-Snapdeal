"use client";

import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUpload, type FileUploadFile } from "@/components/ui/file-upload";
import { useOnboarding } from "../context";

export function StepMsme() {
  const { state, update, nextStep, prevStep } = useOnboarding();
  const [applicable, setApplicable] = useState(state.msmeApplicable);
  const [regNumber, setRegNumber] = useState(state.msmeRegistrationNumber);
  const [msmeFile, setMsmeFile] = useState<FileUploadFile | null>(
    state.msmeFile ? { file: state.msmeFile, progress: 100 } : null,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync local state to context on unmount
  const localRef = React.useRef({ applicable, regNumber, msmeFile });
  localRef.current = { applicable, regNumber, msmeFile };
  React.useEffect(() => {
    return () => {
      const v = localRef.current;
      update({
        msmeApplicable: v.applicable,
        msmeRegistrationNumber: v.applicable ? v.regNumber : "",
        msmeFile: v.applicable ? v.msmeFile?.file ?? null : null,
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleContinue() {
    if (applicable) {
      const errs: Record<string, string> = {};
      if (!regNumber.trim()) errs.reg = "MSME/Udyam registration number is required.";
      if (Object.keys(errs).length) { setErrors(errs); return; }
    }
    update({
      msmeApplicable: applicable,
      msmeRegistrationNumber: applicable ? regNumber.trim() : "",
      msmeFile: applicable ? msmeFile?.file ?? null : null,
    });
    nextStep();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">MSME Registration</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          If you have a Udyam/MSME registration, provide the details for
          priority payment processing. Verification will be performed during
          the review process.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Do you have an MSME/Udyam registration?</p>
        <div className="flex gap-3">
          <button type="button" onClick={() => setApplicable(true)}
            className={`flex min-h-[44px] items-center gap-2 rounded-md border-2 px-4 py-2 text-sm font-medium transition-colors ${applicable ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:bg-accent"}`}>
            {applicable && <CheckCircle2 className="h-4 w-4" />} Yes
          </button>
          <button type="button" onClick={() => { setApplicable(false); setErrors({}); }}
            className={`flex min-h-[44px] items-center gap-2 rounded-md border-2 px-4 py-2 text-sm font-medium transition-colors ${!applicable ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:bg-accent"}`}>
            {!applicable && <CheckCircle2 className="h-4 w-4" />} No
          </button>
        </div>
      </div>

      {applicable && (
        <div className="space-y-4 animate-in slide-in-from-top-2">
          <div className="space-y-1.5">
            <label htmlFor="msme-reg" className="text-sm font-medium">Udyam Registration Number</label>
            <Input id="msme-reg" placeholder="e.g. UDYAM-XX-00-0001234" value={regNumber}
              onChange={(e) => {
                setRegNumber(e.target.value);
                if (errors.reg) setErrors((p) => ({ ...p, reg: "" }));
              }} error={errors.reg} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              MSME Certificate <span className="text-muted-foreground">(optional)</span>
            </label>
            <FileUpload id="msme-upload" value={msmeFile} onChange={setMsmeFile} accept=".pdf,.jpg,.jpeg,.png" />
          </div>
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-border bg-card px-4 py-4 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:pt-4">
        <Button variant="outline" onClick={prevStep}>Back</Button>
        <Button className="flex-1 md:flex-none" onClick={handleContinue}>Continue</Button>
      </div>
    </div>
  );
}
