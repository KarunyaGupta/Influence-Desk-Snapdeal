"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * FM root — redirects to the approval queue (first nav item).
 */
export default function FinanceHomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/finance/requests");
  }, [router]);
  return null;
}
