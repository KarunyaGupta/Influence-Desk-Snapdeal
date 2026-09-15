import { SESSION_COOKIE } from "@/lib/config/env";
import { decodeSessionCookie, encodeSessionCookie } from "@/lib/auth/rbac";
import { createSeedState } from "./seed";
import type { MockState } from "./types";
import { nowIso } from "./types";
import type { AuditAction, AuditEntityType, AuditLogEntry, UserRole } from "@/lib/types";
import { uid } from "./types";

const GLOBAL_KEY = "__SIH_MOCK_STORE__" as const;

type GlobalStore = typeof globalThis & {
  [GLOBAL_KEY]?: MockStore;
};

export class MockStore {
  state: MockState;

  constructor() {
    this.state = createSeedState();
    this.hydrateCurrentUserFromCookie();
  }

  reset(): void {
    this.state = createSeedState();
    this.hydrateCurrentUserFromCookie();
  }

  currentUser() {
    const id = this.state.currentUserId;
    return this.state.users.find((u) => u.id === id) ?? null;
  }

  requireUser() {
    const user = this.currentUser();
    if (!user) {
      throw new Error("UNAUTHENTICATED");
    }
    return user;
  }

  setCurrentUser(userId: string | null) {
    this.state.currentUserId = userId;
    if (typeof document === "undefined") return;
    if (!userId) {
      document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
      return;
    }
    const user = this.state.users.find((u) => u.id === userId);
    if (!user) return;
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    document.cookie = `${SESSION_COOKIE}=${encodeSessionCookie({
      userId: user.id,
      role: user.role,
      expiresAt,
    })}; path=/; SameSite=Lax`;
  }

  appendAudit(input: {
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    metadata?: Record<string, unknown>;
    actorUserId?: string | null;
    actorRole?: UserRole | string | null;
  }): AuditLogEntry {
    const actor = this.currentUser();
    const entry: AuditLogEntry = {
      id: uid("aud"),
      actorUserId: input.actorUserId ?? actor?.id ?? null,
      actorRole: input.actorRole ?? actor?.role ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ?? {},
      createdAt: nowIso(),
    };
    this.state.audit.unshift(entry);
    return entry;
  }

  private hydrateCurrentUserFromCookie() {
    if (typeof document === "undefined") return;
    const raw = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${SESSION_COOKIE}=`))
      ?.split("=")
      .slice(1)
      .join("=");
    const payload = decodeSessionCookie(raw);
    if (payload) this.state.currentUserId = payload.userId;
  }
}

export function getMockStore(): MockStore {
  const g = globalThis as GlobalStore;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new MockStore();
  }
  return g[GLOBAL_KEY];
}
