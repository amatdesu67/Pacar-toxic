'use client';

import { useState, useEffect, useCallback } from 'react';

type KeyStatus = 'ok' | 'rate_limited' | 'invalid' | 'missing';

interface KeyResult {
  index: number;
  status: KeyStatus;
  label: string;
}

interface HealthData {
  keys: KeyResult[];
  active: number;
  configured: number;
}

const STATUS_CONFIG: Record<KeyStatus, { label: string; color: string; dot: string }> = {
  ok:           { label: 'Aktif',        color: 'text-[#00a884]',  dot: 'bg-[#00a884]' },
  rate_limited: { label: 'Rate Limited', color: 'text-[#f0b429]',  dot: 'bg-[#f0b429]' },
  invalid:      { label: 'Invalid',      color: 'text-[#ef4444]',  dot: 'bg-[#ef4444]' },
  missing:      { label: 'Tidak ada',    color: 'text-[#4b5563]',  dot: 'bg-[#374151]' },
};

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health');
      const json = await res.json();
      setData(json);
      setLastChecked(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  const activeCount = data?.active ?? 0;
  const configuredCount = data?.configured ?? 0;
  const headerColor =
    activeCount === 0 ? 'text-[#ef4444]' :
    activeCount < configuredCount ? 'text-[#f0b429]' :
    'text-[#00a884]';

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
          <p className="text-[#e9edef] font-semibold text-sm">API Key Health</p>
          <p className="text-[#8696a0] text-xs">
            {lastChecked ? `Dicek ${lastChecked.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Belum dicek'}
          </p>
        </div>
        <button
          onClick={check}
          disabled={loading}
          className="text-[#8696a0] hover:text-[#e9edef] transition-colors p-1 disabled:opacity-40"
          title="Refresh"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}>
            <path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="flex-1 px-4 py-6 space-y-4">
        {/* Summary */}
        {data && (
          <div className="bg-[#202c33] rounded-2xl p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-[#8696a0] text-xs mb-1">Status keseluruhan</p>
              <p className={`font-bold text-lg ${headerColor}`}>
                {activeCount}/{configuredCount} key aktif
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold ${
              activeCount === 0 ? 'bg-[#ef4444]/20' :
              activeCount < configuredCount ? 'bg-[#f0b429]/20' :
              'bg-[#00a884]/20'
            }`}>
              {activeCount === 0 ? '✕' : activeCount < configuredCount ? '!' : '✓'}
            </div>
          </div>
        )}

        {/* Key list */}
        <div className="space-y-2">
          {loading && !data && (
            <div className="text-center text-[#8696a0] text-sm py-12 animate-pulse">Mengecek semua key...</div>
          )}

          {data?.keys.map((key) => {
            const cfg = STATUS_CONFIG[key.status];
            return (
              <div key={key.index} className="bg-[#202c33] rounded-xl px-4 py-3 flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot} ${key.status === 'ok' ? 'shadow-[0_0_6px_2px_rgba(0,168,132,0.4)]' : ''}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[#e9edef] text-sm font-mono truncate">
                    {key.status === 'missing' ? `GROQ_API_KEY_${key.index === 1 ? '' : key.index}` : key.label}
                  </p>
                </div>
                <span className={`text-xs font-medium flex-shrink-0 ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="bg-[#202c33] rounded-xl p-4 space-y-2">
          <p className="text-[#8696a0] text-xs font-medium mb-3">Keterangan</p>
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
            <div key={status} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
              <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
              <span className="text-[#4b5563] text-xs">—</span>
              <span className="text-[#8696a0] text-xs">
                {status === 'ok' && 'Key valid dan siap dipakai'}
                {status === 'rate_limited' && 'Limit harian habis, otomatis skip ke key berikutnya'}
                {status === 'invalid' && 'Key salah atau sudah expired'}
                {status === 'missing' && 'Belum dikonfigurasi di .env / Vercel'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
