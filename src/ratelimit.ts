import type { RateLimiter } from "./types";
import { ApiError } from "./http";

/**
 * Enforce a rate limit if the binding is present. No-op when the limiter is
 * undefined (local dev / tests), so behavior degrades safely.
 */
export async function enforce(
  limiter: RateLimiter | undefined,
  key: string,
  label: string,
): Promise<void> {
  if (!limiter) return;
  const { success } = await limiter.limit({ key });
  if (!success) {
    throw new ApiError(`Rate limit exceeded for ${label}. Slow down and retry shortly.`, 429);
  }
}

/** Best-effort client IP for keying anonymous limits. */
export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
