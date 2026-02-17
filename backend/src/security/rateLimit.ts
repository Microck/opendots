type Bucket = {
  resetAt: number;
  count: number;
};

const memoryBuckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { allowed: true; remaining: number; resetAt: number }
  | { allowed: false; remaining: 0; resetAt: number; retryAfterMs: number };

let redisClientPromise: Promise<import('@upstash/redis').Redis> | null = null;
let hasWarnedRedisFallback = false;

async function getRedisClient(): Promise<import('@upstash/redis').Redis | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return null;
  }

  if (!redisClientPromise) {
    redisClientPromise = (async () => {
      const { Redis } = await import('@upstash/redis');
      return new Redis({ url, token });
    })();
  }

  return redisClientPromise;
}

function checkMemoryRateLimit(key: string, params: { windowMs: number; max: number }): RateLimitResult {
  const { windowMs, max } = params;
  const now = Date.now();

  let bucket = memoryBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
  }

  if (bucket.count >= max) {
    memoryBuckets.set(key, bucket);
    return {
      allowed: false,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfterMs: Math.max(0, bucket.resetAt - now),
    };
  }

  bucket.count += 1;
  memoryBuckets.set(key, bucket);

  // Opportunistic cleanup.
  if (memoryBuckets.size > 5000 && (now % 13) === 0) {
    for (const [k, b] of memoryBuckets.entries()) {
      if (now >= b.resetAt) {
        memoryBuckets.delete(k);
      }
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, max - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export async function checkRateLimit(key: string, params: { windowMs: number; max: number }): Promise<RateLimitResult> {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      return checkMemoryRateLimit(key, params);
    }

    const { windowMs, max } = params;

    // Fixed-window counter with atomic expiry. Works well enough for abuse prevention.
    // Returns: [count, ttlMs]
    const script = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {current, ttl}
`;

    const result = await redis.eval(script, [key], [windowMs]);
    const tuple = Array.isArray(result) ? result : [0, windowMs];

    const countValue = tuple[0];
    const ttlValue = tuple[1];

    const count = typeof countValue === 'number' ? countValue : Number(countValue);
    const ttlMs = typeof ttlValue === 'number' ? ttlValue : Number(ttlValue);

    const now = Date.now();
    const resetAt = now + Math.max(0, Number.isFinite(ttlMs) ? ttlMs : windowMs);

    if (count > max) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfterMs: Math.max(0, resetAt - now),
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, max - count),
      resetAt,
    };
  } catch (error) {
    if (!hasWarnedRedisFallback) {
      console.warn('Upstash rate limiter unavailable; falling back to in-memory limiter.', error);
      hasWarnedRedisFallback = true;
    }
    return checkMemoryRateLimit(key, params);
  }
}
