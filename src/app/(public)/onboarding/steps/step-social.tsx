"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useOnboarding } from "../context";

const LANGUAGE_OPTIONS = [
  { value: "gujarati", label: "Gujarati" },
  { value: "malayalam", label: "Malayalam" },
  { value: "bengali", label: "Bengali" },
];

const URL_RE = /^https?:\/\/.+/i;

export function StepSocial() {
  const { state, update, nextStep, prevStep } = useOnboarding();

  const [youtubeUrl, setYoutubeUrl] = useState(state.youtubeUrl);
  const [instagramUrl, setInstagramUrl] = useState(state.instagramUrl);
  const [contentLanguage, setContentLanguage] = useState(state.contentLanguage);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync local state to context on unmount
  const localRef = React.useRef({ youtubeUrl, instagramUrl, contentLanguage });
  localRef.current = { youtubeUrl, instagramUrl, contentLanguage };
  React.useEffect(() => {
    return () => {
      const v = localRef.current;
      update({
        youtubeUrl: v.youtubeUrl,
        instagramUrl: v.instagramUrl,
        contentLanguage: v.contentLanguage,
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleContinue() {
    const errs: Record<string, string> = {};
    if (!youtubeUrl.trim()) {
      errs.youtube = "YouTube channel link is required.";
    } else if (!URL_RE.test(youtubeUrl.trim())) {
      errs.youtube = "Enter a valid URL (e.g. https://youtube.com/@yourchannel).";
    }
    if (instagramUrl.trim() && !URL_RE.test(instagramUrl.trim())) {
      errs.instagram = "Enter a valid URL (e.g. https://instagram.com/yourhandle).";
    }
    if (!contentLanguage) {
      errs.language = "Content language is required.";
    }
    if (Object.keys(errs).length) { setErrors(errs); return; }

    update({
      youtubeUrl: youtubeUrl.trim(),
      instagramUrl: instagramUrl.trim(),
      contentLanguage,
    });
    nextStep();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Social Details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Share your social media presence so we can verify your content reach.
        </p>
      </div>

      {/* YouTube — required */}
      <div className="space-y-1.5">
        <label htmlFor="youtube" className="text-sm font-medium">
          YouTube Channel Link
        </label>
        <Input
          id="youtube"
          type="url"
          placeholder="https://youtube.com/@yourchannel"
          value={youtubeUrl}
          onChange={(e) => { setYoutubeUrl(e.target.value); if (errors.youtube) setErrors((p) => ({ ...p, youtube: "" })); }}
          error={errors.youtube}
        />
      </div>

      {/* Instagram — optional */}
      <div className="space-y-1.5">
        <label htmlFor="instagram" className="text-sm font-medium">
          Instagram Handle/Link <span className="text-muted-foreground">(optional)</span>
        </label>
        <Input
          id="instagram"
          type="url"
          placeholder="https://instagram.com/yourhandle"
          value={instagramUrl}
          onChange={(e) => { setInstagramUrl(e.target.value); if (errors.instagram) setErrors((p) => ({ ...p, instagram: "" })); }}
          error={errors.instagram}
        />
      </div>

      {/* Content Language — required */}
      <div className="space-y-1.5">
        <label htmlFor="content-language" className="text-sm font-medium">
          Content Language
        </label>
        <Select
          id="content-language"
          options={LANGUAGE_OPTIONS}
          value={contentLanguage}
          onChange={(val) => { setContentLanguage(val); if (errors.language) setErrors((p) => ({ ...p, language: "" })); }}
          placeholder="Select your primary content language"
        />
        {errors.language && <p className="text-sm text-destructive">{errors.language}</p>}
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-border bg-card px-4 py-4 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:pt-4">
        <Button variant="outline" onClick={prevStep}>Back</Button>
        <Button className="flex-1 md:flex-none" onClick={handleContinue}>Continue</Button>
      </div>
    </div>
  );
}
