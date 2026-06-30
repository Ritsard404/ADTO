type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

export class RateLimitError extends Error {
  constructor(message = "Too many requests. Try again in a few minutes.") {
    super(message);
    this.name = "RateLimitError";
  }
}

function pruneExpiredBuckets(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function isRateLimitError(error: unknown) {
  return error instanceof RateLimitError;
}

export function enforceRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const normalizedKey = key.trim().toLowerCase();
  const current = buckets.get(normalizedKey);
  if (!current || current.resetAt <= now) {
    buckets.set(normalizedKey, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (current.count >= limit) {
    throw new RateLimitError();
  }

  current.count += 1;
}
