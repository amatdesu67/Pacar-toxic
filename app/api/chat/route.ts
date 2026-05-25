import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { prisma } from '@/lib/prisma';
import { buildSystemPrompt } from '@/lib/prompts';
import { buildRealisticPrompt, computeRelationshipState } from '@/lib/prompts-realistic';
import { getOrCreateDailyMood } from '@/lib/mood';
import { guardRequest } from '@/lib/security';
import { calculateDaysTogether } from '@/lib/db-helpers';
import { getRelationshipStage, type SystemPromptContext } from '@/lib/types';

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

// Model bisa di-override via env var. Default: llama-4-scout (proven nyentil + TPM cukup).
// gpt-oss-120b lebih capable tapi TPM 8K-nya kekecilan buat system prompt kita yang complex.
const PRIMARY_MODEL = process.env.GROQ_MODEL ?? 'meta-llama/llama-4-scout-17b-16e-instruct';
const FALLBACK_MODELS = [
  'llama-3.3-70b-versatile',                    // proven mid-tier
  'openai/gpt-oss-120b',                        // capable banget tapi TPM 8K, butuh prompt pendek
  'llama-3.1-8b-instant',                       // last resort, limit longgar, shallow
];

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
  // Guard: cek origin + rate limit (30 chat per IP per jam)
  const blocked = guardRequest(request, {
    rateLimit: { limit: 30, windowMs: 60 * 60 * 1000 },
  });
  if (blocked) return blocked;

  const body = await request.json();
  const { userId, content } = body as { userId: string; content: string };

  if (!userId || !content?.trim()) {
    return NextResponse.json({ error: 'Missing userId or content' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const recentMessages = await prisma.message.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { role: true, content: true, createdAt: true },
  });

  const daysTogether = calculateDaysTogether(user.createdAt);
  const stage = getRelationshipStage(daysTogether);
  const { mood, reason } = await getOrCreateDailyMood(userId, stage);

  const messagesChronological = [...recentMessages].reverse();

  // Buat ringkasan chat untuk system prompt
  const chatHistory =
    messagesChronological.length > 0
      ? messagesChronological
          .map((m) => `${m.role === 'user' ? user.name : user.aiName}: ${m.content}`)
          .join('\n')
      : '(belum ada riwayat chat)';

  const promptCtx: SystemPromptContext = {
    userName: user.name,
    aiName: user.aiName,
    aiGender: user.aiGender as 'female' | 'male',
    personality: (user.personality ?? 'tsundere') as 'tsundere' | 'yandere' | 'kuudere' | 'deredere' | 'himedere',
    toxicLevel: user.toxicLevel,
    mood,
    moodReason: reason,
    petNameUser: user.petNameUser,
    petNameAi: user.petNameAi,
    daysTogether,
    stage,
    chatHistory,
  };

  const userMode = (user.mode ?? 'anime') as 'anime' | 'realistic';
  let systemPrompt: string;

  if (userMode === 'realistic') {
    const { state, reason: stateReason } = computeRelationshipState(
      messagesChronological as Array<{ role: 'user' | 'ai'; content: string; createdAt: Date }>,
      user.name,
    );
    systemPrompt = buildRealisticPrompt(promptCtx, state, stateReason);
  } else {
    systemPrompt = buildSystemPrompt(promptCtx);
  }

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

  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS.filter((m) => m !== PRIMARY_MODEL)];

  let aiText: string | null = null;
  outer: for (const model of modelsToTry) {
    for (const key of GROQ_KEYS) {
      try {
        const groq = new Groq({ apiKey: key });
        const result = await groq.chat.completions.create({
          model,
          messages,
          max_tokens: 1000,
          temperature: 0.85,
          frequency_penalty: 0.3,
          presence_penalty: 0.2,
        });
        aiText = result.choices[0]?.message?.content?.trim() ?? null;
        if (aiText) break outer;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        // Rate-limited per-key → coba key berikutnya dengan model yang sama
        if (msg.includes('429') || msg.includes('rate_limit')) continue;
        // Model ga tersedia / decommissioned → langsung skip ke model fallback
        if (msg.includes('model_not_found') || msg.includes('404') || msg.includes('decommissioned')) {
          break;
        }
        // TPM/context limit → model ini ga muat prompt kita, skip ke fallback yang TPM-nya lebih besar
        if (msg.includes('413') || msg.includes('Request too large') || msg.includes('tokens per minute') || msg.includes('context_length')) {
          break;
        }
        return NextResponse.json({ error: 'AI error: ' + msg }, { status: 500 });
      }
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
