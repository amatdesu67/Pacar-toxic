import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { prisma } from '@/lib/prisma';
import { buildSystemPrompt } from '@/lib/prompts';
import { getOrCreateDailyMood } from '@/lib/mood';
import {
  getGoalsWithProgress,
  calculateStreakScore,
  formatProgressText,
  formatStreakText,
} from '@/lib/db-helpers';

const GROQ_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
  process.env.GROQ_API_KEY_4,
  process.env.GROQ_API_KEY_5,
  process.env.GROQ_API_KEY_6,
  process.env.GROQ_API_KEY_7,
  process.env.GROQ_API_KEY_8,
  process.env.GROQ_API_KEY_9,
  process.env.GROQ_API_KEY_10,
].filter(Boolean) as string[];

// Konversi message DB ke format Groq/OpenAI (user/assistant alternating)
function buildGroqHistory(
  dbMessages: Array<{ role: string; content: string }>,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const result: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const msg of dbMessages) {
    const role: 'user' | 'assistant' = msg.role === 'user' ? 'user' : 'assistant';
    // Merge kalau role sama berturut-turut
    if (result.length > 0 && result[result.length - 1].role === role) {
      result[result.length - 1].content += '\n' + msg.content;
    } else {
      result.push({ role, content: msg.content });
    }
  }

  // Hapus dari depan sampai diawali 'user'
  while (result.length > 0 && result[0].role !== 'user') {
    result.shift();
  }
  // Hapus dari belakang kalau terakhir bukan 'assistant' (pesan user baru akan ditambah manual)
  if (result.length > 0 && result[result.length - 1].role !== 'assistant') {
    result.pop();
  }

  return result;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, content } = body as { userId: string; content: string };

  if (!userId || !content?.trim()) {
    return NextResponse.json({ error: 'Missing userId or content' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { goals: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Ambil semua data konteks secara paralel
  const [goalsWithProgress, recentMessages] = await Promise.all([
    getGoalsWithProgress(userId, 7),
    prisma.message.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { role: true, content: true },
    }),
  ]);

  const streakScore = calculateStreakScore(goalsWithProgress);
  const { mood, reason } = await getOrCreateDailyMood(userId, streakScore);

  const messagesChronological = [...recentMessages].reverse();

  // Buat ringkasan chat untuk system prompt
  const chatHistory =
    messagesChronological.length > 0
      ? messagesChronological
          .map((m) => `${m.role === 'user' ? user.name : user.aiName}: ${m.content}`)
          .join('\n')
      : '(belum ada riwayat chat)';

  const systemPrompt = buildSystemPrompt({
    userName: user.name,
    aiName: user.aiName,
    aiGender: user.aiGender as 'female' | 'male',
    personality: (user.personality ?? 'tsundere') as 'tsundere' | 'yandere' | 'kuudere' | 'deredere' | 'himedere',
    toxicLevel: user.toxicLevel,
    mood,
    moodReason: reason,
    goals: goalsWithProgress,
    progressText: formatProgressText(goalsWithProgress),
    streakText: formatStreakText(goalsWithProgress),
    chatHistory,
  });

  // Simpan pesan user dulu sebelum panggil Gemini
  await prisma.message.create({
    data: { userId, role: 'user', content: content.trim() },
  });

  // Pakai 10 pesan terakhir sebagai history (exclude pesan terbaru yang baru disimpan)
  const last10 = messagesChronological.slice(-10);
  const history = buildGroqHistory(last10);

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: content.trim() },
  ];

  let aiText: string | null = null;
  for (const key of GROQ_KEYS) {
    try {
      const groq = new Groq({ apiKey: key });
      const result = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 1000,
      });
      aiText = result.choices[0]?.message?.content?.trim() ?? null;
      if (aiText) break;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('429') || msg.includes('rate_limit')) continue;
      return NextResponse.json({ error: 'AI error: ' + msg }, { status: 500 });
    }
  }

  if (aiText === null) {
    return NextResponse.json(
      { error: 'AI lagi sibuk, tunggu bentar terus coba lagi ya 🙏' },
      { status: 429 },
    );
  }

  // Simpan response AI
  const savedAiMsg = await prisma.message.create({
    data: { userId, role: 'ai', content: aiText },
  });

  return NextResponse.json({ message: aiText, messageId: savedAiMsg.id });
}
