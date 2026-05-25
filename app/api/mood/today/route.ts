import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDailyMood } from '@/lib/mood';
import { calculateDaysTogether } from '@/lib/db-helpers';
import { getRelationshipStage } from '@/lib/types';
import { guardRequest } from '@/lib/security';

const VALID_MOODS = ['manja', 'ngambek', 'sarkas', 'sweet'] as const;
type ValidMood = (typeof VALID_MOODS)[number];

const MOOD_REASONS: Record<ValidMood, string> = {
  manja:   'Lo pilih mood manja—butuh perhatian extra hari ini',
  ngambek: 'Lo pilih mood ngambek—mood lagi cranky',
  sarkas:  'Lo pilih mood sarkas—mode tease-on hari ini',
  sweet:   'Lo pilih mood sweet—armor lo lebih turun hari ini',
};

/**
 * GET /api/mood/today?userId=X
 * Return mood AI hari ini buat ditampilin di UI. Auto-create kalau belum ada.
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const stage = getRelationshipStage(calculateDaysTogether(user.createdAt));
  const { mood, reason } = await getOrCreateDailyMood(userId, stage);
  return NextResponse.json({ mood, reason });
}

/**
 * PATCH /api/mood/today
 * Body: { userId, mood }
 * Override mood hari ini (manual pick, override random/deterministic default).
 * Besok pagi mood baru di-generate lagi otomatis.
 */
export async function PATCH(request: NextRequest) {
  const blocked = guardRequest(request, {
    rateLimit: { limit: 15, windowMs: 60 * 60 * 1000 },
  });
  if (blocked) return blocked;

  const body = await request.json();
  const { userId, mood } = body as { userId: string; mood: string };

  if (!userId || !mood) {
    return NextResponse.json({ error: 'Missing userId or mood' }, { status: 400 });
  }
  if (!VALID_MOODS.includes(mood as ValidMood)) {
    return NextResponse.json({ error: 'Invalid mood' }, { status: 400 });
  }

  const date = new Date().toISOString().slice(0, 10);
  const reason = MOOD_REASONS[mood as ValidMood];

  // Upsert: kalo udah ada hari ini, update; kalo belum ada, create.
  await prisma.dailyMood.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, mood, reason },
    update: { mood, reason },
  });

  return NextResponse.json({ mood, reason });
}
