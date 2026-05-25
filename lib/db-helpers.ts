/**
 * Hitung berapa hari sejak user dibuat (anniversary counter).
 * 0 = baru dibuat hari ini, 1 = kemarin, dst.
 */
export function calculateDaysTogether(createdAt: Date | string): number {
  const start = new Date(createdAt).getTime();
  const now = Date.now();
  const diffMs = now - start;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Cek apakah hari ini milestone spesial (7, 30, 100, 365 hari, dll).
 * Return label kalo iya, null kalo bukan.
 */
export function getMilestoneLabel(daysTogether: number): string | null {
  const milestones: Record<number, string> = {
    1: '1 hari',
    7: '1 minggu',
    30: '1 bulan',
    50: '50 hari',
    100: '100 hari',
    180: '6 bulan',
    365: '1 tahun',
    730: '2 tahun',
  };
  return milestones[daysTogether] ?? null;
}

/**
 * Format anniversary text buat ditampilin di UI atau prompt context.
 */
export function formatAnniversaryText(daysTogether: number): string {
  const milestone = getMilestoneLabel(daysTogether);
  if (milestone) {
    return `🎉 Hari ini ${milestone} kalian bareng (${daysTogether} hari)!`;
  }
  return `${daysTogether} hari bareng`;
}
