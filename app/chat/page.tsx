'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChatBubble } from '@/components/ChatBubble';
import { TypingIndicator } from '@/components/TypingIndicator';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  createdAt: string;
}

type PersonalityType = 'tsundere' | 'yandere' | 'kuudere' | 'deredere' | 'himedere';

interface UserInfo {
  id: string;
  name: string;
  aiName: string;
  aiGender: 'female' | 'male';
  personality: PersonalityType;
  toxicLevel: number;
  aiPhotoUrl?: string | null;
  createdAt?: string;
}

const MILESTONES: Record<number, string> = {
  1: '1 hari', 7: '1 minggu', 30: '1 bulan',
  50: '50 hari', 100: '100 hari', 180: '6 bulan',
  365: '1 tahun', 730: '2 tahun',
};

function daysTogether(createdAt?: string): number {
  if (!createdAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000));
}

function formatDaysTogether(createdAt?: string): string | null {
  if (!createdAt) return null;
  const days = daysTogether(createdAt);
  const milestone = MILESTONES[days];
  return milestone ? `${milestone} 🎉` : `${days} hari bareng 💕`;
}

function getMilestone(createdAt?: string): string | null {
  if (!createdAt) return null;
  return MILESTONES[daysTogether(createdAt)] ?? null;
}

const PERSONALITY_LABELS: Record<PersonalityType, string> = {
  tsundere: 'Tsundere 😤',
  yandere: 'Yandere 🔪',
  kuudere: 'Kuudere 🧊',
  deredere: 'Deredere 🥰',
  himedere: 'Himedere 👑',
};

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFirstLoad = useRef(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 128) + 'px';
  };

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      router.replace('/setup');
      return;
    }

    Promise.all([
      fetch(`/api/user?userId=${userId}`).then((r) => r.json()),
      fetch(`/api/messages?userId=${userId}&limit=50`).then((r) => r.json()),
    ])
      .then(([userData, messagesData]) => {
        if (userData.error) {
          localStorage.removeItem('userId');
          router.replace('/setup');
          return;
        }
        setUser(userData.user);
        setMessages(messagesData.messages ?? []);
      })
      .finally(() => setIsInitializing(false));
  }, [router]);

  // Scroll instant saat pertama load, smooth untuk pesan baru
  useEffect(() => {
    if (isFirstLoad.current) {
      scrollToBottom('instant');
      isFirstLoad.current = false;
    } else {
      scrollToBottom('smooth');
    }
  }, [messages, isLoading]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || isLoading || isCooldown || !user) return;

    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: 'user', content, createdAt: new Date().toISOString() },
    ]);
    setInput('');
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, content }),
      });

      const data = await res.json();

      if (data.message) {
        setMessages((prev) => [
          ...prev,
          {
            id: data.messageId ?? `ai-${Date.now()}`,
            role: 'ai',
            content: data.message,
            createdAt: new Date().toISOString(),
          },
        ]);
      } else if (data.error) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempId),
          { id: `err-${Date.now()}`, role: 'ai', content: data.error, createdAt: new Date().toISOString() },
        ]);
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsLoading(false);
      setIsCooldown(true);
      setTimeout(() => {
        setIsCooldown(false);
        textareaRef.current?.focus();
      }, 4000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    router.replace('/setup');
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingPhoto(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user.id);

    try {
      const res = await fetch('/api/user/avatar', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        setUser((prev) => prev ? { ...prev, aiPhotoUrl: data.url } : prev);
      }
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#0b141a] flex items-center justify-center">
        <p className="text-[#8696a0] text-sm animate-pulse">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  const aiAvatar = user.aiGender === 'female' ? '👩' : '👨';

  return (
    <div className="min-h-screen bg-[#0b141a] flex flex-col max-w-2xl mx-auto">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoChange}
      />

      {/* Header */}
      <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-10 h-10 rounded-full bg-[#2a3942] flex items-center justify-center text-xl flex-shrink-0 overflow-hidden relative group"
          title="Ganti foto profil"
          disabled={isUploadingPhoto}
        >
          {user.aiPhotoUrl ? (
            <Image src={user.aiPhotoUrl} alt={user.aiName} fill className="object-cover" sizes="40px" />
          ) : (
            aiAvatar
          )}
          {isUploadingPhoto && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!isUploadingPhoto && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[#e9edef] font-semibold text-sm truncate">{user.aiName}</p>
          <p className="text-[#8696a0] text-xs truncate">
            {formatDaysTogether(user.createdAt) ?? PERSONALITY_LABELS[user.personality ?? 'tsundere']}
          </p>
        </div>
        <a
          href="/memory"
          className="text-[#8696a0] hover:text-[#e9edef] transition-colors p-1"
          title="Memori (apa yang dia inget tentang lo)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
          </svg>
        </a>
        <a
          href="/feedback"
          className="text-[#8696a0] hover:text-[#e9edef] transition-colors p-1"
          title="Kritik & Saran"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" />
          </svg>
        </a>
        <a
          href="/health"
          className="text-[#8696a0] hover:text-[#e9edef] transition-colors p-1"
          title="Cek status API key"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.127 1.706l-.909 3.714c-.361 1.476.667 2.859 2.197 2.859a.75.75 0 000-1.5.648.648 0 01-.633-.334.648.648 0 01.096-.67l.909-3.714c.61-2.492-1.972-4.572-4.307-3.438a.75.75 0 00.52 1.402zm1.544-5.308a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" />
          </svg>
        </a>
        <button
          onClick={handleLogout}
          className="text-[#8696a0] hover:text-[#e9edef] transition-colors p-1"
          title="Reset & setup ulang"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M11.828 2.25c-.916 0-1.699.663-1.85 1.567l-.091.549a.798.798 0 01-.517.608 7.45 7.45 0 00-.478.198.798.798 0 01-.796-.064l-.453-.324a1.875 1.875 0 00-2.416.2l-.243.243a1.875 1.875 0 00-.2 2.416l.324.453a.798.798 0 01.064.796 7.448 7.448 0 00-.198.478.798.798 0 01-.608.517l-.549.091A1.875 1.875 0 002.25 11.828v.344c0 .916.663 1.699 1.567 1.85l.549.091c.281.047.508.25.608.517.06.162.127.321.198.478a.798.798 0 01-.064.796l-.324.453a1.875 1.875 0 00.2 2.416l.243.243c.648.648 1.67.733 2.416.2l.453-.324a.798.798 0 01.796-.064c.157.071.316.138.478.198.267.1.47.327.517.608l.091.549c.15.904.933 1.567 1.85 1.567h.344c.916 0 1.699-.663 1.85-1.567l.091-.549a.798.798 0 01.517-.608 7.52 7.52 0 00.478-.198.798.798 0 01.796.064l.453.324a1.875 1.875 0 002.416-.2l.243-.243c.648-.648.733-1.67.2-2.416l-.324-.453a.798.798 0 01-.064-.796c.071-.157.138-.316.198-.478.1-.267.327-.47.608-.517l.549-.091A1.875 1.875 0 0021.75 12.172v-.344c0-.916-.663-1.699-1.567-1.85l-.549-.091a.798.798 0 01-.608-.517 7.507 7.507 0 00-.198-.478.798.798 0 01.064-.796l.324-.453a1.875 1.875 0 00-.2-2.416l-.243-.243a1.875 1.875 0 00-2.416-.2l-.453.324a.798.798 0 01-.796.064 7.462 7.462 0 00-.478-.198.798.798 0 01-.517-.608l-.091-.549c-.15-.904-.933-1.567-1.85-1.567h-.344zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 pt-4 pb-2">
        {/* Milestone banner */}
        {getMilestone(user.createdAt) && (
          <div className="mb-3 mx-auto max-w-xs bg-gradient-to-r from-[#00a884]/20 to-[#06cf9c]/20 border border-[#00a884]/40 rounded-2xl px-4 py-3 text-center">
            <p className="text-2xl mb-1">🎉</p>
            <p className="text-[#e9edef] text-sm font-semibold">
              Hari ini {getMilestone(user.createdAt)} kalian bareng!
            </p>
            <p className="text-[#8696a0] text-xs mt-0.5">
              {daysTogether(user.createdAt)} hari sejak hari pertama
            </p>
          </div>
        )}

        {messages.length === 0 && !isLoading && (
          <div className="text-center text-[#8696a0] text-sm mt-16 space-y-2 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-[#2a3942] flex items-center justify-center text-4xl overflow-hidden relative">
              {user.aiPhotoUrl ? (
                <Image src={user.aiPhotoUrl} alt={user.aiName} fill className="object-cover" sizes="64px" />
              ) : (
                aiAvatar
              )}
            </div>
            <p className="font-medium text-[#e9edef]">{user.aiName}</p>
            <p className="text-xs">Mulai chat — cerita apa aja dulu</p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            message={msg}
            aiGender={user.aiGender}
            aiPhotoUrl={user.aiPhotoUrl}
          />
        ))}

        {isLoading && <TypingIndicator aiGender={user.aiGender} aiPhotoUrl={user.aiPhotoUrl} />}

        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Input */}
      <div className="bg-[#202c33] px-3 py-3 flex gap-2 items-end sticky bottom-0">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            resizeTextarea();
          }}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? 'Lagi ngetik...' : 'Pesan'}
          rows={1}
          className="flex-1 bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] rounded-2xl px-4 py-2.5 resize-none outline-none text-sm leading-relaxed transition-opacity"
          style={{ minHeight: '42px', maxHeight: '128px' }}
          disabled={isLoading}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading || isCooldown}
          className="w-11 h-11 rounded-full bg-[#00a884] flex items-center justify-center flex-shrink-0 hover:bg-[#06cf9c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Kirim pesan"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5 translate-x-0.5">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
