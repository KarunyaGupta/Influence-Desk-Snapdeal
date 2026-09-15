"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ColumnDef<T> {
  key: string;
  header: string;
  /** Render cell content. Falls back to (row as any)[key] if not provided. */
  render?: (row: T, index: number) => React.ReactNode;
  /** CSS class for the th/td */
  className?: string;
  /** Used as the label in stacked card mode */
  hideOnMobile?: boolean;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  /** Unique key extractor for each row */
  rowKey: (row: T, index: number) => string;
  /** Optional click handler per row */
  onRowClick?: (row: T) => void;
  className?: string;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  className,
  emptyMessage = "No data to display.",
}: DataTableProps<T>) {
  function getCellValue(row: T, col: ColumnDef<T>, index: number) {
    if (col.render) return col.render(row, index);
    return (row as Record<string, unknown>)[col.key]?.toString() ?? "";
  }

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop: standard table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3.5 text-left font-medium text-muted-foreground",
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-border transition-colors hover:bg-accent/50",
                  onRowClick && "cursor-pointer",
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3.5", col.className)}>
                    {getCellValue(row, col, i)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {data.map((row, i) => (
          <div
            key={rowKey(row, i)}
            onClick={() => onRowClick?.(row)}
            onKeyDown={(e) => {
              if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onRowClick(row);
              }
            }}
            role={onRowClick ? "button" : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            className={cn(
              "rounded-lg border border-border bg-card p-4 space-y-3 min-h-[44px]",
              onRowClick &&
                "cursor-pointer transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            {columns
              .filter((col) => !col.hideOnMobile)
              .map((col) => (
                <div key={col.key} className="flex items-start justify-between gap-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    {col.header}
                  </span>
                  <span className="text-sm text-right">
                    {getCellValue(row, col, i)}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
