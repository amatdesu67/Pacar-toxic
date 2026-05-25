/**
 * In-memory rate limiter per identifier (IP, userId, dll).
 *
 * Catatan penting buat Vercel:
 * - Tiap serverless instance punya Map sendiri. Saat lagi cold scale,
 *   limit per-instance—jadi efektif limit total = limit × jumlah instance aktif.
 * - Cukup buat block casual abuse / script kiddies / accidental loops.
 * - Buat protection serius (DDoS), pakai Cloudflare di depan Vercel.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const CLEANUP_THRESHOLD = 1000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(identifier);

  // Window expired atau bucket belum ada—reset
  if (!bucket || bucket.resetAt < now) {
    const newBucket: Bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(identifier, newBucket);

    // Cleanup occasional kalau map udah gede
    if (buckets.size > CLEANUP_THRESHOLD) {
      for (const [k, v] of buckets) {
        if (v.resetAt < now) buckets.delete(k);
      }
    }

    return { allowed: true, remaining: limit - 1, resetAt: newBucket.resetAt };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count++;
  return { allowed: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}
