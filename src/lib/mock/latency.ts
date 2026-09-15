import { MOCK_LATENCY_MS } from "@/lib/config/env";

export function delay(ms = MOCK_LATENCY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withLatency<T>(value: T | Promise<T>): Promise<T> {
  await delay();
  return value;
}

export class ServiceError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}
