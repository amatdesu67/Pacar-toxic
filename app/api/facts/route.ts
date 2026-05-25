import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardRequest } from '@/lib/security';

const VALID_CATEGORIES = ['hobi', 'makanan', 'kerjaan', 'temen', 'keluarga', 'insecurity', 'kebiasaan', 'lainnya'];

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const facts = await prisma.userFact.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, category: true, content: true, source: true, createdAt: true },
  });

  return NextResponse.json({ facts });
}

export async function POST(request: NextRequest) {
  // Guard: 20 manual fact per IP per jam
  const blocked = guardRequest(request, {
    rateLimit: { limit: 20, windowMs: 60 * 60 * 1000 },
  });
  if (blocked) return blocked;

  const body = await request.json();
  const { userId, category, content } = body as {
    userId: string;
    category: string;
    content: string;
  };

  if (!userId || !category || !content?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }
  const trimmed = content.trim().slice(0, 180);
  if (trimmed.length < 2) {
    return NextResponse.json({ error: 'Content terlalu pendek' }, { status: 400 });
  }

  const fact = await prisma.userFact.create({
    data: {
      userId,
      category,
      content: trimmed,
      source: 'manual',
    },
  });

  return NextResponse.json({ fact });
}

export async function DELETE(request: NextRequest) {
  const blocked = guardRequest(request, {
    rateLimit: { limit: 50, windowMs: 60 * 60 * 1000 },
  });
  if (blocked) return blocked;

  const factId = request.nextUrl.searchParams.get('id');
  const userId = request.nextUrl.searchParams.get('userId');
  if (!factId || !userId) {
    return NextResponse.json({ error: 'Missing id or userId' }, { status: 400 });
  }

  // Pastikan fact-nya milik user ini (cegah delete fakta orang lain)
  const result = await prisma.userFact.deleteMany({
    where: { id: factId, userId },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: 'Fact not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
