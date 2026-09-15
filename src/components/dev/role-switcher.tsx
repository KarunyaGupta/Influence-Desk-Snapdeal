"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import type { User, UserRole } from "@/lib/types";
import { ROLE_HOME } from "@/lib/auth/rbac";
import { ENABLE_ROLE_SWITCHER } from "@/lib/config/env";
import { useServices, useSession } from "@/components/providers";

const ROLE_LABELS: Record<UserRole, string> = {
  influencer: "INF",
  business_manager: "BM",
  finance_manager: "FM",
  admin: "ADM",
};

const ROLE_DOT_COLORS: Record<UserRole, string> = {
  influencer: "bg-blue-500",
  business_manager: "bg-purple-500",
  finance_manager: "bg-emerald-500",
  admin: "bg-red-500",
};

/**
 * Dev-only discreet role switcher.
 * Renders as a small pill in the bottom-left corner — not part of the "real" UI.
 * Hidden when NEXT_PUBLIC_ENABLE_ROLE_SWITCHER !== "true".
 */
export function RoleSwitcher() {
  const router = useRouter();
  const { auth } = useServices();
  const { session, refresh } = useSession();
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!ENABLE_ROLE_SWITCHER) return;
    auth.listDemoUsers().then(setDemoUsers).catch(() => {});
  }, [auth]);

  const switchTo = useCallback(
    async (user: User) => {
      setSwitching(true);
      try {
        await auth.switchDemoUser({ role: user.role, userId: user.id });
        await refresh();
        router.push(ROLE_HOME[user.role]);
      } finally {
        setSwitching(false);
        setOpen(false);
      }
    },
    [auth, refresh, router],
  );

  if (!ENABLE_ROLE_SWITCHER) return null;

  const currentRole = session?.user.role;

  return (
    <div className="fixed bottom-3 left-3 z-[9999]">
      {/* Expanded panel */}
      {open && (
        <div className="mb-2 w-56 rounded-lg border border-border bg-background/95 p-2 shadow-lg backdrop-blur-sm">
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Dev · Switch Role
          </p>
          <div className="space-y-0.5">
            {demoUsers.map((u) => (
              <button
                key={u.id}
                disabled={switching || u.id === session?.user.id}
                onClick={() => switchTo(u)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent disabled:opacity-40"
              >
                <span
                  className={`h-2 w-2 rounded-full ${ROLE_DOT_COLORS[u.role]}`}
                />
                <span className="font-mono text-[10px] text-muted-foreground w-6">
                  {ROLE_LABELS[u.role]}
                </span>
                <span className="flex-1 truncate">{u.displayName}</span>
                {u.id === session?.user.id && (
                  <span className="text-[9px] text-primary font-medium">●</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trigger pill */}
      <button
        onClick={() => setOpen(!open)}
        className="flex h-7 items-center gap-1.5 rounded-full border border-border bg-background/90 px-2.5 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Toggle role switcher"
      >
        <Users className="h-3 w-3" />
        <span className="hidden sm:inline">DEV</span>
        {currentRole && (
          <span
            className={`h-2 w-2 rounded-full ${ROLE_DOT_COLORS[currentRole]}`}
          />
        )}
      </button>
    </div>
  );
}
