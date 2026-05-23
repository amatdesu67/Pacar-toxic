import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import { buildSystemPrompt } from '@/lib/prompts';
import { getOrCreateDailyMood } from '@/lib/mood';
import {
  getGoalsWithProgress,
  calculateStreakScore,
  formatProgressText,
  formatStreakText,
} from '@/lib/db-helpers';

const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
  process.env.GEMINI_API_KEY_6,
  process.env.GEMINI_API_KEY_7,
  process.env.GEMINI_API_KEY_8,
  process.env.GEMINI_API_KEY_9,
  process.env.GEMINI_API_KEY_10,
].filter(Boolean) as string[];

// Konversi message DB ke format Gemini API (user/model alternating)
function buildGeminiHistory(
  dbMessages: Array<{ role: string; content: string }>,
): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
  const result: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  for (const msg of dbMessages) {
    const role: 'user' | 'model' = msg.role === 'user' ? 'user' : 'model';
    // Merge kalau role sama berturut-turut
    if (result.length > 0 && result[result.length - 1].role === role) {
      result[result.length - 1].parts[0].text += '\n' + msg.content;
    } else {
      result.push({ role, parts: [{ text: msg.content }] });
    }
  }

  // Hapus dari depan sampai diawali 'user'
  while (result.length > 0 && result[0].role !== 'user') {
    result.shift();
  }
  // Hapus dari belakang kalau terakhir bukan 'user' (pesan baru akan dikirim via sendMessage)
  if (result.length > 0 && result[result.length - 1].role !== 'user') {
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
  const history = buildGeminiHistory(last10);

  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ];

  let aiText: string | null = null;
  for (const key of GEMINI_KEYS) {
    try {
      const model = new GoogleGenerativeAI(key).getGenerativeModel({
        model: 'gemini-flash-latest',
        systemInstruction: systemPrompt,
        generationConfig: { maxOutputTokens: 1000 },
        safetySettings,
      });
      const result = await model.startChat({ history }).sendMessage(content.trim());
      aiText = result.response.text().trim();
      break;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('429')) continue;
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
