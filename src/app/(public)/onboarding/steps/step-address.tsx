"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOnboarding } from "../context";

export function StepAddress() {
  const { state, update, nextStep, prevStep } = useOnboarding();
  const [address, setAddress] = useState(state.address);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync local state to context on unmount
  const localRef = React.useRef({ address });
  localRef.current = { address };
  React.useEffect(() => {
    return () => { update({ address: localRef.current.address }); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(field: keyof typeof address, value: string) {
    setAddress((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function handleContinue() {
    const errs: Record<string, string> = {};
    if (!address.line1.trim()) errs.line1 = "Address line 1 is required.";
    if (!address.city.trim()) errs.city = "City is required.";
    if (!address.state.trim()) errs.state = "State is required.";
    if (!/^\d{6}$/.test(address.pincode)) errs.pincode = "Enter a valid 6-digit PIN code.";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    update({ address });
    nextStep();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Address</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your registered business or correspondence address.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="line1" className="text-sm font-medium">Address Line 1</label>
          <Input
            id="line1"
            placeholder="House/Flat no., Building, Street"
            value={address.line1}
            onChange={(e) => handleChange("line1", e.target.value)}
            error={errors.line1}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="line2" className="text-sm font-medium">
            Address Line 2 <span className="text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="line2"
            placeholder="Landmark, Area"
            value={address.line2}
            onChange={(e) => handleChange("line2", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="city" className="text-sm font-medium">City</label>
            <Input
              id="city"
              placeholder="City"
              value={address.city}
              onChange={(e) => handleChange("city", e.target.value)}
              error={errors.city}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="state" className="text-sm font-medium">State</label>
            <Input
              id="state"
              placeholder="State"
              value={address.state}
              onChange={(e) => handleChange("state", e.target.value)}
              error={errors.state}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="pincode" className="text-sm font-medium">PIN Code</label>
          <Input
            id="pincode"
            inputMode="numeric"
            placeholder="6-digit PIN"
            value={address.pincode}
            onChange={(e) => handleChange("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
            error={errors.pincode}
            maxLength={6}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="country" className="text-sm font-medium">Country</label>
          <Input
            id="country"
            placeholder="Country"
            value={address.country}
            onChange={(e) => handleChange("country", e.target.value)}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-border bg-card px-4 py-4 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:pt-4">
        <Button variant="outline" onClick={prevStep}>Back</Button>
        <Button className="flex-1 md:flex-none" onClick={handleContinue}>Continue</Button>
      </div>
    </div>
  );
}
