export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAtMs: number;
}

const buckets = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  nowMs: number = Date.now()
): RateLimitDecision {
  const cutoff = nowMs - windowMs;
  const existing = (buckets.get(key) || []).filter((ts) => ts > cutoff);

  if (existing.length >= limit) {
    const oldestInWindow = existing[0] ?? nowMs;
    const resetAtMs = oldestInWindow + windowMs;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((resetAtMs - nowMs) / 1000)
    );
    buckets.set(key, existing);
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterSeconds,
      resetAtMs,
    };
  }

  existing.push(nowMs);
  buckets.set(key, existing);
  const remaining = Math.max(0, limit - existing.length);
  const resetAtMs = (existing[0] ?? nowMs) + windowMs;

  return {
    allowed: true,
    limit,
    remaining,
    retryAfterSeconds: 0,
    resetAtMs,
  };
}

export function extractRateLimitKey(request: Request, scope: string): string {
  const forwarded =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-user-id")?.trim() ||
    "local";
  return `rl:${scope}:${forwarded}`;
}

export function resetRateLimiterForTests(): void {
  buckets.clear();
}
