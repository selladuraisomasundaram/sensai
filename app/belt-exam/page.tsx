'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { BeltExamSession, BeltExamQuestion } from '@/types/course';
import { getRankTier, type RankTitle } from '@/lib/ranks';
import ThemeToggle from '@/components/ThemeToggle';
import StealthSkeleton from '@/components/StealthSkeleton';
import { Toaster, toast } from 'sonner';
import {
  ArrowLeft,
  Trophy,
  Swords,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Brain,
  Sparkles,
} from 'lucide-react';

export default function BeltExamPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [examSession, setExamSession] = useState<BeltExamSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examResult, setExamResult] = useState<{
    passed: boolean;
    score: number;
    totalQuestions: number;
    targetRank: string;
    beltColor: string;
    earnedXp: number;
    feedback: string;
  } | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initializeExam() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          toast.error('Sign in required to challenge Belt Promotion Trials.');
          router.push('/skill-map');
          return;
        }

        const res = await fetch('/api/belt-exam/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.error || 'Unable to generate Belt Trial.');
          router.push('/skill-map');
          return;
        }

        if (mounted && data.examSession) {
          setExamSession(data.examSession);
        }
      } catch (err: any) {
        console.error('Failed to initialize belt exam:', err);
        toast.error('Trial connection failed.');
        router.push('/skill-map');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initializeExam();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading || !examSession) {
    return (
      <main className="min-h-screen bg-stone-50 dark:bg-black text-stone-800 dark:text-zinc-200 py-10 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <StealthSkeleton />
        </div>
      </main>
    );
  }

  const currentQuestion = examSession.questions[currentIndex];
  const totalQuestions = examSession.questions.length;
  const targetRank = examSession.target_rank as RankTitle;
  const targetTier = getRankTier(targetRank);

  const handleSelectOption = (opt: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: opt,
    }));
  };

  const handleNextOrFinish = async () => {
    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Evaluate and submit exam
      setIsSubmitting(true);
      let score = 0;
      const missedConceptIds: string[] = [];

      examSession.questions.forEach((q, idx) => {
        const userAns = selectedAnswers[idx]?.trim().toLowerCase();
        const correctAns = q.correct_answer.trim().toLowerCase();
        if (userAns === correctAns) {
          score += 1;
        } else {
          missedConceptIds.push(q.concept_id);
        }
      });

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const res = await fetch('/api/belt-exam/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            target_rank: targetRank,
            score,
            total_questions: totalQuestions,
            missed_concept_ids: missedConceptIds,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setExamResult({
            passed: data.passed,
            score: data.score,
            totalQuestions: data.totalQuestions,
            targetRank: data.targetRank,
            beltColor: data.beltColor,
            earnedXp: data.earnedXp,
            feedback: data.feedback,
          });
        }
      } catch (submitErr) {
        console.error('Failed to submit belt exam:', submitErr);
        toast.error('Failed to record trial score.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Exam Result Screen (Ceremony or Guidance)
  if (examResult) {
    return (
      <main className="min-h-screen bg-stone-50 dark:bg-black text-stone-800 dark:text-zinc-200 py-12 px-4 transition-colors">
        <Toaster position="bottom-right" />
        <div className="max-w-xl mx-auto space-y-6">
          <div className="border border-stone-200 dark:border-zinc-800 bg-white dark:bg-gradient-to-b dark:from-zinc-950 dark:to-black p-8 rounded-2xl text-center space-y-6 shadow-2xl">
            <div
              className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-white shadow-lg ${
                examResult.passed ? 'bg-red-600 shadow-red-600/30' : 'bg-stone-700 dark:bg-zinc-800'
              }`}
            >
              {examResult.passed ? <Trophy className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-ninja tracking-widest uppercase font-bold text-red-600 block">
                {examResult.passed ? 'Promotion Certified' : 'Trial Concluded'}
              </span>

              <h2 className="text-2xl sm:text-3xl font-black font-ninja text-stone-900 dark:text-white tracking-tight">
                {examResult.passed
                  ? `Promoted to ${examResult.beltColor} ${examResult.targetRank}!`
                  : `Promotion Trial Incomplete`}
              </h2>

              <p className="font-sans text-sm text-stone-600 dark:text-zinc-400 leading-relaxed max-w-md mx-auto">
                {examResult.feedback}
              </p>
            </div>

            {/* Scorecard */}
            <div className="grid grid-cols-3 gap-3 py-2 border-y border-stone-200 dark:border-zinc-800 font-mono text-xs">
              <div className="p-3 bg-stone-50 dark:bg-zinc-900/60 rounded-xl space-y-1">
                <span className="text-[10px] font-ninja text-stone-500 uppercase tracking-widest block font-bold">
                  Score
                </span>
                <span className="text-lg font-bold text-stone-900 dark:text-white">
                  {examResult.score} / {examResult.totalQuestions}
                </span>
              </div>

              <div className="p-3 bg-stone-50 dark:bg-zinc-900/60 rounded-xl space-y-1">
                <span className="text-[10px] font-ninja text-stone-500 uppercase tracking-widest block font-bold">
                  Standard
                </span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  80% Pass
                </span>
              </div>

              <div className="p-3 bg-stone-50 dark:bg-zinc-900/60 rounded-xl space-y-1">
                <span className="text-[10px] font-ninja text-stone-500 uppercase tracking-widest block font-bold">
                  Reward
                </span>
                <span className="text-lg font-bold text-amber-500">
                  +{examResult.earnedXp} XP
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link
                href="/skill-map"
                className="w-full inline-flex items-center justify-center space-x-2 px-6 py-3 bg-stone-900 hover:bg-black dark:bg-zinc-900 dark:hover:bg-zinc-800 text-white rounded-xl font-ninja text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                <span>View Updated Skill Map</span>
                <ChevronRight className="w-4 h-4" />
              </Link>

              {!examResult.passed && (
                <Link
                  href="/dojo"
                  className="w-full inline-flex items-center justify-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-ninja text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95"
                >
                  <Swords className="w-4 h-4" />
                  <span>Train in Daily Dojo</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Active Question Card
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);
  const currentSelection = selectedAnswers[currentIndex];

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-black text-stone-800 dark:text-zinc-200 py-8 px-4 transition-colors">
      <Toaster position="bottom-right" />
      <div className="max-w-2xl mx-auto space-y-5">
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/skill-map"
            className="inline-flex items-center space-x-2 text-xs font-ninja uppercase tracking-wider text-stone-600 dark:text-zinc-400 hover:text-stone-950 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Abandon Trial</span>
          </Link>

          <div className="flex items-center space-x-3 text-xs">
            <span className="font-mono text-xs text-stone-500 dark:text-zinc-400">
              Trial Challenge <strong className="text-stone-900 dark:text-white">{currentIndex + 1}</strong> of{' '}
              {totalQuestions}
            </span>
            <ThemeToggle />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-stone-200 dark:bg-zinc-900 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-red-600 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Main Trial Card */}
        <div className="border border-stone-200 dark:border-zinc-800 bg-white dark:bg-gradient-to-b dark:from-zinc-950 dark:to-zinc-950/95 rounded-2xl shadow-xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-stone-300 via-red-600 to-stone-300 dark:from-zinc-800 dark:via-red-600 dark:to-zinc-800" />

          {/* Exam Header */}
          <div className="p-5 sm:p-6 border-b border-stone-200 dark:border-zinc-800/80 bg-stone-50/60 dark:bg-zinc-900/30 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                <Swords className="w-3 h-3" />
                <span>{targetTier.beltColor} {targetRank} Exam</span>
              </span>

              <span className="font-mono text-xs text-stone-500 dark:text-zinc-500">
                80% passing threshold
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-black font-ninja text-stone-900 dark:text-white tracking-tight">
              {currentQuestion.concept_name}
            </h2>
          </div>

          {/* Question Prompt */}
          <div className="p-5 sm:p-7 space-y-6">
            <div className="p-4 rounded-xl border border-stone-200 dark:border-zinc-800/80 bg-stone-50/70 dark:bg-zinc-900/40">
              <p className="font-sans text-base sm:text-lg leading-relaxed text-stone-900 dark:text-zinc-100 font-normal">
                {currentQuestion.prompt}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((opt, oIdx) => {
                const isSelected = currentSelection === opt;

                return (
                  <button
                    key={oIdx}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start space-x-3.5 ${
                      isSelected
                        ? 'border-red-600 bg-red-50 text-red-900 dark:bg-red-950/30 dark:border-red-500 dark:text-white font-semibold shadow-sm'
                        : 'border-stone-200 bg-stone-50/60 hover:bg-stone-100 hover:border-stone-300 text-stone-800 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-900 dark:hover:border-zinc-700 dark:text-zinc-200'
                    }`}
                  >
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-stone-200 dark:bg-black text-stone-700 dark:text-zinc-400 shrink-0 mt-0.5">
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    <span className="font-sans text-sm sm:text-base leading-relaxed grow">
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Next / Submit Button */}
            <div className="pt-2 flex items-center justify-between gap-4">
              <span className="text-[11px] font-ninja text-stone-500 uppercase tracking-wider">
                Select your answer to proceed
              </span>

              <button
                type="button"
                disabled={!currentSelection || isSubmitting}
                onClick={handleNextOrFinish}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-ninja text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center space-x-2"
              >
                <span>
                  {currentIndex + 1 < totalQuestions
                    ? 'Next Challenge'
                    : isSubmitting
                    ? 'Evaluating...'
                    : 'Submit Trial'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
