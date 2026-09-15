"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUpload, type FileUploadFile } from "@/components/ui/file-upload";
import { useOnboarding } from "../context";

export function StepPan() {
  const { state, update, nextStep, prevStep } = useOnboarding();

  const [nameOnPan, setNameOnPan] = useState(state.nameOnPan);
  const [panNumber, setPanNumber] = useState(state.panNumber);
  const [panFile, setPanFile] = useState<FileUploadFile | null>(
    state.panFile ? { file: state.panFile, progress: 100 } : null,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync local state to context on unmount
  const localRef = React.useRef({ panNumber, nameOnPan, panFile });
  localRef.current = { panNumber, nameOnPan, panFile };
  React.useEffect(() => {
    return () => {
      const v = localRef.current;
      update({
        panNumber: v.panNumber,
        nameOnPan: v.nameOnPan,
        panFile: v.panFile?.file ?? null,
        panVerificationStatus: "pending",
        panNameMatches: null,
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleContinue() {
    const errs: Record<string, string> = {};
    if (!nameOnPan.trim()) errs.name = "Name on PAN is required.";
    if (!panNumber.trim()) errs.pan = "PAN number is required.";
    else if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(panNumber.toUpperCase())) {
      errs.pan = "PAN must be in format AAAAA9999A";
    }
    if (!panFile) errs.file = "Please upload a copy of your PAN card.";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    update({
      panNumber: panNumber.toUpperCase(),
      nameOnPan: nameOnPan.trim(),
      panFile: panFile?.file ?? null,
      // Default to "pending" — real verification will be wired in Phase 2
      panVerificationStatus: "pending",
      panNameMatches: null,
    });
    nextStep();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">PAN Details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your PAN is used for tax compliance. Verification will be performed
          during the review process.
        </p>
      </div>

      {/* Name on PAN — comes first */}
      <div className="space-y-1.5">
        <label htmlFor="name-pan" className="text-sm font-medium">
          Name as on PAN
        </label>
        <Input
          id="name-pan"
          placeholder="Full name exactly as printed on PAN"
          value={nameOnPan}
          onChange={(e) => {
            setNameOnPan(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
          }}
          error={errors.name}
        />
      </div>

      {/* PAN Number — comes second */}
      <div className="space-y-1.5">
        <label htmlFor="pan" className="text-sm font-medium">
          PAN Number
        </label>
        <Input
          id="pan"
          placeholder="ABCDE1234F"
          value={panNumber}
          onChange={(e) => {
            setPanNumber(e.target.value.toUpperCase().slice(0, 10));
            if (errors.pan) setErrors((prev) => ({ ...prev, pan: "" }));
          }}
          error={errors.pan}
          maxLength={10}
        />
      </div>

      {/* Upload PAN copy */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Upload PAN Copy</label>
        <FileUpload
          id="pan-upload"
          value={panFile}
          onChange={setPanFile}
          accept=".pdf,.jpg,.jpeg,.png"
          error={errors.file}
        />
        <p className="text-xs text-muted-foreground">
          Your document is encrypted at rest and only accessible to authorized
          personnel.
        </p>
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-border bg-card px-4 py-4 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:pt-4">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button className="flex-1 md:flex-none" onClick={handleContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
