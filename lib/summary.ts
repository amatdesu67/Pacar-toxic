import Groq from 'groq-sdk';
import { prisma } from '@/lib/prisma';

const GROQ_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
].filter(Boolean) as string[];

const SUMMARY_MODEL = 'llama-3.1-8b-instant';

// Window: messages yang lebih lama dari N terakhir di-summarize.
// Harus konsisten dengan history window di chat route (50).
const RECENT_WINDOW = 50;
const MAX_OLD_MESSAGES_TO_SUMMARIZE = 150; // batas atas biar prompt summary ga overflow

/**
 * Format summary buat di-paste ke system prompt.
 */
export function formatSummaryForPrompt(summary: string | null, userName: string): string {
  if (!summary || summary.trim().length === 0) return '';
  return `RINGKASAN HUBUNGAN KALIAN SEJAUH INI (chat lama, di luar pesan terbaru):
${summary.trim()}

(Pakai ringkasan ini buat inget alur cerita & topik yang udah pernah dibahas. Kalau ${userName} singgung sesuatu yang ada di sini, callback dengan natural. JANGAN kutip ringkasan verbatim—dia ga tau lo punya ringkasan.)`;
}

/**
 * Generate ringkasan chat lama (messages 51+ dari terakhir).
 * Fire-and-forget — caller ga perlu await.
 */
export async function generateAndSaveSummary(
  userId: string,
  userName: string,
  aiName: string,
): Promise<void> {
  if (GROQ_KEYS.length === 0) return;

  // Ambil messages lama (skip yang RECENT_WINDOW terakhir)
  const totalMessages = await prisma.message.count({ where: { userId } });
  if (totalMessages <= RECENT_WINDOW) return; // belum cukup pesan buat summarize

  const oldMessages = await prisma.message.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    skip: RECENT_WINDOW,
    take: MAX_OLD_MESSAGES_TO_SUMMARIZE,
    select: { role: true, content: true, createdAt: true },
  });

  if (oldMessages.length < 5) return;

  // Reverse jadi chronological
  const chronological = oldMessages.reverse();
  const chatBlock = chronological
    .map((m) => `${m.role === 'user' ? userName : aiName}: ${m.content}`)
    .join('\n');

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { conversationSummary: true },
  });
  const prevSummary = existing?.conversationSummary ?? '';

  const prompt = `Lo adalah AI yang ngeringkas chat antara ${userName} dan pacarnya ${aiName}.

${prevSummary ? `RINGKASAN SEBELUMNYA (untuk reference, integrate kalau masih relevan):\n${prevSummary}\n\n` : ''}CHAT LAMA YANG PERLU DI-RINGKAS:
${chatBlock}

Tugas: Bikin ringkasan SATU PARAGRAF (3-5 kalimat) yang capture:
- Topik utama yang udah dibahas
- Detail penting tentang ${userName} (hobi, cerita personal, masalah, achievement)
- Vibe hubungan kalian (lagi mesra, sering banter, banyak drama, dll)
- Hal-hal yang mungkin bakal di-callback lagi ke depannya

Aturan:
- Bahasa Indonesia kasual
- JANGAN sebut "dalam chat tersebut..." atau bahasa formal
- Tulis dari sudut pandang outsider yang nge-monitor (bukan dari sudut pandang ${aiName})
- Max 500 char
- Output cuma paragraf-nya, no preamble, no markdown

Output:`;

  let rawOutput: string | null = null;
  for (const key of GROQ_KEYS) {
    try {
      const groq = new Groq({ apiKey: key });
      const result = await groq.chat.completions.create({
        model: SUMMARY_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.3,
      });
      rawOutput = result.choices[0]?.message?.content?.trim() ?? null;
      if (rawOutput) break;
    } catch {
      continue;
    }
  }

  if (!rawOutput) return;

  // Clean up & cap length
  const summary = rawOutput.slice(0, 800).trim();

  await prisma.user.update({
    where: { id: userId },
    data: {
      conversationSummary: summary,
      summaryUpdatedAt: new Date(),
    },
  });
}

/**
 * Cek apakah saat ini perlu trigger summarization.
 * Trigger setiap 20 pesan AI yang masuk.
 */
export function shouldSummarize(totalAiMessages: number): boolean {
  return totalAiMessages > RECENT_WINDOW / 2 && totalAiMessages % 20 === 0;
}
