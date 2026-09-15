import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * TODO: Replace /brand/snapdeal-logo.svg with the official Snapdeal logo
 * asset once the brand team provides it. Current file is an approximation.
 *
 * Props:
 * - size: "sm" (height 24px), "md" (32px), "lg" (40px) — controls height, width auto
 * - variant: "full" (icon + wordmark), "icon" (icon only)
 * - assetPath: override the default logo path if needed
 */

export interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "full" | "icon";
  className?: string;
  /** Override the default logo asset path */
  assetPath?: string;
}

const SIZE_MAP = {
  sm: { height: 24, width: 125 },
  md: { height: 32, width: 166 },
  lg: { height: 40, width: 208 },
};

const ICON_SIZE_MAP = {
  sm: { height: 24, width: 24 },
  md: { height: 32, width: 32 },
  lg: { height: 40, width: 40 },
};

export function Logo({
  size = "md",
  variant = "full",
  className,
  assetPath,
}: LogoProps) {
  const dims = variant === "full" ? SIZE_MAP[size] : ICON_SIZE_MAP[size];
  const src = assetPath ?? "/brand/snapdeal-logo.svg";

  return (
    <Image
      src={src}
      alt="Snapdeal"
      width={dims.width}
      height={dims.height}
      className={cn("shrink-0 object-contain", className)}
      priority
    />
  );
}
