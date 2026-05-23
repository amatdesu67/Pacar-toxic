# AI Pacar Toxic 💔

Chat app dengan AI pacar virtual yang punya kepribadian **toxic-supportive**. Dia bantu lo disiplin sama daily goals lewat sindiran, drama, dan ngambek — tapi di baliknya genuinely care.

## Stack

- **Next.js 14** (App Router)
- **TypeScript** (strict mode)
- **Tailwind CSS** (dark theme, WhatsApp-inspired UI)
- **SQLite + Prisma 7** (database lokal)
- **Anthropic Claude API** (`claude-haiku-4-5`)

## Cara Jalanin Lokal

### 1. Clone & Install

```bash
cd ai-pacar-toxic
npm install
```

### 2. Dapetin API Key Anthropic

1. Buka [console.anthropic.com](https://console.anthropic.com/)
2. Daftar / login
3. Pergi ke **API Keys** → **Create Key**
4. Copy key-nya (dimulai dengan `sk-ant-...`)

### 3. Setup Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY="sk-ant-xxxxxxxx"   ← paste API key lo di sini
```

### 4. Setup Database

```bash
npx prisma migrate dev
```

### 5. Jalanin Dev Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) — lo bakal diarahkan ke halaman setup.

---

## Struktur Project

```
ai-pacar-toxic/
├── app/
│   ├── api/
│   │   ├── chat/route.ts       ← kirim pesan, panggil Claude
│   │   ├── messages/route.ts   ← ambil riwayat chat
│   │   └── user/route.ts       ← create & read user
│   ├── chat/page.tsx           ← UI chat mirip WhatsApp
│   ├── setup/page.tsx          ← halaman setup awal
│   ├── layout.tsx
│   └── page.tsx                ← redirect ke /setup atau /chat
├── components/
│   ├── ChatBubble.tsx
│   └── TypingIndicator.tsx
├── lib/
│   ├── db-helpers.ts           ← query progress & streak
│   ├── mood.ts                 ← logika mood harian AI
│   ├── prisma.ts               ← singleton Prisma client
│   ├── prompts.ts              ← builder system prompt Claude
│   └── types.ts                ← TypeScript types
├── prisma/
│   └── schema.prisma           ← schema database
└── .env.example
```

## Fitur Phase 1 (Done)

- [x] Halaman `/setup` — input nama, nama AI, gender, toxic level, goals
- [x] Halaman `/chat` — UI mirip WhatsApp (dark mode, bubble, typing indicator, auto-scroll)
- [x] `/api/user` — create & read user
- [x] `/api/chat` — kirim pesan, load konteks, panggil Claude, simpan ke DB
- [x] `/api/messages` — load riwayat chat
- [x] Mood system — 4 mood harian (manja/ngambek/sarkas/sweet), deterministic per hari
- [x] Progress tracking — hitung streak & completion rate 7 hari terakhir
- [x] System prompt solid dengan personality rules, contoh, dan hard rules safety

## Fitur Phase 2 (Coming Soon)

- [ ] `/api/extract` — auto-detect goals dari chat (structured output)
- [ ] Halaman `/dashboard` — streak chart, progress 7 hari (Recharts)
- [ ] Auto-detect input progress ("tadi gym 1 jam" → update goal)
- [ ] Multi-user support + auth

## Catatan Penting

- **Single user**: userId disimpan di `localStorage`. Untuk reset, klik ⚙️ di header chat.
- **SQLite**: database file ada di `prisma/dev.db`. Hapus file ini untuk reset semua data.
- **API Cost**: pakai `claude-haiku-4-5` yang paling murah. Estimasi ~$0.001 per pesan.
