# 🥷 Sensai — Autonomous AI Curriculum & Mastery Engine

> **Deconstruct any YouTube video or playlist into structured, interactive mastery courses with zero-trust AI key management and ninja-stealth progression.**

Sensai is an advanced educational intelligence platform built with **Next.js 16**, **TypeScript**, **Tailwind CSS**, and **Supabase**. It ingests technical, academic, maker, podcast, and workflow videos, classifies them across five universal pedagogical pillars, and extracts structured curriculums complete with executable code blocks, localized trial quizzes, and chapter-synced video navigation.

---

## ⚡ Core Architecture & Features

### 1. 🎯 Universal 5-Pillar Classification Engine
Sensai dynamically classifies and extracts curriculums according to the content domain:
* **`technical_coding`**: Architectural objectives, multi-language code snippets with syntax highlighting, IDE challenge missions, and localized checkpoint quizzes.
* **`podcast_debate`**: Speaker stance decomposition, dialectic context, thesis comparisons, and unpacked takeaways.
* **`academic_lecture`**: Core theoretical frameworks, mathematical formulas/equations, foundational dates, and real-world empirical applications.
* **`diy_hardware`**: Bill of materials, sequential mechanical/electrical build steps, safety hazard alerts, and troubleshooting guides.
* **`software_walkthrough`**: Application workflows (Figma, Notion, Blender, Excel), UI navigation steps, and keyboard shortcut cheat-sheets.

### 2. 🔐 Zero-Trust Bring-Your-Own-Key (BYOK) Vault
* Client-side cryptographic isolation: API keys are stored exclusively in the user's browser `localStorage`.
* Keys are transmitted transiently via `Authorization: Bearer <key>` headers directly to serverless route handlers and **never persisted to the database**.
* Integrated step-by-step assistant with direct access to [Google AI Studio](https://aistudio.google.com/app/apikey) for instant, free API keys (also compatible with OpenAI and Anthropic).

### 3. 🛡️ Resilient LLM Engine & Dynamic Model Discovery
* **Dynamic Model Resolution**: Queries Google's `ListModels` API endpoint to automatically discover available generation models (`gemini-1.5-flash-latest`, `gemini-2.0-flash`, `gemini-pro`, etc.) for each user's specific key tier and region.
* **Multi-Version Fallback**: Cascades through candidate models across `v1beta` and `v1` endpoints with zero user downtime.
* **Fault-Tolerant JSON Sanitizer & Repair**: Automatically fixes RFC 8259 defects (unescaped code newlines, quotes, trailing commas, and truncated response streams).

### 4. 📜 Playlist Queue Infiltration (Mega-Courses)
* Detects YouTube playlists (`?list=...`) via `ytpl`.
* Processes videos sequentially on the client side, eliminating serverless execution timeouts (504s) and rate-limit spikes while building a unified Mega-Course module-by-module.

### 5. 🥷 Stealth Discipline & Progression System
* **Mastery Ranks**:
  * **Initiate**: `0 – 100 XP`
  * **Ronin**: `101 – 500 XP`
  * **Shinobi**: `501 – 2,000 XP`
  * **Sensai**: `2,001+ XP`
* **Streaks**: Daily tracking calculation enforcing consecutive training discipline.
* **Stealth UI**: Minimalist razor-thin crimson progress bars, dark muted badges, and non-intrusive toast notifications.

### 6. ⏱️ Bidirectional Video Sync
* Interactive YouTube player powered by `react-youtube`.
* Clicking any chapter timestamp instantly seeks the video to that exact second.
* Video playback progress automatically highlights and brings the active curriculum module into focus.

### 7. 📬 Stealth Comms & Feedback Relay
* Discreet developer contact dialog allowing users to transmit feature requests and error reports directly to the maintainer via nodemailer SMTP.

### 8. 🌓 Theming & Ungated Exploration
* Users can generate courses and explore the platform freely before logging in.
* Google OAuth & Email Magic Link authentication enabled for saving progress, maintaining streaks, and claiming XP.
* Seamless Dark and Light theme toggle.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Node.js runtime) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) (Class-based dark/light theming) |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL + PostgREST + GoTrue OAuth) |
| **AI / LLMs** | Google Gemini (Flash / Pro), Anthropic Claude, OpenAI GPT-4o-mini |
| **Video & Extraction** | `youtube-transcript`, `ytpl`, `react-youtube` |
| **Syntax Highlighting**| `react-syntax-highlighter` (vscDarkPlus theme) |
| **Notifications** | `sonner` (Dark minimalist toasts) |
| **Email Relay** | `nodemailer` (SMTP) |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
* **Node.js**: v18.17+ or v20+ installed.
* **Supabase Project**: Free project on [supabase.com](https://supabase.com).
* **LLM API Key**: Free key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 2. Clone the Repository
```bash
git clone https://github.com/your-username/sensai.git
cd sensai
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Schema Setup
Execute the following schema in your **Supabase SQL Editor**:

```sql
-- 1. Profiles Table (Discipline, Streaks, & Ranks)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  total_xp integer default 0 not null,
  current_streak integer default 0 not null,
  last_activity_date date,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Courses Table
create table public.courses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete set null,
  youtube_url text not null,
  video_title text not null,
  domain_type text not null check (domain_type in (
    'pending', 'technical_coding', 'podcast_debate', 
    'academic_lecture', 'diy_hardware', 'software_walkthrough'
  )),
  status text not null check (status in ('processing', 'completed', 'failed')),
  final_quiz jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Modules Table (Polymorphic Curriculum)
create table public.modules (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses on delete cascade not null,
  module_order integer not null,
  content jsonb not null,
  start_timestamp integer default 0,
  end_timestamp integer default 0,
  module_quiz jsonb default '[]'::jsonb,
  is_completed boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;

-- Permissive policies for read/write access (adjust for production)
create policy "Allow public access on profiles" on public.profiles for all using (true) with check (true);
create policy "Allow public access on courses" on public.courses for all using (true) with check (true);
create policy "Allow public access on modules" on public.modules for all using (true) with check (true);
```

### 5. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-or-service-role-key

# Optional: Feedback Email Routing
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-google-app-password
```

### 6. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Security & Privacy Architecture
* **Zero-Trust BYOK**: Sensai never stores third-party LLM API keys in the database.
* **Local Sandboxing**: Keys are held in the client's local storage and forwarded via headers directly to serverless processing functions.
* **Server-Verified Progression**: XP gains and module completions are calculated and validated strictly server-side in `/api/progress` to prevent client spoofing.

---

## 📂 Project Directory Structure

```
sensai/
├── app/
│   ├── api/
│   │   ├── feedback/route.ts   # Nodemailer SMTP feedback dispatcher
│   │   ├── generate/route.ts   # 5-Pillar LLM extractor & JSON repair
│   │   ├── ingest/route.ts     # Caption extraction & domain classification
│   │   ├── playlist/route.ts   # ytpl YouTube playlist extractor
│   │   └── progress/route.ts   # Server-side XP & streak engine
│   ├── course/[id]/page.tsx    # Live course viewer & video sync player
│   ├── globals.css             # Tailwind dark/light theme definitions
│   ├── layout.tsx              # Root HTML wrapper & fonts
│   └── page.tsx                # Target acquisition, BYOK vault & dashboard
├── components/
│   ├── ApiKeyManager.tsx       # LocalStorage vault & AI Studio key guide
│   ├── AuthModal.tsx           # Google OAuth, Magic Link & Guest mode
│   ├── FeedbackModal.tsx       # Dark ninja feedback transmission modal
│   ├── FinalQuiz.tsx           # End-of-course comprehensive trial
│   ├── ModuleCard.tsx          # Polymorphic 5-pillar chapter renderer
│   ├── ProfileWidget.tsx       # Rank, streak flame & XP progress bar
│   ├── QuizView.tsx            # Localized diagnostic checkpoint trial
│   ├── StealthSkeleton.tsx     # Pulse skeleton loaders
│   ├── ThemeToggle.tsx         # Dark/Light theme switch
│   └── YouTubePlayer.tsx       # react-youtube synchronization wrapper
├── lib/
│   ├── gemini.ts               # ListModels resolver & multi-version fallback
│   ├── ranks.ts                # XP thresholds & rank computation
│   ├── streak.ts               # Daily activity streak calculator
│   ├── supabaseClient.ts       # Supabase client initializer
│   └── timeUtils.ts            # MM:SS to seconds converter
├── types/
│   └── course.ts               # Polymorphic 5-pillar TypeScript schemas
├── .env.example                # Safe environment variable template
├── .gitignore                  # GitHub ignore definitions
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

---

## 📜 License
MIT License. Feel free to use and adapt Sensai for personal study or commercial deployments.

