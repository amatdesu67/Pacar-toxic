import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardRequest } from '@/lib/security';
import { generateReturningMessage } from '@/lib/proactive';
import { calculateDaysTogether } from '@/lib/db-helpers';
import type { PersonalityType, GenderType } from '@/lib/types';

const MIN_GAP_HOURS = 6;

/**
 * POST /api/chat/proactive
 * Body: { userId: string }
 *
 * Cek apakah user pantes dapet "returning greeting"—yaitu kalo:
 * - Last message ada (bukan user baru), dan
 * - Last message dari AI (kalau dari user, berarti dia balas duluan = ga perlu greeting), dan
 * - Gap > MIN_GAP_HOURS
 *
 * Generate satu pesan AI proactive, save, return ke caller. Caller (frontend chat page)
 * yang append ke list message-nya.
 */
export async function POST(request: NextRequest) {
  const blocked = guardRequest(request, {
    rateLimit: { limit: 10, windowMs: 60 * 60 * 1000 },
  });
  if (blocked) return blocked;

  const body = await request.json();
  const { userId } = body as { userId: string };
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const lastMessage = await prisma.message.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { role: true, createdAt: true },
  });

  // Skip kalau ga ada message, atau last message dari user (= dia udah ngomong duluan)
  if (!lastMessage || lastMessage.role !== 'ai') {
    return NextResponse.json({ skipped: true, reason: 'no eligible last message' });
  }

  const hoursAway = (Date.now() - new Date(lastMessage.createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursAway < MIN_GAP_HOURS) {
    return NextResponse.json({ skipped: true, reason: 'gap too short' });
  }

  const text = await generateReturningMessage({
    aiName: user.aiName,
    userName: user.name,
    aiGender: user.aiGender as GenderType,
    personality: user.personality as PersonalityType,
    petNameUser: user.petNameUser,
    petNameAi: user.petNameAi,
    mode: user.mode as 'anime' | 'realistic',
    hoursAway,
    daysTogether: calculateDaysTogether(user.createdAt),
  });

  if (!text) {
    return NextResponse.json({ skipped: true, reason: 'generation failed' });
  }

  const saved = await prisma.message.create({
    data: { userId, role: 'ai', content: text },
  });

  return NextResponse.json({
    message: text,
    messageId: saved.id,
    createdAt: saved.createdAt,
  });
}
