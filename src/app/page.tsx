"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, useServices } from "@/components/providers";
import { ROLE_HOME } from "@/lib/auth/rbac";

/**
 * Root page — redirects based on auth state and onboarding status.
 * Logged in influencer who hasn't onboarded → /onboarding.
 * Logged in (onboarded or non-influencer) → role home.
 * Not logged in → /login.
 */
export default function RootPage() {
  const { session, loading } = useSession();
  const { onboarding } = useServices();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }

    // For influencers, check onboarding status
    if (session.user.role === "influencer") {
      onboarding
        .getCurrentDraft()
        .then((draft) => {
          if (draft && draft.onboardingStatus === "active") {
            router.replace("/influencer");
          } else {
            router.replace("/onboarding");
          }
        })
        .catch(() => {
          router.replace("/onboarding");
        });
    } else {
      router.replace(ROLE_HOME[session.user.role]);
    }
  }, [session, loading, router, onboarding]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
