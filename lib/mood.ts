import type { MoodType } from '@/lib/types';
import { prisma } from '@/lib/prisma';

// Deterministic pseudo-random dari seed string, supaya mood sama sepanjang hari
function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return (h >>> 0) / 0xffffffff;
}

function generateMood(
  userId: string,
  date: string,
  streakScore: number,
): { mood: MoodType; reason: string } {
  const r = seededRandom(`${userId}-${date}`);

  // Sweet jarang (12%), tapi lebih sering kalau streak bagus
  const sweetThreshold = streakScore > 0.7 ? 0.25 : 0.12;

  if (r < sweetThreshold) {
    return {
      mood: 'sweet',
      reason:
        streakScore > 0.7
          ? 'Lo lagi on fire dengan streak-nya, jadi gw seneng banget hari ini'
          : 'Kadang gw juga bisa sweet, itu aja',
    };
  }

  if (r < sweetThreshold + 0.3) {
    return {
      mood: 'manja',
      reason: 'Gw lagi butuh perhatian lo hari ini',
    };
  }

  if (r < sweetThreshold + 0.6) {
    return {
      mood: 'ngambek',
      reason:
        streakScore < 0.3
          ? 'Lo udah kurang rajin belakangan ini, wajar dong gw ngambek'
          : 'Gw emang lagi ngambek aja, gausah tanya kenapa',
    };
  }

  return {
    mood: 'sarkas',
    reason: 'Mood sarkas gw lagi keluar hari ini',
  };
}

export async function getOrCreateDailyMood(
  userId: string,
  streakScore: number,
): Promise<{ mood: MoodType; reason: string }> {
  const date = new Date().toISOString().slice(0, 10);

  const existing = await prisma.dailyMood.findUnique({
    where: { userId_date: { userId, date } },
  });

  if (existing) {
    return { mood: existing.mood as MoodType, reason: existing.reason };
  }

  const { mood, reason } = generateMood(userId, date, streakScore);

  await prisma.dailyMood.create({
    data: { userId, date, mood, reason },
  });

  return { mood, reason };
}
