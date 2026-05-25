'use client';

import { useState, useEffect } from 'react';

const WA_NUMBER = '6283842570278';

type FeedbackType = 'kritik' | 'saran' | 'bug';

const TYPE_LABELS: Record<FeedbackType, { label: string; emoji: string; color: string }> = {
  kritik: { label: 'Kritik',  emoji: '💬', color: 'bg-[#f0b429]' },
  saran:  { label: 'Saran',   emoji: '💡', color: 'bg-[#00a884]' },
  bug:    { label: 'Bug',     emoji: '🐞', color: 'bg-[#ef4444]' },
};

export default function FeedbackPage() {
  const [type, setType] = useState<FeedbackType>('saran');
  const [message, setMessage] = useState('');
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    fetch(`/api/user?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.name) setUserName(data.user.name);
      })
      .catch(() => {});
  }, []);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    const cfg = TYPE_LABELS[type];
    const lines = [
      `${cfg.emoji} *${cfg.label}* - Pacar AI`,
      '',
      trimmed,
      '',
      userName ? `_dari: ${userName}_` : '_dari: anonim_',
    ];

    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/${WA_NUMBER}?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#0b141a] flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3 sticky top-0 z-10 border-b border-[#2a3942]">
        <a href="/chat" className="text-[#8696a0] hover:text-[#e9edef] transition-colors p-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M7.28 7.72a.75.75 0 010 1.06l-2.47 2.47H21a.75.75 0 010 1.5H4.81l2.47 2.47a.75.75 0 11-1.06 1.06l-3.75-3.75a.75.75 0 010-1.06l3.75-3.75a.75.75 0 011.06 0z" clipRule="evenodd" />
          </svg>
        </a>
        <div className="flex-1">
          <p className="text-[#e9edef] font-semibold text-sm">Kritik & Saran</p>
          <p className="text-[#8696a0] text-xs">Bantu kami improve Pacar AI</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 space-y-4">
        {/* Type picker */}
        <div>
          <p className="text-[#8696a0] text-xs font-medium mb-2">Jenis</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(TYPE_LABELS) as FeedbackType[]).map((t) => {
              const cfg = TYPE_LABELS[t];
              const isActive = type === t;
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded-xl px-3 py-3 flex flex-col items-center gap-1 transition-all ${
                    isActive
                      ? 'bg-[#2a3942] ring-2 ring-[#00a884]'
                      : 'bg-[#202c33] hover:bg-[#2a3942]'
                  }`}
                >
                  <span className="text-2xl">{cfg.emoji}</span>
                  <span className={`text-xs font-medium ${isActive ? 'text-[#e9edef]' : 'text-[#8696a0]'}`}>
                    {cfg.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message */}
        <div>
          <p className="text-[#8696a0] text-xs font-medium mb-2">Pesan</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              type === 'kritik' ? 'Apa yang bisa diperbaiki?' :
              type === 'saran'  ? 'Fitur apa yang lo pengen?' :
                                  'Bug apa yang lo temuin? Coba detail step-by-step.'
            }
            rows={8}
            className="w-full bg-[#202c33] text-[#e9edef] placeholder-[#8696a0] rounded-2xl px-4 py-3 resize-none outline-none text-sm leading-relaxed focus:ring-2 focus:ring-[#00a884]"
          />
          <p className="text-[#4b5563] text-xs mt-2">
            Pesan bakal dibuka di WhatsApp dan dikirim ke developer.
          </p>
        </div>

        {/* Submit */}
        <button
          onClick={handleSend}
          disabled={!message.trim()}
          className="w-full bg-[#00a884] hover:bg-[#06cf9c] text-white font-semibold py-3 rounded-2xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M19.05 4.91A9.816 9.816 0 0012.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01zm-7.01 15.24c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.264 8.264 0 01-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.183 8.183 0 012.41 5.83c.02 4.54-3.68 8.23-8.22 8.23z" />
          </svg>
          Kirim via WhatsApp
        </button>

        {/* Info */}
        <div className="bg-[#202c33] rounded-xl p-4 space-y-2">
          <p className="text-[#8696a0] text-xs font-medium">Tips</p>
          <ul className="text-[#8696a0] text-xs space-y-1 list-disc list-inside">
            <li>Makin detail makin gampang di-follow up</li>
            <li>Buat bug, sertakan langkah reproduksi</li>
            <li>Buat saran fitur, jelasin use case-nya</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
