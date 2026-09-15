"use client";

import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUpload, type FileUploadFile } from "@/components/ui/file-upload";
import { useOnboarding } from "../context";

export function StepGst() {
  const { state, update, nextStep, prevStep } = useOnboarding();
  const [applicable, setApplicable] = useState(state.gstApplicable);
  const [gstin, setGstin] = useState(state.gstin);
  const [gstFile, setGstFile] = useState<FileUploadFile | null>(
    state.gstFile ? { file: state.gstFile, progress: 100 } : null,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync local state to context on unmount
  const localRef = React.useRef({ applicable, gstin, gstFile });
  localRef.current = { applicable, gstin, gstFile };
  React.useEffect(() => {
    return () => {
      const v = localRef.current;
      update({
        gstApplicable: v.applicable,
        gstin: v.applicable ? v.gstin : "",
        gstFile: v.applicable ? v.gstFile?.file ?? null : null,
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleContinue() {
    if (applicable) {
      const errs: Record<string, string> = {};
      if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]{2}$/.test(gstin.toUpperCase())) {
        errs.gstin = "Enter a valid 15-character GSTIN.";
      }
      if (Object.keys(errs).length) { setErrors(errs); return; }
    }
    update({
      gstApplicable: applicable,
      gstin: applicable ? gstin.toUpperCase() : "",
      gstFile: applicable ? gstFile?.file ?? null : null,
    });
    nextStep();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">GST Registration</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          If you&apos;re GST-registered, provide your GSTIN for invoice compliance.
          Verification will be performed during the review process.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Are you GST registered?</p>
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
            <label htmlFor="gstin" className="text-sm font-medium">GSTIN</label>
            <Input id="gstin" placeholder="e.g. 27ABCDE1234F1Z5" value={gstin}
              onChange={(e) => {
                setGstin(e.target.value.toUpperCase().slice(0, 15));
                if (errors.gstin) setErrors((p) => ({ ...p, gstin: "" }));
              }} error={errors.gstin} maxLength={15} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              GST Certificate <span className="text-muted-foreground">(optional)</span>
            </label>
            <FileUpload id="gst-upload" value={gstFile} onChange={setGstFile} accept=".pdf,.jpg,.jpeg,.png" />
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
