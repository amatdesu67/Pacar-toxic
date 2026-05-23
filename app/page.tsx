'use client';

// Halaman root: redirect ke /chat kalau udah setup, ke /setup kalau belum.
// Pakai client component karena perlu akses localStorage.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    router.replace(userId ? '/chat' : '/setup');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0b141a] flex items-center justify-center">
      <p className="text-[#8696a0] text-sm animate-pulse">Loading...</p>
    </div>
  );
}
