"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── LINEAR PROGRESS BAR ──────────────────────────────────────────────────── */

export interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  className?: string;
  label?: string;
}

export function ProgressBar({
  value,
  max = 100,
  className,
  label,
}: ProgressBarProps) {
  const percent = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{Math.round(percent)}%</span>
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/* ─── STEPPER ──────────────────────────────────────────────────────────────── */

export type StepStatus = "completed" | "current" | "upcoming";

export interface StepItem {
  label: string;
  description?: string;
  status: StepStatus;
}

export interface StepperProps {
  steps: StepItem[];
  className?: string;
}

export function Stepper({ steps, className }: StepperProps) {
  return (
    <nav aria-label="Progress" className={cn("w-full", className)}>
      <ol className="flex items-center">
        {steps.map((step, i) => (
          <li
            key={i}
            className={cn("flex items-center", i < steps.length - 1 && "flex-1")}
          >
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  step.status === "completed" &&
                    "bg-primary text-primary-foreground",
                  step.status === "current" &&
                    "border-2 border-primary bg-background text-primary",
                  step.status === "upcoming" &&
                    "border-2 border-muted-foreground/30 bg-background text-muted-foreground",
                )}
                aria-current={step.status === "current" ? "step" : undefined}
              >
                {step.status === "completed" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  "mt-1.5 text-xs text-center max-w-[80px]",
                  step.status === "current"
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 flex-1",
                  step.status === "completed"
                    ? "bg-primary"
                    : "bg-muted-foreground/20",
                )}
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
