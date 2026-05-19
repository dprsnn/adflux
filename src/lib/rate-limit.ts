const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
}

/**
 * Simple in-memory rate limiter for API routes.
 * Returns { success: true } if within limit, { success: false } if exceeded.
 */
export function rateLimit(
  key: string,
  { windowMs = 60_000, max = 10 }: RateLimitOptions = {}
): { success: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: max - 1 };
  }

  if (record.count >= max) {
    return { success: false, remaining: 0 };
  }

  record.count++;
  return { success: true, remaining: max - record.count };
}

// Periodically clean up expired entries (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap) {
      if (now > record.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60_000);
}
