'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { DojoSessionItem } from '@/types/course';
import type { UserProfile } from '@/lib/streak';
import ThemeToggle from '@/components/ThemeToggle';
import StealthSkeleton from '@/components/StealthSkeleton';
import { Toaster, toast } from 'sonner';
import {
  ArrowLeft,
  Flame,
  Swords,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Brain,
  Clock,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

function extractVideoId(url: string): string {
  const match = url?.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : '';
}

function formatSecondsToMMSS(seconds?: number): string {
  if (typeof seconds !== 'number' || isNaN(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function DojoSessionPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DojoSessionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRewatchVideo, setShowRewatchVideo] = useState(false);

  // Session aggregate metrics
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalXpEarned, setTotalXpEarned] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sm2Feedback, setSm2Feedback] = useState<{
    intervalDays: number;
    masteryScore: number;
    earnedXp: number;
  } | null>(null);

  const [startTime, setStartTime] = useState<number>(Date.now());

  // Load session items & user profile
  useEffect(() => {
    let mounted = true;

    async function initializeDojo() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (session?.user && mounted) {
          setUserEmail(session.user.email || null);
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile && mounted) {
            setUserProfile(profile as UserProfile);
          }
        }

        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/dojo/session', { headers });
        const data = await res.json();

        if (mounted && data.success && Array.isArray(data.items)) {
          setItems(data.items);
        }
      } catch (err) {
        console.error('Failed to load Dojo session:', err);
        toast.error('Unable to summon Dojo session. Check connection.');
      } finally {
        if (mounted) {
          setLoading(false);
          setStartTime(Date.now());
        }
      }
    }

    initializeDojo();
    return () => {
      mounted = false;
    };
  }, []);

  const currentItem = items[currentIndex];

  const handleSelectOption = (option: string) => {
    if (isSubmitted || isSubmitting) return;
    setSelectedOption(option);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedOption || !currentItem || isSubmitted || isSubmitting) return;

    setIsSubmitting(true);
    const responseTimeMs = Date.now() - startTime;
    const wasCorrect =
      selectedOption.trim().toLowerCase() === currentItem.correct_answer.trim().toLowerCase();

    if (wasCorrect) {
      setTotalCorrect((prev) => prev + 1);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (token) {
        const res = await fetch('/api/dojo/review', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            concept_id: currentItem.concept_id,
            question_id: currentItem.question_id,
            was_correct: wasCorrect,
            response_time_ms: responseTimeMs,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setSm2Feedback({
            intervalDays: data.intervalDays,
            masteryScore: data.masteryScore,
            earnedXp: data.earnedXp,
          });
          setTotalXpEarned((prev) => prev + data.earnedXp);
        }
      } else {
        // Guest mode fallback metrics
        const earnedXp = wasCorrect ? 15 : 5;
        setSm2Feedback({
          intervalDays: wasCorrect ? 6 : 1,
          masteryScore: wasCorrect ? 40 : 0,
          earnedXp,
        });
        setTotalXpEarned((prev) => prev + earnedXp);
      }
    } catch (err) {
      console.warn('Review submission error:', err);
    } finally {
      setIsSubmitted(true);
      setIsSubmitting(false);
    }
  };

  const handleNextDrill = () => {
    if (currentIndex + 1 < items.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsSubmitted(false);
      setShowRewatchVideo(false);
      setSm2Feedback(null);
      setStartTime(Date.now());
    } else {
      setSessionCompleted(true);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-50 dark:bg-black text-stone-800 dark:text-zinc-200 py-10 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <StealthSkeleton />
        </div>
      </main>
    );
  }

  // 1. Empty State: No concepts due for review
  if (items.length === 0 && !sessionCompleted) {
    return (
      <main className="min-h-screen bg-stone-50 dark:bg-black text-stone-800 dark:text-zinc-200 py-12 px-4 transition-colors">
        <Toaster position="bottom-right" />
        <div className="max-w-xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 text-xs font-ninja uppercase tracking-wider text-stone-600 dark:text-zinc-400 hover:text-stone-950 dark:hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Training Grounds</span>
            </Link>
            <ThemeToggle />
          </div>

          <div className="border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 rounded-2xl text-center space-y-5 shadow-xl">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-center justify-center text-red-600 dark:text-red-400">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black font-ninja text-stone-900 dark:text-white tracking-tight">
                Dojo Meditation Chamber
              </h2>
              <p className="font-sans text-sm text-stone-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                All learned concepts are currently sharp and reinforced. Spaced repetition will
                schedule reviews as your memory intervals evolve.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-ninja text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                <span>Deconstruct a New Target</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 2. Session Completed State
  if (sessionCompleted) {
    const accuracy = items.length > 0 ? Math.round((totalCorrect / items.length) * 100) : 100;

    return (
      <main className="min-h-screen bg-stone-50 dark:bg-black text-stone-800 dark:text-zinc-200 py-12 px-4 transition-colors">
        <Toaster position="bottom-right" />
        <div className="max-w-xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 text-xs font-ninja uppercase tracking-wider text-stone-600 dark:text-zinc-400 hover:text-stone-950 dark:hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Training Grounds</span>
            </Link>
            <ThemeToggle />
          </div>

          <div className="border border-stone-200 dark:border-zinc-800 bg-white dark:bg-gradient-to-b dark:from-zinc-950 dark:to-black p-8 rounded-2xl text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-ninja tracking-widest text-red-600 uppercase font-bold block">
                Session Accomplished
              </span>
              <h2 className="text-2xl sm:text-3xl font-black font-ninja text-stone-900 dark:text-white tracking-tight">
                Daily Dojo Kata Cleared!
              </h2>
              <p className="font-sans text-sm text-stone-600 dark:text-zinc-400 leading-relaxed max-w-md mx-auto">
                Your neural pathways have been reinforced through active recall and spaced repetition.
              </p>
            </div>

            {/* Scorecard */}
            <div className="grid grid-cols-3 gap-3 py-2 border-y border-stone-200 dark:border-zinc-800">
              <div className="p-3 bg-stone-50 dark:bg-zinc-900/60 rounded-xl space-y-1">
                <span className="text-[10px] font-ninja text-stone-500 uppercase tracking-widest block font-bold">
                  Drills
                </span>
                <span className="font-mono text-lg font-bold text-stone-900 dark:text-white">
                  {items.length}
                </span>
              </div>

              <div className="p-3 bg-stone-50 dark:bg-zinc-900/60 rounded-xl space-y-1">
                <span className="text-[10px] font-ninja text-stone-500 uppercase tracking-widest block font-bold">
                  Precision
                </span>
                <span className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {accuracy}%
                </span>
              </div>

              <div className="p-3 bg-stone-50 dark:bg-zinc-900/60 rounded-xl space-y-1">
                <span className="text-[10px] font-ninja text-stone-500 uppercase tracking-widest block font-bold">
                  Earned XP
                </span>
                <span className="font-mono text-lg font-bold text-amber-500">
                  +{totalXpEarned}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/"
                className="w-full inline-flex items-center justify-center space-x-2 px-6 py-3 bg-stone-900 hover:bg-black dark:bg-zinc-900 dark:hover:bg-zinc-800 text-white rounded-xl font-ninja text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                <span>Return to Training Grounds</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 3. Active Drill Card
  const progressPercent = Math.round(((currentIndex + 1) / items.length) * 100);
  const videoId = extractVideoId(currentItem.video_url);
  const wasCorrect =
    selectedOption?.trim().toLowerCase() === currentItem.correct_answer.trim().toLowerCase();

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-black text-stone-800 dark:text-zinc-200 py-8 px-4 transition-colors">
      <Toaster position="bottom-right" />
      <div className="max-w-2xl mx-auto space-y-5">
        
        {/* Top Header Ribbon */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-xs font-ninja uppercase tracking-wider text-stone-600 dark:text-zinc-400 hover:text-stone-950 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Abandon Kata</span>
          </Link>

          <div className="flex items-center space-x-3 text-xs">
            <span className="font-mono text-xs text-stone-500 dark:text-zinc-400">
              Drill <strong className="text-stone-900 dark:text-white">{currentIndex + 1}</strong> of{' '}
              {items.length}
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

        {/* Main Drill Card */}
        <div className="border border-stone-200 dark:border-zinc-800 bg-white dark:bg-gradient-to-b dark:from-zinc-950 dark:to-zinc-950/95 rounded-2xl shadow-xl overflow-hidden">
          {/* Header Accent Line */}
          <div className="h-1 bg-gradient-to-r from-stone-300 via-red-600 to-stone-300 dark:from-zinc-800 dark:via-red-600 dark:to-zinc-800" />

          {/* Drill Concept Metadata */}
          <div className="p-5 sm:p-6 border-b border-stone-200 dark:border-zinc-800/80 bg-stone-50/60 dark:bg-zinc-900/30 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                <Brain className="w-3 h-3" />
                <span>Concept Recall</span>
              </span>

              <span className="font-mono text-xs text-stone-500 dark:text-zinc-500 truncate max-w-[200px] sm:max-w-xs">
                {currentItem.video_title}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-black font-ninja text-stone-900 dark:text-white tracking-tight">
              {currentItem.concept_name}
            </h2>
          </div>

          {/* Challenge Question & Options */}
          <div className="p-5 sm:p-7 space-y-6">
            <div className="p-4 rounded-xl border border-stone-200 dark:border-zinc-800/80 bg-stone-50/70 dark:bg-zinc-900/40">
              <p className="font-sans text-base sm:text-lg leading-relaxed text-stone-900 dark:text-zinc-100 font-normal">
                {currentItem.question}
              </p>
            </div>

            {/* MCQ Options List */}
            <div className="space-y-3">
              {currentItem.options.map((opt, oIdx) => {
                const isSelected = selectedOption === opt;
                const isCorrectOption =
                  opt.trim().toLowerCase() === currentItem.correct_answer.trim().toLowerCase();

                let optionClass =
                  'border-stone-200 bg-stone-50/60 hover:bg-stone-100 hover:border-stone-300 text-stone-800 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-900 dark:hover:border-zinc-700 dark:text-zinc-200';

                if (isSelected && !isSubmitted) {
                  optionClass =
                    'border-red-600 bg-red-50 text-red-900 dark:bg-red-950/30 dark:border-red-500 dark:text-white font-semibold shadow-sm';
                }

                if (isSubmitted) {
                  if (isCorrectOption) {
                    optionClass =
                      'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-500/80 dark:text-emerald-200 font-semibold';
                  } else if (isSelected && !wasCorrect) {
                    optionClass =
                      'border-red-600 bg-red-50 text-red-900 dark:bg-red-950/40 dark:border-red-600 dark:text-red-300';
                  } else {
                    optionClass =
                      'opacity-50 border-stone-200 dark:border-zinc-800 text-stone-500 dark:text-zinc-500';
                  }
                }

                return (
                  <button
                    key={oIdx}
                    type="button"
                    disabled={isSubmitted || isSubmitting}
                    onClick={() => handleSelectOption(opt)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start space-x-3.5 ${optionClass}`}
                  >
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-stone-200 dark:bg-black text-stone-700 dark:text-zinc-400 shrink-0 mt-0.5">
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    <span className="font-sans text-sm sm:text-base leading-relaxed grow">
                      {opt}
                    </span>
                    {isSubmitted && isCorrectOption && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                    {isSubmitted && isSelected && !wasCorrect && (
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Action Bar before submission */}
            {!isSubmitted && (
              <div className="pt-2 flex items-center justify-between gap-4">
                <span className="text-[11px] font-ninja text-stone-500 uppercase tracking-wider">
                  Select option to strike
                </span>
                <button
                  type="button"
                  disabled={!selectedOption || isSubmitting}
                  onClick={handleSubmitAnswer}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-ninja text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center space-x-2"
                >
                  <Swords className="w-4 h-4" />
                  <span>{isSubmitting ? 'Evaluating...' : 'Confirm Strike'}</span>
                </button>
              </div>
            )}

            {/* Post-Submission Feedback & Rewatch In-Place Feature */}
            {isSubmitted && (
              <div className="space-y-4 pt-4 border-t border-stone-200 dark:border-zinc-800/80">
                {/* Result Praise / Sensei Hint */}
                <div
                  className={`p-4 rounded-xl border ${
                    wasCorrect
                      ? 'border-emerald-300 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                      : 'border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  <div className="flex items-center space-x-2 font-ninja text-xs uppercase tracking-wider font-bold mb-1">
                    {wasCorrect ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Precise Strike // Knowledge Solidified</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>Strike Missed // Review Principle</span>
                      </>
                    )}
                  </div>
                  <p className="font-sans text-xs sm:text-sm leading-relaxed">
                    {currentItem.explanation || currentItem.concept_summary}
                  </p>
                </div>

                {/* SM-2 Spaced Repetition Stats */}
                {sm2Feedback && (
                  <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                    <div className="p-2.5 rounded-lg border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900/40">
                      <span className="text-[10px] font-ninja text-stone-500 uppercase tracking-widest block font-bold">
                        Next Review
                      </span>
                      <span className="font-mono font-bold text-stone-800 dark:text-zinc-200">
                        +{sm2Feedback.intervalDays} {sm2Feedback.intervalDays === 1 ? 'day' : 'days'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900/40">
                      <span className="text-[10px] font-ninja text-stone-500 uppercase tracking-widest block font-bold">
                        Concept Mastery
                      </span>
                      <span className="font-mono font-bold text-red-600 dark:text-red-400">
                        {sm2Feedback.masteryScore}%
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900/40">
                      <span className="text-[10px] font-ninja text-stone-500 uppercase tracking-widest block font-bold">
                        XP Gained
                      </span>
                      <span className="font-mono font-bold text-amber-500">
                        +{sm2Feedback.earnedXp} XP
                      </span>
                    </div>
                  </div>
                )}

                {/* Rewatch the Exact Moment (In-place embedded segment player) */}
                {videoId && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowRewatchVideo(!showRewatchVideo)}
                        className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg border border-stone-300 dark:border-zinc-800 bg-stone-100 hover:bg-stone-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-stone-800 dark:text-zinc-300 text-xs font-mono transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current text-red-600 dark:text-red-500" />
                        <span>
                          {showRewatchVideo ? 'Hide Player' : 'Rewatch'} (
                          {formatSecondsToMMSS(currentItem.start_sec)} –{' '}
                          {formatSecondsToMMSS(currentItem.end_sec)})
                        </span>
                      </button>

                      <Link
                        href={`/course/${currentItem.course_id}`}
                        target="_blank"
                        className="inline-flex items-center space-x-1 text-xs text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-zinc-200 underline underline-offset-4 font-mono"
                      >
                        <span>Open Full Course</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    {showRewatchVideo && (
                      <div className="aspect-video w-full rounded-xl overflow-hidden border border-stone-300 dark:border-zinc-800 bg-black shadow-inner">
                        <iframe
                          className="w-full h-full"
                          src={`https://www.youtube-nocookie.com/embed/${videoId}?start=${currentItem.start_sec}&autoplay=1`}
                          title="Rewatch Segment"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Advance to Next Kata Drill */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleNextDrill}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-ninja text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2"
                  >
                    <span>
                      {currentIndex + 1 < items.length
                        ? 'Advance to Next Kata Drill'
                        : 'Complete Daily Dojo Kata'}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

