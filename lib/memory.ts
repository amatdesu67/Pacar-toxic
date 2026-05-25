import Groq from 'groq-sdk';
import { prisma } from '@/lib/prisma';

export type FactCategory =
  | 'hobi'
  | 'makanan'
  | 'kerjaan'
  | 'temen'
  | 'keluarga'
  | 'insecurity'
  | 'kebiasaan'
  | 'lainnya';

const VALID_CATEGORIES: FactCategory[] = [
  'hobi', 'makanan', 'kerjaan', 'temen', 'keluarga', 'insecurity', 'kebiasaan', 'lainnya',
];

const GROQ_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
].filter(Boolean) as string[];

// Model murah & cepat khusus buat extraction (limit 14,400/hari)
const EXTRACTION_MODEL = 'llama-3.1-8b-instant';
const MAX_FACTS_PER_USER = 100;
const MAX_FACTS_INJECTED = 12;

interface ExtractedFact {
  category: FactCategory;
  content: string;
}

/**
 * Ambil ~N fakta terbaru tentang user buat di-inject ke system prompt.
 */
export async function getRecentFacts(userId: string, limit = MAX_FACTS_INJECTED) {
  return prisma.userFact.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { category: true, content: true },
  });
}

/**
 * Format fakta jadi text yang siap di-paste ke system prompt.
 */
export function formatFactsForPrompt(
  facts: Array<{ category: string; content: string }>,
  userName: string,
): string {
  if (facts.length === 0) {
    return `(Lo belum tau banyak tentang ${userName}. Anggap masih awal kenalan—tanya hal-hal kecil tentang dia secara natural.)`;
  }

  // Group by category
  const grouped: Record<string, string[]> = {};
  for (const f of facts) {
    (grouped[f.category] ??= []).push(f.content);
  }

  const lines: string[] = [];
  for (const [cat, items] of Object.entries(grouped)) {
    lines.push(`• ${cat}: ${items.join('; ')}`);
  }
  return lines.join('\n');
}

/**
 * Cek apakah fakta baru terlalu mirip dengan yang udah ada (de-dupe sederhana).
 * Pake word-overlap: kalau >50% kata sama, dianggap duplicate.
 */
function isSimilar(newContent: string, existing: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const a = norm(newContent).split(/\s+/).filter(Boolean);
  const b = new Set(norm(existing).split(/\s+/).filter(Boolean));
  if (a.length === 0) return true;
  const overlap = a.filter((w) => b.has(w)).length;
  return overlap / a.length > 0.5;
}

/**
 * Ekstrak fakta baru dari chat. Pake model murah (llama-3.1-8b).
 * Fire-and-forget — caller ga perlu await.
 */
export async function extractAndSaveFacts(
  userId: string,
  recentMessages: Array<{ role: 'user' | 'ai'; content: string }>,
  userName: string,
  aiName: string,
): Promise<void> {
  if (GROQ_KEYS.length === 0) return;
  if (recentMessages.length < 2) return;

  // Buat ringkasan chat
  const chatBlock = recentMessages
    .slice(-8)
    .map((m) => `${m.role === 'user' ? userName : aiName}: ${m.content}`)
    .join('\n');

  const extractionPrompt = `Lo adalah AI yang ekstrak FAKTA PENTING tentang ${userName} dari chat-nya sama ${aiName}.

Aturan:
- Cuma ekstrak fakta yang WORTH diinget di masa depan (preferences, nama orang, kebiasaan, cerita penting, info personal)
- SKIP: greeting, perasaan sesaat ("lagi capek"), hal yang udah obvious, fakta tentang ${aiName} (bukan user)
- Output: JSON array. Empty [] kalo ga ada fakta baru worth saving.
- Kategori yang valid: hobi, makanan, kerjaan, temen, keluarga, insecurity, kebiasaan, lainnya
- Content harus PENDEK (max ~80 char), dalam Bahasa Indonesia casual
- Cuma fakta dari pesan ${userName}, BUKAN dari ${aiName}

Format output (STRICT JSON, no markdown):
[{"category":"hobi","content":"main valorant kadang sampe pagi"}, ...]

Contoh INPUT:
${userName}: tadi gw main valorant lagi sampe pagi
${aiName}: lagi-lagi valorant, udah keberapa kali

OUTPUT:
[{"category":"hobi","content":"main valorant, kadang sampe pagi"}]

Contoh INPUT (ga ada fakta worth saving):
${userName}: hai
${aiName}: hai juga 😊

OUTPUT:
[]

Sekarang ekstrak dari chat ini:
${chatBlock}

Output JSON:`;

  let rawOutput: string | null = null;

  for (const key of GROQ_KEYS) {
    try {
      const groq = new Groq({ apiKey: key });
      const result = await groq.chat.completions.create({
        model: EXTRACTION_MODEL,
        messages: [{ role: 'user', content: extractionPrompt }],
        max_tokens: 400,
        temperature: 0.2, // low temp = consistent JSON
      });
      rawOutput = result.choices[0]?.message?.content?.trim() ?? null;
      if (rawOutput) break;
    } catch {
      continue; // try next key
    }
  }

  if (!rawOutput) return;

  // Parse JSON (model kadang nempel markdown atau text—coba ambil array-nya)
  let facts: ExtractedFact[] = [];
  try {
    const match = rawOutput.match(/\[[\s\S]*\]/);
    const json = match ? match[0] : rawOutput;
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      facts = parsed.filter(
        (f): f is ExtractedFact =>
          f &&
          typeof f === 'object' &&
          typeof f.category === 'string' &&
          typeof f.content === 'string' &&
          VALID_CATEGORIES.includes(f.category as FactCategory) &&
          f.content.length > 0 &&
          f.content.length < 200,
      );
    }
  } catch {
    return; // parse fail = skip this extraction
  }

  if (facts.length === 0) return;

  // De-dupe vs existing facts (per kategori)
  const existing = await prisma.userFact.findMany({
    where: { userId },
    select: { category: true, content: true },
  });

  const newFacts = facts.filter((f) => {
    const sameCategoryFacts = existing.filter((e) => e.category === f.category);
    return !sameCategoryFacts.some((e) => isSimilar(f.content, e.content));
  });

  if (newFacts.length === 0) return;

  // Save (cap content length 180 buat safety)
  await prisma.userFact.createMany({
    data: newFacts.map((f) => ({
      userId,
      category: f.category,
      content: f.content.slice(0, 180).trim(),
      source: 'extracted',
    })),
  });

  // Cleanup kalau udah > MAX, hapus yang paling lama
  const total = existing.length + newFacts.length;
  if (total > MAX_FACTS_PER_USER) {
    const excess = total - MAX_FACTS_PER_USER;
    const oldest = await prisma.userFact.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: excess,
      select: { id: true },
    });
    if (oldest.length > 0) {
      await prisma.userFact.deleteMany({
        where: { id: { in: oldest.map((o) => o.id) } },
      });
    }
  }
}

/**
 * Cek apakah saat ini perlu trigger extraction. Heuristic sederhana:
 * setiap 4 pesan AI, jalanin extraction.
 */
export function shouldExtract(totalAiMessages: number): boolean {
  return totalAiMessages > 0 && totalAiMessages % 4 === 0;
}
