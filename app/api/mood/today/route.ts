import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDailyMood } from '@/lib/mood';
import { calculateDaysTogether } from '@/lib/db-helpers';
import { getRelationshipStage } from '@/lib/types';

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
