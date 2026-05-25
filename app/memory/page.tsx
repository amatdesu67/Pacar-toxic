'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type FactCategory = 'hobi' | 'makanan' | 'kerjaan' | 'temen' | 'keluarga' | 'insecurity' | 'kebiasaan' | 'lainnya';

interface Fact {
  id: string;
  category: FactCategory;
  content: string;
  source: 'extracted' | 'manual';
  createdAt: string;
}

interface UserInfo {
  id: string;
  name: string;
  aiName: string;
}

const CATEGORIES: Array<{ id: FactCategory; emoji: string; label: string }> = [
  { id: 'hobi',       emoji: '🎨', label: 'Hobi & Minat' },
  { id: 'makanan',    emoji: '🍜', label: 'Makanan' },
  { id: 'kerjaan',    emoji: '💼', label: 'Kerjaan' },
  { id: 'temen',      emoji: '👫', label: 'Temen' },
  { id: 'keluarga',   emoji: '👨‍👩‍👧', label: 'Keluarga' },
  { id: 'kebiasaan',  emoji: '☕', label: 'Kebiasaan' },
  { id: 'insecurity', emoji: '😔', label: 'Insecurity' },
  { id: 'lainnya',    emoji: '✨', label: 'Lainnya' },
];

export default function MemoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newCategory, setNewCategory] = useState<FactCategory>('hobi');
  const [newContent, setNewContent] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const [uRes, fRes] = await Promise.all([
        fetch(`/api/user?userId=${userId}`).then((r) => r.json()),
        fetch(`/api/facts?userId=${userId}`).then((r) => r.json()),
      ]);
      if (uRes.user) setUser(uRes.user);
      if (fRes.facts) setFacts(fRes.facts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      router.replace('/setup');
      return;
    }
    load(userId);
  }, [router, load]);

  const handleAdd = async () => {
    if (!user || !newContent.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/facts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, category: newCategory, content: newContent.trim() }),
      });
      const data = await res.json();
      if (data.fact) {
        setFacts((prev) => [data.fact, ...prev]);
        setNewContent('');
        setShowAdd(false);
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (!confirm('Hapus memori ini?')) return;
    await fetch(`/api/facts?id=${id}&userId=${user.id}`, { method: 'DELETE' });
    setFacts((prev) => prev.filter((f) => f.id !== id));
  };

  const grouped: Record<FactCategory, Fact[]> = {
    hobi: [], makanan: [], kerjaan: [], temen: [], keluarga: [], insecurity: [], kebiasaan: [], lainnya: [],
  };
  for (const f of facts) {
    grouped[f.category]?.push(f);
  }

  return (
    <div className="min-h-screen bg-[#0b141a] flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <a href="/chat" className="text-[#8696a0] hover:text-[#e9edef] transition-colors p-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M7.28 7.72a.75.75 0 010 1.06l-2.47 2.47H21a.75.75 0 010 1.5H4.81l2.47 2.47a.75.75 0 11-1.06 1.06l-3.75-3.75a.75.75 0 010-1.06l3.75-3.75a.75.75 0 011.06 0z" clipRule="evenodd" />
          </svg>
        </a>
        <div className="flex-1 min-w-0">
          <p className="text-[#e9edef] font-semibold text-sm truncate">Memori {user?.aiName}</p>
          <p className="text-[#8696a0] text-xs">Hal yang dia inget tentang lo · {facts.length} memori</p>
        </div>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="text-[#00a884] hover:text-[#06cf9c] transition-colors p-1"
          title="Tambah memori manual"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="flex-1 px-4 py-4 space-y-3">
        {/* Add form */}
        {showAdd && (
          <div className="bg-[#202c33] rounded-2xl p-4 space-y-3">
            <p className="text-[#e9edef] text-sm font-medium">Tambah memori manual</p>
            <div className="grid grid-cols-4 gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setNewCategory(c.id)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition-colors ${
                    newCategory === c.id ? 'bg-[#00a884] text-white' : 'bg-[#2a3942] text-[#8696a0]'
                  }`}
                >
                  {c.emoji} {c.label.split(' ')[0]}
                </button>
              ))}
            </div>
            <input
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Contoh: alergi seafood, suka kopi tanpa gula"
              maxLength={180}
              className="w-full bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#00a884]"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!newContent.trim() || adding}
                className="flex-1 bg-[#00a884] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#06cf9c] disabled:opacity-50"
              >
                {adding ? 'Simpan...' : 'Simpan'}
              </button>
              <button
                onClick={() => { setShowAdd(false); setNewContent(''); }}
                className="px-4 py-2 rounded-lg text-sm text-[#8696a0] hover:text-[#e9edef]"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Loading / empty state */}
        {loading && (
          <p className="text-[#8696a0] text-sm text-center py-12 animate-pulse">Loading memori...</p>
        )}
        {!loading && facts.length === 0 && (
          <div className="text-center text-[#8696a0] text-sm py-12 space-y-2">
            <p className="text-3xl">🧠</p>
            <p>Belum ada memori.</p>
            <p className="text-xs">Cerita lebih banyak di chat, dia bakal mulai inget sendiri.</p>
          </div>
        )}

        {/* Grouped by category */}
        {!loading && CATEGORIES.map((c) => {
          const items = grouped[c.id];
          if (!items || items.length === 0) return null;
          return (
            <div key={c.id} className="bg-[#202c33] rounded-2xl p-4 space-y-2">
              <p className="text-[#e9edef] text-sm font-semibold flex items-center gap-2">
                <span className="text-lg">{c.emoji}</span>
                {c.label}
                <span className="text-[#8696a0] text-xs font-normal">· {items.length}</span>
              </p>
              <div className="space-y-1.5">
                {items.map((f) => (
                  <div key={f.id} className="flex items-start gap-2 group">
                    <span className="text-[#8696a0] text-xs mt-1">•</span>
                    <p className="text-[#e9edef] text-sm flex-1 leading-relaxed">{f.content}</p>
                    {f.source === 'manual' && (
                      <span className="text-[#8696a0] text-[10px] mt-1 px-1.5 py-0.5 bg-[#2a3942] rounded">manual</span>
                    )}
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="text-[#8696a0] hover:text-red-400 transition-colors text-sm opacity-0 group-hover:opacity-100"
                      title="Hapus"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
