import { NextResponse } from 'next/server';

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
];

type KeyStatus = 'ok' | 'rate_limited' | 'invalid' | 'missing';

async function checkKey(key: string): Promise<KeyStatus> {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return 'ok';
    if (res.status === 429) return 'rate_limited';
    return 'invalid';
  } catch {
    return 'invalid';
  }
}

export async function GET() {
  const results = await Promise.all(
    GROQ_KEYS.map(async (key, i) => {
      if (!key) return { index: i + 1, status: 'missing' as KeyStatus, label: `KEY_${i + 1}` };
      const status = await checkKey(key);
      const masked = `${key.slice(0, 8)}...${key.slice(-4)}`;
      return { index: i + 1, status, label: masked };
    }),
  );

  const active = results.filter((r) => r.status === 'ok').length;
  const configured = results.filter((r) => r.status !== 'missing').length;

  return NextResponse.json({ keys: results, active, configured });
}
