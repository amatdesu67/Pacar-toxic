import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * Ambil IP client dari header Vercel/proxy.
 * Format x-forwarded-for: "client, proxy1, proxy2" — kita ambil yang pertama.
 */
export function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const xri = request.headers.get('x-real-ip');
  if (xri) return xri.trim();
  return 'unknown';
}

/**
 * Cek apakah request datang dari origin yang diizinkan.
 * Production: cuma allow domain Vercel + custom domain (kalau ada).
 * Dev: allow localhost.
 *
 * Note: Origin header bisa di-spoof, tapi 95% casual abuse (script bot, curl basic)
 * ga set header ini—jadi tetep berguna sebagai layer pertama.
 */
export function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');

  // Ga ada origin header (server-to-server, curl tanpa header) → tolak
  // Browser request SELALU set Origin untuk POST cross-origin.
  if (!origin) return false;

  const allowed = [
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  // Auto-allow Vercel deployment URL (vercel.app dan custom domain dari env)
  if (origin.endsWith('.vercel.app')) return true;
  if (process.env.ALLOWED_ORIGIN && origin === process.env.ALLOWED_ORIGIN) return true;

  return allowed.includes(origin);
}

interface GuardOptions {
  rateLimit?: { limit: number; windowMs: number };
  requireOrigin?: boolean;
}

/**
 * Helper utama: cek origin + rate limit dalam satu panggilan.
 * Return NextResponse kalau ditolak, atau null kalau lolos.
 *
 * Pakai di handler:
 *   const blocked = guardRequest(req, { rateLimit: { limit: 30, windowMs: 3600_000 } });
 *   if (blocked) return blocked;
 */
export function guardRequest(
  request: NextRequest,
  opts: GuardOptions = {},
): NextResponse | null {
  const { rateLimit, requireOrigin = true } = opts;

  if (requireOrigin && !isAllowedOrigin(request)) {
    return NextResponse.json(
      { error: 'Forbidden: invalid origin' },
      { status: 403 },
    );
  }

  if (rateLimit) {
    const ip = getClientIp(request);
    const route = new URL(request.url).pathname;
    const result = checkRateLimit(`${route}:${ip}`, rateLimit.limit, rateLimit.windowMs);
    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Terlalu banyak request, coba lagi nanti.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': String(result.resetAt),
          },
        },
      );
    }
  }

  return null;
}
