'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type GenderType = 'female' | 'male';
type PersonalityType = 'tsundere' | 'yandere' | 'kuudere' | 'deredere' | 'himedere';

const TOXIC_LABELS: Record<number, string> = {
  1: 'Halus banget',
  2: 'Mulai keliatan',
  3: 'Lumayan berasa',
  4: 'Kental banget',
  5: 'Full throttle',
};

const PERSONALITIES: Array<{
  id: PersonalityType;
  emoji: string;
  label: string;
  tagline: string;
}> = [
  { id: 'tsundere', emoji: '😤', label: 'Tsundere', tagline: 'B-bukan berarti gw peduli...' },
  { id: 'yandere',  emoji: '🔪', label: 'Yandere',  tagline: 'Lo ga kemana-mana kan?' },
  { id: 'kuudere',  emoji: '🧊', label: 'Kuudere',  tagline: '...oke.' },
  { id: 'deredere', emoji: '🥰', label: 'Deredere', tagline: 'Aku suka banget sama lo ><' },
  { id: 'himedere', emoji: '👑', label: 'Himedere', tagline: 'Kamu beruntung gw mau ngobrol.' },
];

export default function SetupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [aiName, setAiName] = useState('Dira');
  const [aiGender, setAiGender] = useState<GenderType>('female');
  const [personality, setPersonality] = useState<PersonalityType>('tsundere');
  const [toxicLevel, setToxicLevel] = useState(3);
  const [goals, setGoals] = useState(['']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (localStorage.getItem('userId')) {
      router.replace('/chat');
    }
  }, [router]);

  const addGoal = () => {
    if (goals.length < 5) setGoals([...goals, '']);
  };

  const removeGoal = (index: number) => {
    if (goals.length > 1) setGoals(goals.filter((_, i) => i !== index));
  };

  const updateGoal = (index: number, value: string) => {
    setGoals(goals.map((g, i) => (i === index ? value : g)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validGoals = goals.filter((g) => g.trim());

    if (!name.trim()) { setError('Nama lo harus diisi'); return; }
    if (!aiName.trim()) { setError('Nama pacar lo harus diisi'); return; }
    if (validGoals.length === 0) { setError('Minimal 1 goal harus diisi'); return; }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), aiName: aiName.trim(), aiGender, personality, toxicLevel, goals: validGoals }),
      });

      const data = await res.json();

      if (data.userId) {
        localStorage.setItem('userId', data.userId);
        router.replace('/chat');
      } else {
        setError(data.error ?? 'Gagal setup, coba lagi');
      }
    } catch {
      setError('Gagal konek ke server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b141a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#e9edef]">AI Pacar Toxic</h1>
          <p className="text-[#8696a0] text-sm mt-2">
            Setup dulu sebelum mulai drama 💔
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#202c33] rounded-2xl p-6 space-y-5">
          {/* Nama user */}
          <div>
            <label className="block text-[#8696a0] text-xs uppercase tracking-wide mb-1">
              Nama lo
            </label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="Nama lo siapa?"
              maxLength={30}
              className="w-full bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#00a884]"
            />
          </div>

          {/* Nama AI */}
          <div>
            <label className="block text-[#8696a0] text-xs uppercase tracking-wide mb-1">
              Nama pacar AI lo
            </label>
            <input
              value={aiName}
              onChange={(e) => setAiName(e.target.value)}
              placeholder="Default: Dira"
              maxLength={20}
              className="w-full bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#00a884]"
            />
          </div>

          {/* Gender AI */}
          <div>
            <label className="block text-[#8696a0] text-xs uppercase tracking-wide mb-1">
              Gender AI
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAiGender('female')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  aiGender === 'female' ? 'bg-[#00a884] text-white' : 'bg-[#2a3942] text-[#8696a0]'
                }`}
              >
                👩 Cewek
              </button>
              <button
                type="button"
                onClick={() => setAiGender('male')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  aiGender === 'male' ? 'bg-[#00a884] text-white' : 'bg-[#2a3942] text-[#8696a0]'
                }`}
              >
                👨 Cowok
              </button>
            </div>
          </div>

          {/* Personality picker */}
          <div>
            <label className="block text-[#8696a0] text-xs uppercase tracking-wide mb-2">
              Sifat
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {PERSONALITIES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPersonality(p.id)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-center transition-colors ${
                    personality === p.id
                      ? 'bg-[#00a884] text-white'
                      : 'bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef]'
                  }`}
                >
                  <span className="text-lg leading-none">{p.emoji}</span>
                  <span className="text-[11px] font-medium leading-tight">{p.label}</span>
                </button>
              ))}
            </div>
            {/* Tagline */}
            <p className="text-[#8696a0] text-xs mt-2 italic text-center">
              &ldquo;{PERSONALITIES.find((p) => p.id === personality)?.tagline}&rdquo;
            </p>
          </div>

          {/* Intensity slider */}
          <div>
            <label className="block text-[#8696a0] text-xs uppercase tracking-wide mb-1">
              Intensitas:{' '}
              <span className="text-[#00a884] normal-case font-medium">
                {TOXIC_LABELS[toxicLevel]}
              </span>
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={toxicLevel}
              onChange={(e) => setToxicLevel(Number(e.target.value))}
              className="w-full accent-[#00a884] mt-1"
            />
            <div className="flex justify-between text-[#8696a0] text-[11px] mt-1">
              <span>1 · Halus</span>
              <span>5 · Ekstrem</span>
            </div>
          </div>

          {/* Goals */}
          <div>
            <label className="block text-[#8696a0] text-xs uppercase tracking-wide mb-2">
              Daily Goals lo (1–5)
            </label>
            <div className="space-y-2">
              {goals.map((goal, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={goal}
                    onChange={(e) => updateGoal(i, e.target.value)}
                    placeholder={`Goal ${i + 1}… contoh: "olahraga 30 menit"`}
                    maxLength={60}
                    className="flex-1 bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#00a884]"
                  />
                  {goals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGoal(i)}
                      className="text-[#8696a0] hover:text-red-400 transition-colors px-1 text-lg leading-none"
                      aria-label="Hapus goal"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {goals.length < 5 && (
                <button
                  type="button"
                  onClick={addGoal}
                  className="text-[#00a884] text-sm hover:text-[#06cf9c] transition-colors"
                >
                  + Tambah goal
                </button>
              )}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#00a884] text-white py-3 rounded-xl font-semibold hover:bg-[#06cf9c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Memproses...' : 'Mulai Drama 💔'}
          </button>
        </form>
      </div>
    </div>
  );
}
