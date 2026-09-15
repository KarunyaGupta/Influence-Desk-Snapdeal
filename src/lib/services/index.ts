import { DATA_SOURCE } from "@/lib/config/env";
import type { AppServices } from "@/lib/services/contracts";

/**
 * Resolves the active service bundle based on the NEXT_PUBLIC_DATA_SOURCE env var.
 * UI components import `getServices()` — never mock or api directly.
 */
export function getServices(): AppServices {
  if (DATA_SOURCE === "api") {
    // Dynamic import avoided here — api/ stubs throw immediately anyway.
    // When real backend is wired, this can become a dynamic import if needed
    // to avoid bundling mock code in production.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { apiServices } = require("@/lib/services/api") as {
      apiServices: AppServices;
    };
    return apiServices;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { mockServices } = require("@/lib/services/mock") as {
    mockServices: AppServices;
  };
  return mockServices;
}

/** Singleton so multiple calls in one render cycle share the same instance. */
let _cached: AppServices | null = null;

export function services(): AppServices {
  if (!_cached) _cached = getServices();
  return _cached;
}
