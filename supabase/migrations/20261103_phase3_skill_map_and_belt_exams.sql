-- Phase 3 Migration: Belt Ranks and Belt Promotion Exams

-- 1. Add belt fields to profiles if not present
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS belt_rank TEXT NOT NULL DEFAULT 'Initiate',
  ADD COLUMN IF NOT EXISTS belt_exam_passed_at TIMESTAMPTZ;

-- 2. Belt Exams Table
CREATE TABLE IF NOT EXISTS public.belt_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_rank TEXT NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT false,
  concept_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_belt_exams_user ON public.belt_exams(user_id, created_at DESC);

ALTER TABLE public.belt_exams ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users read own belt exams" ON public.belt_exams
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users insert own belt exams" ON public.belt_exams
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
