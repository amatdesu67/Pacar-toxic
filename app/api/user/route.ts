import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardRequest } from '@/lib/security';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function POST(request: NextRequest) {
  // Guard: 5 user creation per IP per jam (prevent spam akun)
  const blocked = guardRequest(request, {
    rateLimit: { limit: 5, windowMs: 60 * 60 * 1000 },
  });
  if (blocked) return blocked;

  const body = await request.json();
  const { name, aiName, aiGender, personality, mode, toxicLevel, petNameUser, petNameAi } = body as {
    name: string;
    aiName: string;
    aiGender: string;
    personality: string;
    mode?: string;
    toxicLevel: number;
    petNameUser?: string;
    petNameAi?: string;
  };

  const validPersonalities = ['tsundere', 'yandere', 'kuudere', 'deredere', 'himedere'];
  const validModes = ['anime', 'realistic'];
  if (!name || !aiName || !aiGender || !toxicLevel) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      aiName: aiName.trim(),
      aiGender,
      personality: validPersonalities.includes(personality) ? personality : 'tsundere',
      mode: validModes.includes(mode ?? '') ? mode! : 'anime',
      toxicLevel: Number(toxicLevel),
      petNameUser: petNameUser?.trim() || null,
      petNameAi: petNameAi?.trim() || null,
    },
  });

  return NextResponse.json({ userId: user.id });
}
