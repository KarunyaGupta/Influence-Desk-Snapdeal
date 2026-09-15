import type { AuditService } from "@/lib/services/contracts/audit";
import { ServiceError, withLatency } from "@/lib/mock/latency";
import { getMockStore } from "@/lib/mock/store";

export const mockAuditService: AuditService = {
  async list(filters) {
    await withLatency(null);
    const store = getMockStore();
    const user = store.requireUser();
    if (user.role !== "admin") throw new ServiceError("Forbidden.", "FORBIDDEN", 403);
    return store.state.audit.filter((e) => {
      if (filters?.entityType && e.entityType !== filters.entityType) return false;
      if (filters?.entityId && e.entityId !== filters.entityId) return false;
      if (filters?.actorUserId && e.actorUserId !== filters.actorUserId) return false;
      return true;
    });
  },
};
