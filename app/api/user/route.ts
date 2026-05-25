import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardRequest } from '@/lib/security';
import { generateWelcomeMessage } from '@/lib/proactive';
import type { PersonalityType, GenderType } from '@/lib/types';

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

  // Generate welcome message dari AI (best-effort, jangan blokir signup kalo gagal)
  try {
    const welcome = await generateWelcomeMessage({
      aiName: user.aiName,
      userName: user.name,
      aiGender: user.aiGender as GenderType,
      personality: user.personality as PersonalityType,
      petNameUser: user.petNameUser,
      petNameAi: user.petNameAi,
      mode: user.mode as 'anime' | 'realistic',
    });
    if (welcome) {
      await prisma.message.create({
        data: { userId: user.id, role: 'ai', content: welcome },
      });
    }
  } catch {
    // Silent fail — user tetap dibuat, chat tetap bisa dimulai tanpa welcome
  }

  return NextResponse.json({ userId: user.id });
}

export async function PATCH(request: NextRequest) {
  // Guard: 20 edit per IP per jam
  const blocked = guardRequest(request, {
    rateLimit: { limit: 20, windowMs: 60 * 60 * 1000 },
  });
  if (blocked) return blocked;

  const body = await request.json();
  const { userId, name, aiName, aiGender, personality, mode, toxicLevel, petNameUser, petNameAi } =
    body as {
      userId: string;
      name?: string;
      aiName?: string;
      aiGender?: string;
      personality?: string;
      mode?: string;
      toxicLevel?: number;
      petNameUser?: string | null;
      petNameAi?: string | null;
    };

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const validPersonalities = ['tsundere', 'yandere', 'kuudere', 'deredere', 'himedere'];
  const validModes = ['anime', 'realistic'];
  const validGenders = ['female', 'male'];

  // Bangun patch object — cuma field yang dikirim yang di-update
  const data: Record<string, unknown> = {};
  if (typeof name === 'string' && name.trim()) data.name = name.trim();
  if (typeof aiName === 'string' && aiName.trim()) data.aiName = aiName.trim();
  if (aiGender && validGenders.includes(aiGender)) data.aiGender = aiGender;
  if (personality && validPersonalities.includes(personality)) data.personality = personality;
  if (mode && validModes.includes(mode)) data.mode = mode;
  if (typeof toxicLevel === 'number' && toxicLevel >= 1 && toxicLevel <= 5) {
    data.toxicLevel = Math.floor(toxicLevel);
  }
  // pet names: empty string atau null = clear, kalo ada isinya = update
  if (petNameUser !== undefined) {
    data.petNameUser = typeof petNameUser === 'string' && petNameUser.trim()
      ? petNameUser.trim() : null;
  }
  if (petNameAi !== undefined) {
    data.petNameAi = typeof petNameAi === 'string' && petNameAi.trim()
      ? petNameAi.trim() : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({ where: { id: userId }, data });
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'User not found or update failed' }, { status: 404 });
  }
}
