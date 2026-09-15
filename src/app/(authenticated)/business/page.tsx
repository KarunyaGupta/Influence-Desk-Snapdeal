"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * BM root — redirects to the approval queue (first nav item).
 */
export default function BusinessHomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/business/requests");
  }, [router]);
  return null;
}
