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
