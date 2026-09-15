import type { AdminService } from "@/lib/services/contracts/admin";
import { ServiceError, withLatency } from "@/lib/mock/latency";
import { getMockStore } from "@/lib/mock/store";
import { nowIso, uid } from "@/lib/mock/types";

export const mockAdminService: AdminService = {
  async listUsers() {
    await withLatency(null);
    const store = getMockStore();
    if (store.requireUser().role !== "admin") {
      throw new ServiceError("Forbidden.", "FORBIDDEN", 403);
    }
    return store.state.users;
  },

  async createUser(input) {
    await withLatency(null);
    const store = getMockStore();
    if (store.requireUser().role !== "admin") {
      throw new ServiceError("Forbidden.", "FORBIDDEN", 403);
    }
    const user = {
      id: uid("usr"),
      role: input.role,
      displayName: input.displayName,
      email: input.email,
      mobile: input.mobile,
      password: "", // Admin-created users set their own password on first login
      status: "invited" as const,
      createdAt: nowIso(),
      lastLoginAt: null,
    };
    store.state.users.push(user);
    store.appendAudit({
      action: "user_created",
      entityType: "user",
      entityId: user.id,
      metadata: { role: user.role },
    });
    return user;
  },

  async updateUserStatus(userId, status) {
    await withLatency(null);
    const store = getMockStore();
    if (store.requireUser().role !== "admin") {
      throw new ServiceError("Forbidden.", "FORBIDDEN", 403);
    }
    const user = store.state.users.find((u) => u.id === userId);
    if (!user) throw new ServiceError("User not found.", "NOT_FOUND", 404);
    user.status = status;
    store.appendAudit({
      action: "user_updated",
      entityType: "user",
      entityId: user.id,
      metadata: { status },
    });
    return user;
  },
};
