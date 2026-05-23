import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { goals: { orderBy: { createdAt: 'asc' } } },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, aiName, aiGender, toxicLevel, goals } = body as {
    name: string;
    aiName: string;
    aiGender: string;
    toxicLevel: number;
    goals: string[];
  };

  if (!name || !aiName || !aiGender || !toxicLevel || !goals?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      aiName: aiName.trim(),
      aiGender,
      toxicLevel: Number(toxicLevel),
      goals: {
        create: goals.map((title: string) => ({ title: title.trim() })),
      },
    },
  });

  return NextResponse.json({ userId: user.id });
}
