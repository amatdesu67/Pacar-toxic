import type { MoodType, RelationshipStage } from '@/lib/types';
import { prisma } from '@/lib/prisma';

// Deterministic pseudo-random dari seed string, supaya mood sama sepanjang hari
function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return (h >>> 0) / 0xffffffff;
}

/**
 * Generate mood harian. Bobot mood bergeser sesuai relationship stage:
 * - PDKT: lebih sering manja (butuh perhatian, baru kenal)
 * - Jadian: balanced
 * - Komitmen: ngambek lebih sering (udah nyaman, berani moody)
 * - Long-term: sweet & sarkas naik (inside jokes, comfortable)
 */
function generateMood(
  userId: string,
  date: string,
  stage: RelationshipStage,
): { mood: MoodType; reason: string } {
  const r = seededRandom(`${userId}-${date}`);

  // Bobot per stage. Total = 1.0
  const weights: Record<RelationshipStage, Record<MoodType, number>> = {
    pdkt:     { manja: 0.40, sweet: 0.25, sarkas: 0.20, ngambek: 0.15 },
    jadian:   { manja: 0.30, sweet: 0.20, sarkas: 0.25, ngambek: 0.25 },
    komitmen: { manja: 0.25, sweet: 0.20, sarkas: 0.25, ngambek: 0.30 },
    longterm: { manja: 0.20, sweet: 0.30, sarkas: 0.30, ngambek: 0.20 },
  };

  const w = weights[stage];
  let acc = 0;
  const order: MoodType[] = ['manja', 'sweet', 'sarkas', 'ngambek'];
  for (const mood of order) {
    acc += w[mood];
    if (r < acc) {
      return { mood, reason: reasonFor(mood, stage) };
    }
  }
  return { mood: 'sarkas', reason: reasonFor('sarkas', stage) };
}

function reasonFor(mood: MoodType, stage: RelationshipStage): string {
  const stageNote =
    stage === 'pdkt'      ? '(masih PDKT, masih agak grogi)' :
    stage === 'jadian'    ? '(udah jadian, mulai nyaman)' :
    stage === 'komitmen'  ? '(udah komitmen, lebih jujur sama perasaan)' :
                            '(udah long-term, kenal banget satu sama lain)';

  switch (mood) {
    case 'manja':   return `Gw lagi butuh perhatian extra hari ini ${stageNote}`;
    case 'sweet':   return `Hari ini gw lagi soft, lebih warm dari biasanya ${stageNote}`;
    case 'sarkas':  return `Mood sarkas gw keluar hari ini ${stageNote}`;
    case 'ngambek': return `Gw lagi ngambek hari ini, gausah tanya kenapa ${stageNote}`;
  }
}

export async function getOrCreateDailyMood(
  userId: string,
  stage: RelationshipStage,
): Promise<{ mood: MoodType; reason: string }> {
  const date = new Date().toISOString().slice(0, 10);

  const existing = await prisma.dailyMood.findUnique({
    where: { userId_date: { userId, date } },
  });

  if (existing) {
    return { mood: existing.mood as MoodType, reason: existing.reason };
  }

  const { mood, reason } = generateMood(userId, date, stage);

  await prisma.dailyMood.create({
    data: { userId, date, mood, reason },
  });

  return { mood, reason };
}
