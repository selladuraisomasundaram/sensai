-- =========================================================================
-- SENSAI DOJO PHASE 1: CONCEPT EXTRACTION & SPACED REPETITION SCHEMA
-- =========================================================================

-- 1. Atomic Concepts Extracted from Lessons
CREATE TABLE IF NOT EXISTS public.concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  start_sec INTEGER NOT NULL,
  end_sec INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Spaced Repetition Practice Questions per Concept
CREATE TABLE IF NOT EXISTS public.concept_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id UUID REFERENCES public.concepts(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- e.g. ["Option A", "Option B", "Option C", "Option D"]
  correct_answer_index INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User Concept Mastery Ledger (SuperMemo-2 parameters)
CREATE TABLE IF NOT EXISTS public.concept_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id UUID REFERENCES public.concepts(id) ON DELETE CASCADE,
  mastery_score INTEGER DEFAULT 0,  -- 0% to 100%
  ease_factor NUMERIC DEFAULT 2.5,   -- SM-2 Ease Factor (min 1.3)
  interval_days INTEGER DEFAULT 0,  -- Current recall interval in days
  repetitions INTEGER DEFAULT 0,    -- Consecutive successful reviews
  due_at TIMESTAMPTZ DEFAULT NOW(), -- When the Dojo summons this concept for daily review
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, concept_id)
);

-- 4. Review Audit Log
CREATE TABLE IF NOT EXISTS public.review_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id UUID REFERENCES public.concepts(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.concept_questions(id) ON DELETE SET NULL,
  grade INTEGER NOT NULL,           -- SM-2 Grade 0 to 5
  was_correct BOOLEAN NOT NULL,
  reviewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_concepts_course_id ON public.concepts(course_id);
CREATE INDEX IF NOT EXISTS idx_concepts_module_id ON public.concepts(module_id);
CREATE INDEX IF NOT EXISTS idx_concept_questions_concept_id ON public.concept_questions(concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_due_at ON public.concept_mastery(user_id, due_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concept_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concept_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;

-- Security Policies
DO $$ BEGIN
  CREATE POLICY "Public concepts read" ON public.concepts FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public questions read" ON public.concept_questions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access concepts" ON public.concepts FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access questions" ON public.concept_questions FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users read own mastery" ON public.concept_mastery FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users update own mastery" ON public.concept_mastery FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users insert review logs" ON public.review_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users read review logs" ON public.review_logs FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
