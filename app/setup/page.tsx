'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { MadeByFooter } from '@/components/MadeByFooter';

type GenderType = 'female' | 'male';
type PersonalityType = 'tsundere' | 'yandere' | 'kuudere' | 'deredere' | 'himedere';
type ModeType = 'anime' | 'realistic';

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
  const [mode, setMode] = useState<ModeType>('anime');
  const [toxicLevel, setToxicLevel] = useState(3);
  const [petNameUser, setPetNameUser] = useState('');
  const [petNameAi, setPetNameAi] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran gambar maksimal 5MB');
      return;
    }
    setError('');
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (localStorage.getItem('userId')) {
      router.replace('/chat');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) { setError('Nama lo harus diisi'); return; }
    if (!aiName.trim()) { setError('Nama pacar lo harus diisi'); return; }

    setIsLoading(true);
    setError('');

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          aiName: aiName.trim(),
          aiGender,
          personality,
          mode,
          toxicLevel,
          petNameUser: petNameUser.trim(),
          petNameAi: petNameAi.trim(),
          timezone,
        }),
      });

      const data = await res.json();

      if (data.userId) {
        if (photoFile) {
          const formData = new FormData();
          formData.append('file', photoFile);
          formData.append('userId', data.userId);
          await fetch('/api/user/avatar', { method: 'POST', body: formData }).catch(() => {});
        }
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
          <h1 className="text-3xl font-bold text-[#e9edef]">Pacar AI</h1>
          <p className="text-[#8696a0] text-sm mt-2">
            Setup dulu sebelum mulai ngobrol 💬
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#202c33] rounded-2xl p-6 space-y-5">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoSelect}
          />

          {/* Photo uploader */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full bg-[#2a3942] flex items-center justify-center text-4xl overflow-hidden relative group border-2 border-dashed border-[#3b4a54] hover:border-[#00a884] transition-colors"
            >
              {photoPreview ? (
                <Image src={photoPreview} alt="preview" fill className="object-cover" sizes="96px" unoptimized />
              ) : (
                <span>{aiGender === 'female' ? '👩' : '👨'}</span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                  <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                  <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0z" clipRule="evenodd" />
                </svg>
              </div>
            </button>
            <p className="text-[#8696a0] text-xs mt-2">
              {photoFile ? 'Klik buat ganti' : 'Foto pacar (opsional)'}
            </p>
          </div>

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

          {/* Pet names */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#8696a0] text-xs uppercase tracking-wide mb-1">
                Dia panggil lo
              </label>
              <input
                value={petNameUser}
                onChange={(e) => setPetNameUser(e.target.value)}
                placeholder="say / beb / ndut..."
                maxLength={20}
                className="w-full bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#00a884]"
              />
            </div>
            <div>
              <label className="block text-[#8696a0] text-xs uppercase tracking-wide mb-1">
                Lo panggil dia
              </label>
              <input
                value={petNameAi}
                onChange={(e) => setPetNameAi(e.target.value)}
                placeholder="ay / yang / mas..."
                maxLength={20}
                className="w-full bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#00a884]"
              />
            </div>
          </div>
          <p className="text-[#8696a0] text-xs -mt-3 leading-relaxed">
            Panggilan sayang (opsional). Kosongin kalau ga butuh.
          </p>

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

          {/* Mode toggle */}
          <div>
            <label className="block text-[#8696a0] text-xs uppercase tracking-wide mb-2">
              Mode Response
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('anime')}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'anime' ? 'bg-[#00a884] text-white' : 'bg-[#2a3942] text-[#8696a0]'
                }`}
              >
                🎌 Anime
              </button>
              <button
                type="button"
                onClick={() => setMode('realistic')}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors relative ${
                  mode === 'realistic' ? 'bg-[#00a884] text-white' : 'bg-[#2a3942] text-[#8696a0]'
                }`}
              >
                💬 Realistic
                <span className="absolute -top-1.5 -right-1.5 bg-[#f0b429] text-[#0b141a] text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  BETA
                </span>
              </button>
            </div>
            <p className="text-[#8696a0] text-xs mt-2 leading-relaxed">
              {mode === 'anime'
                ? 'Karakter anime klasik dengan trope khas (tsundere, yandere, dll).'
                : '⚠️ More immersive & emotionally realistic responses. Bisa terasa kayak chat sama mantan.'}
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

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#00a884] text-white py-3 rounded-xl font-semibold hover:bg-[#06cf9c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Memproses...' : 'Mulai Pacaran 💕'}
          </button>
        </form>

        <MadeByFooter />
      </div>
    </div>
  );
}
