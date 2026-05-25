'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type GenderType = 'female' | 'male';
type PersonalityType = 'tsundere' | 'yandere' | 'kuudere' | 'deredere' | 'himedere';
type ModeType = 'anime' | 'realistic';

interface UserInfo {
  id: string;
  name: string;
  aiName: string;
  aiGender: GenderType;
  personality: PersonalityType;
  mode: ModeType;
  toxicLevel: number;
  petNameUser: string | null;
  petNameAi: string | null;
  aiPhotoUrl: string | null;
}

const TOXIC_LABELS: Record<number, string> = {
  1: 'Halus banget', 2: 'Mulai keliatan', 3: 'Lumayan berasa', 4: 'Kental banget', 5: 'Full throttle',
};

const PERSONALITIES: Array<{ id: PersonalityType; emoji: string; label: string }> = [
  { id: 'tsundere', emoji: '😤', label: 'Tsundere' },
  { id: 'yandere',  emoji: '🔪', label: 'Yandere' },
  { id: 'kuudere',  emoji: '🧊', label: 'Kuudere' },
  { id: 'deredere', emoji: '🥰', label: 'Deredere' },
  { id: 'himedere', emoji: '👑', label: 'Himedere' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      router.replace('/setup');
      return;
    }
    fetch(`/api/user?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user);
        else router.replace('/setup');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const updateField = <K extends keyof UserInfo>(key: K, value: UserInfo[K]) => {
    if (!user) return;
    setUser({ ...user, [key]: value });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: user.name,
          aiName: user.aiName,
          aiGender: user.aiGender,
          personality: user.personality,
          mode: user.mode,
          toxicLevel: user.toxicLevel,
          petNameUser: user.petNameUser ?? '',
          petNameAi: user.petNameAi ?? '',
        }),
      });
      const data = await res.json();
      if (data.user) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(data.error ?? 'Gagal simpan');
      }
    } catch {
      setError('Gagal konek ke server');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { setError('File harus berupa gambar'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Maks 5MB'); return; }

    setIsUploadingPhoto(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.id);
      const res = await fetch('/api/user/avatar', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) setUser({ ...user, aiPhotoUrl: data.url });
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogout = () => {
    if (!confirm('Yakin mau logout? Semua data tetap tersimpan, tinggal login ulang nanti pake ID yang sama.')) return;
    localStorage.removeItem('userId');
    router.replace('/setup');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0b141a] flex items-center justify-center">
        <p className="text-[#8696a0] text-sm animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b141a] flex flex-col max-w-2xl mx-auto">
      {/* Header (flat, no shadow) */}
      <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3 sticky top-0 z-10 border-b border-[#2a3942]">
        <a href="/chat" className="text-[#8696a0] hover:text-[#e9edef] transition-colors p-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M7.28 7.72a.75.75 0 010 1.06l-2.47 2.47H21a.75.75 0 010 1.5H4.81l2.47 2.47a.75.75 0 11-1.06 1.06l-3.75-3.75a.75.75 0 010-1.06l3.75-3.75a.75.75 0 011.06 0z" clipRule="evenodd" />
          </svg>
        </a>
        <div className="flex-1 min-w-0">
          <p className="text-[#e9edef] font-semibold text-sm">Settings</p>
          <p className="text-[#8696a0] text-xs">Edit profil & pacar</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 space-y-4">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />

        {/* Photo */}
        <div className="bg-[#202c33] rounded-2xl p-5 flex flex-col items-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 rounded-full bg-[#2a3942] flex items-center justify-center text-4xl overflow-hidden relative group"
            disabled={isUploadingPhoto}
          >
            {user.aiPhotoUrl ? (
              <Image src={user.aiPhotoUrl} alt="pacar" fill className="object-cover" sizes="96px" />
            ) : (
              <span>{user.aiGender === 'female' ? '👩' : '👨'}</span>
            )}
            {isUploadingPhoto && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!isUploadingPhoto && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                  <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                  <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
          <p className="text-[#8696a0] text-xs mt-2">Klik buat ganti foto</p>
        </div>

        {/* Identitas */}
        <div className="bg-[#202c33] rounded-2xl p-5 space-y-4">
          <p className="text-[#e9edef] text-sm font-semibold">Identitas</p>

          <div>
            <label className="block text-[#8696a0] text-xs uppercase tracking-wide mb-1.5">Nama lo</label>
            <input
              value={user.name}
              onChange={(e) => updateField('name', e.target.value)}
              maxLength={30}
              className="w-full bg-[#2a3942] text-[#e9edef] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#00a884]"
            />
          </div>

          <div>
            <label className="block text-[#8696a0] text-xs uppercase tracking-wide mb-1.5">Nama pacar</label>
            <input
              value={user.aiName}
              onChange={(e) => updateField('aiName', e.target.value)}
              maxLength={20}
              className="w-full bg-[#2a3942] text-[#e9edef] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#00a884]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#8696a0] text-xs uppercase tracking-wide mb-1.5">Dia panggil lo</label>
              <input
                value={user.petNameUser ?? ''}
                onChange={(e) => updateField('petNameUser', e.target.value || null)}
                placeholder="say / beb..."
                maxLength={20}
                className="w-full bg-[#2a3942] text-[#e9edef] placeholder-[#5a6a72] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#00a884]"
              />
            </div>
            <div>
              <label className="block text-[#8696a0] text-xs uppercase tracking-wide mb-1.5">Lo panggil dia</label>
              <input
                value={user.petNameAi ?? ''}
                onChange={(e) => updateField('petNameAi', e.target.value || null)}
                placeholder="ay / yang..."
                maxLength={20}
                className="w-full bg-[#2a3942] text-[#e9edef] placeholder-[#5a6a72] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#00a884]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#8696a0] text-xs uppercase tracking-wide mb-1.5">Gender pacar</label>
            <div className="flex gap-2">
              <button
                onClick={() => updateField('aiGender', 'female')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  user.aiGender === 'female' ? 'bg-[#00a884] text-white' : 'bg-[#2a3942] text-[#8696a0]'
                }`}
              >
                👩 Cewek
              </button>
              <button
                onClick={() => updateField('aiGender', 'male')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  user.aiGender === 'male' ? 'bg-[#00a884] text-white' : 'bg-[#2a3942] text-[#8696a0]'
                }`}
              >
                👨 Cowok
              </button>
            </div>
          </div>
        </div>

        {/* Behavior */}
        <div className="bg-[#202c33] rounded-2xl p-5 space-y-4">
          <p className="text-[#e9edef] text-sm font-semibold">Sifat & Mode</p>

          <div>
            <label className="block text-[#8696a0] text-xs uppercase tracking-wide mb-2">Sifat</label>
            <div className="grid grid-cols-5 gap-1.5">
              {PERSONALITIES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => updateField('personality', p.id)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-center transition-colors ${
                    user.personality === p.id ? 'bg-[#00a884] text-white' : 'bg-[#2a3942] text-[#8696a0]'
                  }`}
                >
                  <span className="text-lg leading-none">{p.emoji}</span>
                  <span className="text-[11px] font-medium leading-tight">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[#8696a0] text-xs uppercase tracking-wide mb-2">Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => updateField('mode', 'anime')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  user.mode === 'anime' ? 'bg-[#00a884] text-white' : 'bg-[#2a3942] text-[#8696a0]'
                }`}
              >
                🎌 Anime
              </button>
              <button
                onClick={() => updateField('mode', 'realistic')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                  user.mode === 'realistic' ? 'bg-[#00a884] text-white' : 'bg-[#2a3942] text-[#8696a0]'
                }`}
              >
                💬 Realistic
                <span className="absolute -top-1.5 -right-1.5 bg-[#f0b429] text-[#0b141a] text-[9px] font-bold px-1.5 py-0.5 rounded-full">BETA</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[#8696a0] text-xs uppercase tracking-wide mb-1.5">
              Intensitas: <span className="text-[#00a884] normal-case font-medium">{TOXIC_LABELS[user.toxicLevel]}</span>
            </label>
            <input
              type="range" min={1} max={5} value={user.toxicLevel}
              onChange={(e) => updateField('toxicLevel', Number(e.target.value))}
              className="w-full accent-[#00a884] mt-1"
            />
            <div className="flex justify-between text-[#8696a0] text-[11px] mt-1">
              <span>1 · Halus</span>
              <span>5 · Ekstrem</span>
            </div>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#00a884] text-white py-3 rounded-xl font-semibold transition-colors hover:bg-[#06cf9c] disabled:opacity-50"
        >
          {saving ? 'Menyimpan...' : saved ? '✓ Tersimpan' : 'Simpan perubahan'}
        </button>

        {/* Logout (separated, danger zone) */}
        <div className="pt-4 mt-2 border-t border-[#202c33]">
          <button
            onClick={handleLogout}
            className="w-full bg-transparent text-red-400 py-3 rounded-xl font-medium border border-red-400/30 hover:bg-red-400/10 transition-colors"
          >
            Logout
          </button>
          <p className="text-[#5a6a72] text-xs text-center mt-2">
            Data lo (chat, memori, foto) tetap aman di server.
          </p>
        </div>
      </div>
    </div>
  );
}
