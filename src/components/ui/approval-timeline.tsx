"use client";

import * as React from "react";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimelineNodeStatus = "completed" | "current" | "upcoming";

export interface TimelineItem {
  id: string;
  label: string;
  description?: string;
  timestamp?: string;
  status: TimelineNodeStatus;
}

export interface ApprovalTimelineProps {
  items: TimelineItem[];
  className?: string;
}

export function ApprovalTimeline({ items, className }: ApprovalTimelineProps) {
  return (
    <div className={cn("relative", className)}>
      {items.map((item, i) => (
        <div key={item.id} className="relative flex gap-4 pb-8 last:pb-0">
          {/* Vertical connector line */}
          {i < items.length - 1 && (
            <div
              className={cn(
                "absolute left-[15px] top-8 w-0.5 bottom-0",
                item.status === "completed"
                  ? "bg-primary"
                  : "bg-muted-foreground/20",
              )}
              aria-hidden="true"
            />
          )}

          {/* Node circle */}
          <div className="relative z-10 flex shrink-0">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full",
                item.status === "completed" &&
                  "bg-primary text-primary-foreground",
                item.status === "current" &&
                  "border-2 border-primary bg-background",
                item.status === "upcoming" &&
                  "border-2 border-muted-foreground/30 bg-background",
              )}
            >
              {item.status === "completed" && (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
              {item.status === "current" && (
                <Circle
                  className="h-3 w-3 fill-primary text-primary"
                  aria-hidden="true"
                />
              )}
              {item.status === "upcoming" && (
                <Circle
                  className="h-3 w-3 text-muted-foreground/30"
                  aria-hidden="true"
                />
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 pt-1">
            <p
              className={cn(
                "text-sm font-medium",
                item.status === "upcoming" && "text-muted-foreground",
              )}
            >
              {item.label}
            </p>
            {item.description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.description}
              </p>
            )}
            {item.timestamp && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.timestamp}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
