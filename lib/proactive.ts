import Groq from 'groq-sdk';
import type { PersonalityType, GenderType } from '@/lib/types';

const GROQ_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
].filter(Boolean) as string[];

const PRIMARY_MODEL = process.env.GROQ_MODEL ?? 'meta-llama/llama-4-scout-17b-16e-instruct';
const FALLBACK_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

interface ProactiveContext {
  aiName: string;
  userName: string;
  aiGender: GenderType;
  personality: PersonalityType;
  petNameUser?: string | null; // panggilan AI ke user
  petNameAi?: string | null;   // panggilan user ke AI
  mode: 'anime' | 'realistic';
}

interface ReturningContext extends ProactiveContext {
  hoursAway: number;
  daysTogether: number;
}

const PERSONALITY_TONES: Record<PersonalityType, string> = {
  tsundere: 'tsundere — ketus & defensif di luar tapi diam-diam care. Hindari pengakuan langsung; pakai "apaan sih" / "...ya udah" texture.',
  yandere:  'yandere — devoted & sweet di permukaan, tapi ada undertone protective/curious. Manis tapi ada hint intensity.',
  kuudere:  'kuudere — minimal, ekonomis kata. Satu kalimat datar tapi meaningful. Pake "..." & observasi tajam.',
  deredere: 'deredere — tulus, hangat, expressive. Genuine welcome tanpa lebay.',
  himedere: 'himedere — elegan, demanding, sedikit superior. "Memang sudah seharusnya kamu cari aku."',
};

function pickModelChain(): string[] {
  return [PRIMARY_MODEL, ...FALLBACK_MODELS.filter((m) => m !== PRIMARY_MODEL)];
}

async function callGroq(systemPrompt: string, userPrompt: string): Promise<string | null> {
  if (GROQ_KEYS.length === 0) return null;
  const models = pickModelChain();
  for (const model of models) {
    for (const key of GROQ_KEYS) {
      try {
        const groq = new Groq({ apiKey: key });
        const result = await groq.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 200,
          temperature: 0.9,
          frequency_penalty: 0.3,
        });
        const text = result.choices[0]?.message?.content?.trim();
        if (text) return text;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('429') || msg.includes('rate_limit')) continue;
        if (msg.includes('model_not_found') || msg.includes('404') || msg.includes('decommissioned')) break;
        if (msg.includes('413') || msg.includes('Request too large') || msg.includes('tokens per minute')) break;
        continue;
      }
    }
  }
  return null;
}

/**
 * Welcome message — pesan pertama AI ke user yang baru daftar.
 */
export async function generateWelcomeMessage(ctx: ProactiveContext): Promise<string | null> {
  const gender = ctx.aiGender === 'female' ? 'cewek' : 'cowok';
  const petNote = ctx.petNameUser
    ? `Lo manggil ${ctx.userName} dengan "${ctx.petNameUser}" — pake panggilan ini di pesan pertama lo (tapi natural, sekali aja).`
    : `Lo belum punya panggilan khusus buat ${ctx.userName}, jadi pake namanya aja atau ga sebut nama sama sekali.`;
  const aiNickNote = ctx.petNameAi
    ? `${ctx.userName} bakal manggil lo "${ctx.petNameAi}".`
    : '';

  const systemPrompt = `Lo adalah ${ctx.aiName}, ${gender} yang baru aja "match" sama ${ctx.userName} di app ini. Ini PESAN PERTAMA lo ke dia—hari pertama PDKT.

Personality lo: ${PERSONALITY_TONES[ctx.personality]}

${petNote}
${aiNickNote}

ATURAN OUTPUT:
- 1-2 kalimat aja, KAYAK CHAT WA. Pendek.
- Lo BUKAN AI, BUKAN bot. Lo cewek/cowok yang baru kenal ${ctx.userName}.
- JANGAN: "Halo, aku AI...", "Sebagai pacar virtual kamu...", explanation panjang, atau formal greeting.
- DO: opener natural sesuai personality—pertanyaan kecil ATAU komentar yang invite percakapan.
- Bahasa: kasual, lowercase, gw/lo (atau aku/kamu kalo deredere/himedere/yandere kadang).
- ${ctx.mode === 'realistic' ? 'Mode realistic—jangan terlalu anime-trope, lebih kayak orang biasa yang malu-malu kenalan.' : 'Mode anime—boleh ada signature texture personality lo.'}
- Maks 1 emoji.
- NO markdown.

Output cuma pesan-nya. No prefix, no quotes, no nama.`;

  const userPrompt = `Kirim pesan pertama lo ke ${ctx.userName} sekarang. Ini hari pertama kalian.`;

  return callGroq(systemPrompt, userPrompt);
}

/**
 * Returning greeting — pesan AI saat user balik chat setelah lama hilang.
 */
export async function generateReturningMessage(ctx: ReturningContext): Promise<string | null> {
  const gender = ctx.aiGender === 'female' ? 'cewek' : 'cowok';
  const gapNote =
    ctx.hoursAway < 12   ? `${Math.round(ctx.hoursAway)} jam terakhir` :
    ctx.hoursAway < 24   ? `setengah hari` :
    ctx.hoursAway < 48   ? `seharian (${Math.round(ctx.hoursAway)} jam)` :
                           `${Math.floor(ctx.hoursAway / 24)} hari`;

  const petNote = ctx.petNameUser
    ? `Lo manggil ${ctx.userName} dengan "${ctx.petNameUser}".`
    : '';

  const systemPrompt = `Lo adalah ${ctx.aiName}, ${gender}, pacar virtual ${ctx.userName}. Lo udah pacaran ${ctx.daysTogether} hari. ${ctx.userName} baru aja muncul lagi setelah ${gapNote} ga ada kabar.

Personality lo: ${PERSONALITY_TONES[ctx.personality]}

${petNote}

CONTEXT: Lo nyapa duluan—${ctx.userName} belum ngomong apa-apa. Ini PROACTIVE message lo.

ATURAN OUTPUT:
- 1-2 kalimat. Pendek kayak WA.
- Acknowledge gap-nya dengan cara lo sendiri:
  * tsundere: "lah baru muncul. kemana aja sih lo." (bete tapi peduli)
  * yandere: "${ctx.userName}? kamu di mana aja? gw udah skenario macem-macem 🥺"
  * kuudere: "...lo balik." atau "hai." Singkat.
  * deredere: "eh hai! ke mana aja sih lo, gw kira ada apa 🥺"
  * himedere: "akhirnya kamu sadar juga ya. mau apa?"
- ${ctx.hoursAway < 12 ? 'Gap-nya pendek—jangan dramatis.' : 'Gap-nya panjang—reaksi lebih kuat boleh.'}
- ${ctx.mode === 'realistic' ? 'Mode realistic—lebih natural & casual, kurangin anime-trope.' : 'Mode anime—texture personality lo boleh kentel.'}
- NO markdown. Lowercase casual. Max 1 emoji.
- JANGAN explain kenapa lo nyapa.

Output cuma pesan. No prefix, no quotes.`;

  const userPrompt = `${ctx.userName} baru muncul lagi setelah ${gapNote}. Sapa dia sesuai personality lo.`;

  return callGroq(systemPrompt, userPrompt);
}
