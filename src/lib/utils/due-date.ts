import type { Influencer, InvoiceRequest } from "@/lib/types";

/**
 * Calculate the payment due date for an invoice based on the influencer's payment terms.
 * Due Date = submittedAt + paymentTerms (in days).
 * Returns null if payment terms are not set on the influencer.
 */
export function getPaymentDueDate(
  invoice: InvoiceRequest,
  influencer: Influencer | undefined,
): Date | null {
  if (!influencer?.paymentTerms) return null;

  const daysMatch = influencer.paymentTerms.match(/^(\d+)_days$/);
  if (!daysMatch) return null;

  const days = parseInt(daysMatch[1], 10);
  const submitted = new Date(invoice.submittedAt);
  const due = new Date(submitted);
  due.setDate(due.getDate() + days);
  return due;
}

/**
 * Calculate the number of days until (positive) or overdue (negative) for an invoice.
 * Returns null if due date cannot be computed.
 */
export function getDaysUntilDue(
  invoice: InvoiceRequest,
  influencer: Influencer | undefined,
): number | null {
  const dueDate = getPaymentDueDate(invoice, influencer);
  if (!dueDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Format due date status as a human-readable string.
 */
export function formatDueStatus(daysUntilDue: number): string {
  if (daysUntilDue === 0) return "Due today";
  if (daysUntilDue === 1) return "Due tomorrow";
  if (daysUntilDue > 0) return `Due in ${daysUntilDue} days`;
  if (daysUntilDue === -1) return "1 day overdue";
  return `${Math.abs(daysUntilDue)} days overdue`;
}

/**
 * Get CSS classes for due date badge based on urgency.
 */
export function getDueStatusColor(daysUntilDue: number): string {
  if (daysUntilDue < 0) return "text-red-700 bg-red-100";
  if (daysUntilDue <= 3) return "text-amber-700 bg-amber-100";
  if (daysUntilDue <= 7) return "text-blue-700 bg-blue-100";
  return "text-muted-foreground bg-muted";
}
