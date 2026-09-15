"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Authenticated route group layout.
 * Redirects unauthenticated users to /login.
 * Role-specific sub-layouts handle sidebar nav items.
 */
export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, loading } = useSession();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex min-h-screen">
        {/* Skeleton sidebar */}
        <aside className="hidden w-60 flex-shrink-0 border-r border-border bg-card md:flex md:flex-col p-4 space-y-4">
          <Skeleton className="h-8 w-20" />
          <div className="space-y-2 mt-6">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </aside>
        {/* Skeleton content */}
        <main className="flex-1 p-4 md:p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </main>
      </div>
    );
  }

  if (!session) {
    router.replace("/login");
    return null;
  }

  return <>{children}</>;
}
