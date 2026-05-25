/**
 * Time context buat AI—bikin dia tau jam berapa, hari apa, weekend atau bukan.
 * Pake Intl.DateTimeFormat dengan timezone target supaya konsisten lintas region server.
 *
 * Default timezone: Asia/Jakarta (UTC+7). Frontend kirim timezone user dari
 * Intl.DateTimeFormat().resolvedOptions().timeZone — fallback ke default
 * kalau ga ada.
 */

export type TimeOfDay = 'pagi' | 'siang' | 'sore' | 'malem' | 'tengah_malem';

export interface TimeInfo {
  timeOfDay: TimeOfDay;
  dayName: string;     // "Senin", "Selasa", ...
  dateLong: string;    // "Minggu, 25 Mei 2026"
  timeStr: string;     // "14:30"
  hour: number;        // 0-23
  isWeekend: boolean;
  timezone: string;    // "Asia/Jakarta"
}

const DEFAULT_TZ = 'Asia/Jakarta';

function safeTimezone(input?: string | null): string {
  if (!input) return DEFAULT_TZ;
  try {
    // Validate dengan format dummy
    new Intl.DateTimeFormat('en-US', { timeZone: input });
    return input;
  } catch {
    return DEFAULT_TZ;
  }
}

export function buildTimeContext(timezone?: string | null): TimeInfo {
  const tz = safeTimezone(timezone);
  const now = new Date();

  // Hour dalam timezone target
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  }).format(now);
  const hour = parseInt(hourStr, 10);

  let timeOfDay: TimeOfDay;
  if (hour >= 4 && hour < 11) timeOfDay = 'pagi';
  else if (hour >= 11 && hour < 15) timeOfDay = 'siang';
  else if (hour >= 15 && hour < 18) timeOfDay = 'sore';
  else if (hour >= 18 && hour < 24) timeOfDay = 'malem';
  else timeOfDay = 'tengah_malem';

  const dayName = new Intl.DateTimeFormat('id-ID', {
    timeZone: tz,
    weekday: 'long',
  }).format(now);

  const dateLong = new Intl.DateTimeFormat('id-ID', {
    timeZone: tz,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);

  const timeStr = new Intl.DateTimeFormat('id-ID', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);

  const isWeekend = dayName === 'Sabtu' || dayName === 'Minggu';

  return { timeOfDay, dayName, dateLong, timeStr, hour, isWeekend, timezone: tz };
}

const TIME_OF_DAY_LABEL: Record<TimeOfDay, string> = {
  pagi: 'pagi',
  siang: 'siang',
  sore: 'sore',
  malem: 'malem',
  tengah_malem: 'tengah malem (dini hari)',
};

/**
 * Format buat di-paste ke system prompt.
 */
export function formatTimeForPrompt(t: TimeInfo): string {
  const tod = TIME_OF_DAY_LABEL[t.timeOfDay];
  const weekendNote = t.isWeekend ? ', weekend' : '';
  return `Sekarang ${t.dateLong}, jam ${t.timeStr} (${tod}${weekendNote}).`;
}

/**
 * Build flow context — gimana state chat sekarang (continuous, kembali habis hilang, brand new).
 * Penting biar AI ga react kayak "baru muncul" padahal user lagi chat aktif barusan.
 */
export function formatFlowForPrompt(
  prevUserMessageAt: Date | string | null | undefined,
): string {
  if (!prevUserMessageAt) {
    return `STATUS FLOW: Ini pesan pertama user di sesi ini (atau ga ada history). Treat sebagai opener.`;
  }

  const prev = new Date(prevUserMessageAt).getTime();
  const now = Date.now();
  const seconds = Math.max(0, (now - prev) / 1000);

  if (seconds < 60) {
    return `STATUS FLOW: User lagi aktif chat—pesan sebelumnya cuma ${Math.round(seconds)} detik lalu. Ini CONTINUOUS conversation. JANGAN sekali-kali react kayak "lah baru muncul" / "kemana aja" / "akhirnya bales"—dia LAGI di sini, lagi ngobrol sama lo. Sambungin pesan ini ke konteks pesan sebelumnya.`;
  }

  if (seconds < 600) {
    const mins = Math.round(seconds / 60);
    return `STATUS FLOW: Pesan sebelumnya ${mins} menit lalu. Masih mid-conversation. JANGAN react absence ("baru muncul", "kemana aja"). Anggap dia masih di sini.`;
  }

  if (seconds < 3600) {
    const mins = Math.round(seconds / 60);
    return `STATUS FLOW: Pesan sebelumnya ${mins} menit lalu. Ada jeda kecil tapi belum lama. Sambungin natural, kalo mau komentar gap-nya boleh dikit ("eh balik lagi" atau "udah selesai?") tapi jangan dramatis.`;
  }

  if (seconds < 6 * 3600) {
    const hours = Math.round(seconds / 3600);
    return `STATUS FLOW: User balik chat setelah ${hours} jam ga ada kabar. Sesuaikan reaksi sama personality lo—boleh subtle bilang "balik" atau "kemana aja" sesuai gaya lo.`;
  }

  const hours = Math.round(seconds / 3600);
  return `STATUS FLOW: User udah ${hours} jam ga ada kabar—gap-nya lumayan. Boleh react sesuai personality (tsundere bete halus, yandere worried, dll). Tapi jangan over-dramatis.`;
}
