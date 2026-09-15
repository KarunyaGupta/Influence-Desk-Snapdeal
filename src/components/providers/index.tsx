"use client";

import React from "react";
import { ServicesProvider } from "./services-provider";
import { SessionProvider } from "./session-provider";

/**
 * Composes all app-level providers. Add new providers here as needed.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ServicesProvider>
      <SessionProvider>{children}</SessionProvider>
    </ServicesProvider>
  );
}

export { useServices } from "./services-provider";
export { useSession } from "./session-provider";
