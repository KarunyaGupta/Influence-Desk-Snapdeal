import * as React from "react";
import { Info, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertVariant = "info" | "success" | "warning" | "error";

const VARIANT_CONFIG: Record<
  AlertVariant,
  { icon: React.ElementType; className: string }
> = {
  info: {
    icon: Info,
    className: "border-blue-200 bg-blue-50 text-blue-900",
  },
  success: {
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-amber-200 bg-amber-50 text-amber-900",
  },
  error: {
    icon: XCircle,
    className: "border-red-200 bg-red-50 text-red-900",
  },
};

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: AlertProps) {
  const { icon: Icon, className: variantClass } = VARIANT_CONFIG[variant];

  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 rounded-lg border p-4",
        variantClass,
        className,
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-semibold">{title}</p>}
        <div className={cn("text-sm", title && "mt-1")}>{children}</div>
      </div>
    </div>
  );
}
