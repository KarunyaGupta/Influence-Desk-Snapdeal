import type { Influencer, InvoiceRequest } from "@/lib/types";
import { getDaysUntilDue } from "./due-date";
import { getMockStore } from "@/lib/mock/store";
import { uid, nowIso } from "@/lib/mock/types";

/**
 * Check all "approved_payment_pending" invoices and create 7-day reminder
 * notifications for Finance Managers if not already created.
 *
 * PROTOTYPE ONLY: This runs on FM page loads. A real production backend
 * needs an actual scheduled job (cron/queue) rather than relying on
 * someone loading a page at the right moment.
 */
export function checkPaymentDueNotifications(
  invoices: InvoiceRequest[],
  influencers: Influencer[],
): void {
  const store = getMockStore();
  const infMap = new Map(influencers.map((i) => [i.influencerId, i]));
  const fmUsers = store.state.users.filter(
    (u) => u.role === "finance_manager" && u.status === "active",
  );

  for (const inv of invoices) {
    if (inv.status !== "approved_payment_pending") continue;

    const inf = infMap.get(inv.influencerId);
    const daysUntilDue = getDaysUntilDue(inv, inf);
    if (daysUntilDue === null || daysUntilDue !== 7) continue;

    // Check idempotency — don't create duplicate notifications for this invoice + threshold
    const alreadyNotified = store.state.notifications.some(
      (n) =>
        n.type === "payment_due_reminder" &&
        n.relatedEntityId === inv.requestId &&
        n.relatedEntityType === "invoice_request",
    );
    if (alreadyNotified) continue;

    // Create reminder for each active FM
    for (const fm of fmUsers) {
      store.state.notifications.push({
        id: uid("ntf"),
        userId: fm.id,
        channel: "in_app",
        type: "payment_due_reminder",
        title: "Payment Due in 7 Days",
        body: `Invoice ${inv.requestId} (₹${inv.amountInr.toLocaleString("en-IN")}) is due for payment in 7 days.`,
        readAt: null,
        createdAt: nowIso(),
        relatedEntityType: "invoice_request",
        relatedEntityId: inv.requestId,
      });
    }
  }
}
