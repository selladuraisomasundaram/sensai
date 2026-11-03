-- Phase 4 Migration: Teach-Back Mode (Feynman Technique Submissions)

CREATE TABLE IF NOT EXISTS public.teach_back_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  explanation TEXT NOT NULL,
  accuracy_score INTEGER NOT NULL CHECK (accuracy_score >= 0 AND accuracy_score <= 100),
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  knowledge_gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
  sensei_coaching TEXT,
  simplified_analogy TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_teach_back_user ON public.teach_back_submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teach_back_concept ON public.teach_back_submissions(concept_id);

ALTER TABLE public.teach_back_submissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users read own teach-backs" ON public.teach_back_submissions
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users insert own teach-backs" ON public.teach_back_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
