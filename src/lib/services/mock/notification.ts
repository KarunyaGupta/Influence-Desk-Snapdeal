import type { NotificationService } from "@/lib/services/contracts/notification";
import { withLatency } from "@/lib/mock/latency";
import { getMockStore } from "@/lib/mock/store";
import { nowIso } from "@/lib/mock/types";

export const mockNotificationService: NotificationService = {
  async listForCurrentUser() {
    await withLatency(null);
    const store = getMockStore();
    const user = store.requireUser();
    return store.state.notifications.filter((n) => n.userId === user.id);
  },

  async markRead(notificationId) {
    await withLatency(null);
    const store = getMockStore();
    const user = store.requireUser();
    const n = store.state.notifications.find(
      (item) => item.id === notificationId && item.userId === user.id,
    );
    if (n) n.readAt = nowIso();
  },
};
