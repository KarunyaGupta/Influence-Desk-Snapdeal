"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { AppServices } from "@/lib/services/contracts";
import { getServices } from "@/lib/services";

const ServicesContext = createContext<AppServices | null>(null);

export function ServicesProvider({ children }: { children: React.ReactNode }) {
  const svc = useMemo(() => getServices(), []);
  return (
    <ServicesContext.Provider value={svc}>{children}</ServicesContext.Provider>
  );
}

/**
 * Hook to access the service layer. Every UI component calls services through
 * this hook — never imports mock data directly.
 */
export function useServices(): AppServices {
  const ctx = useContext(ServicesContext);
  if (!ctx) {
    throw new Error("useServices must be used within <ServicesProvider>");
  }
  return ctx;
}
