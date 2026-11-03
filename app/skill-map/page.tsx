'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import type { SkillMapConcept, SkillMapSummary } from '@/types/course';
import { getRankTier } from '@/lib/ranks';
import ThemeToggle from '@/components/ThemeToggle';
import StealthSkeleton from '@/components/StealthSkeleton';
import { Toaster, toast } from 'sonner';
import {
  ArrowLeft,
  Brain,
  Shield,
  Trophy,
  Swords,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter,
  Play,
  RotateCcw,
} from 'lucide-react';

function formatSecondsToMMSS(seconds?: number): string {
  if (typeof seconds !== 'number' || isNaN(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

type FilterTab = 'all' | 'at_risk' | 'reinforcing' | 'mastered';

export default function SkillMapPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SkillMapSummary | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selectedConcept, setSelectedConcept] = useState<SkillMapConcept | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSkillMap() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/skill-map', { headers });
        const data = await res.json();

        if (mounted && data.success && data.summary) {
          setSummary(data.summary);
        }
      } catch (err) {
        console.error('Failed to load skill map:', err);
        toast.error('Unable to summon Skill Map.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSkillMap();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-50 dark:bg-black text-stone-800 dark:text-zinc-200 py-10 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <StealthSkeleton />
        </div>
      </main>
    );
  }

  const currentBelt = summary?.currentBelt || 'Initiate';
  const currentTier = getRankTier(currentBelt);
  const nextBelt = summary?.nextBelt;
  const nextTier = nextBelt ? getRankTier(nextBelt) : null;

  const concepts = summary?.concepts || [];
  const filteredConcepts = concepts.filter((c) => {
    if (activeFilter === 'all') return true;
    return c.status === activeFilter;
  });

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-black text-stone-800 dark:text-zinc-200 py-8 px-4 transition-colors">
      <Toaster position="bottom-right" />
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-xs font-ninja uppercase tracking-wider text-stone-600 dark:text-zinc-400 hover:text-stone-950 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Training Grounds</span>
          </Link>
          <div className="flex items-center space-x-3 text-xs">
            <Link
              href="/dojo"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-stone-800 dark:text-zinc-200 rounded-lg font-ninja text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <Swords className="w-3.5 h-3.5 text-red-600 dark:text-red-500" />
              <span>Daily Dojo</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>

        {/* Belt Exam Promotion Card */}
        <section className="relative overflow-hidden border border-stone-200 dark:border-zinc-800 bg-white dark:bg-gradient-to-r dark:from-zinc-950 dark:via-zinc-900/60 dark:to-zinc-950 p-6 rounded-2xl shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs font-ninja uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Ninja Martial Belt Progression</span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full inline-block shadow-sm"
                    style={{ backgroundColor: currentTier.beltHex }}
                  />
                  <h2 className="text-xl sm:text-2xl font-black font-ninja text-stone-900 dark:text-white tracking-tight">
                    {currentTier.beltColor} {currentBelt}
                  </h2>
                </div>

                {nextBelt && (
                  <>
                    <ChevronRight className="w-4 h-4 text-stone-400 dark:text-zinc-600" />
                    <span className="text-sm font-ninja text-stone-500 dark:text-zinc-400">
                      Goal: <strong className="text-stone-900 dark:text-white">{nextBelt}</strong>
                    </span>
                  </>
                )}
              </div>

              <p className="text-xs text-stone-600 dark:text-zinc-400 font-sans leading-relaxed max-w-lg">
                Promotions require demonstrated retention across your concept skill map, not mere watch time.
              </p>
            </div>

            {/* Exam Action CTA */}
            {nextBelt && (
              <div className="shrink-0 flex flex-col items-start md:items-end space-y-2">
                <div className="text-[11px] font-mono text-stone-500 dark:text-zinc-400">
                  Mastered: <strong className="text-stone-900 dark:text-white">{summary?.masteredCount || 0}</strong> /{' '}
                  {summary?.requiredConcepts || 0} required
                </div>

                {summary?.examReady ? (
                  <Link
                    href="/belt-exam"
                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-ninja text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-600/30 animate-pulse active:scale-95"
                  >
                    <Swords className="w-4 h-4" />
                    <span>Challenge {nextBelt} Exam &rarr;</span>
                  </Link>
                ) : (
                  <button
                    disabled
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-stone-100 dark:bg-zinc-900 text-stone-400 dark:text-zinc-600 border border-stone-200 dark:border-zinc-800 rounded-xl font-ninja text-xs font-bold uppercase tracking-wider cursor-not-allowed"
                    title={`Master at least ${summary?.requiredConcepts} concepts to qualify.`}
                  >
                    <span>{nextBelt} Exam Locked</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Skill Map Summary Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-4 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 shadow-sm space-y-1">
            <span className="text-[10px] font-ninja text-stone-500 uppercase tracking-widest block font-bold">
              Total Concepts
            </span>
            <span className="text-xl font-bold text-stone-900 dark:text-white">
              {summary?.totalConcepts || 0}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm space-y-1">
            <span className="text-[10px] font-ninja text-emerald-700 dark:text-emerald-400 uppercase tracking-widest block font-bold">
              Mastered (70%+)
            </span>
            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
              {summary?.masteredCount || 0}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-950/60 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm space-y-1">
            <span className="text-[10px] font-ninja text-amber-700 dark:text-amber-400 uppercase tracking-widest block font-bold">
              Reinforcing
            </span>
            <span className="text-xl font-bold text-amber-700 dark:text-amber-400">
              {summary?.reinforcingCount || 0}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-red-200 dark:border-red-950/60 bg-red-50/50 dark:bg-red-950/20 shadow-sm space-y-1">
            <span className="text-[10px] font-ninja text-red-700 dark:text-red-400 uppercase tracking-widest block font-bold">
              Due / At Risk
            </span>
            <span className="text-xl font-bold text-red-700 dark:text-red-400">
              {summary?.atRiskCount || 0}
            </span>
          </div>
        </div>

        {/* Skill Map Concept Registry */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-red-600 dark:text-red-500" />
              <h3 className="font-ninja text-sm uppercase tracking-wider font-bold text-stone-900 dark:text-white">
                Atomic Skill Map Registry
              </h3>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-1 border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-1 rounded-xl text-xs font-ninja">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeFilter === 'all'
                    ? 'bg-stone-900 text-white dark:bg-zinc-800 dark:text-white font-bold'
                    : 'text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                All ({concepts.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('at_risk')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeFilter === 'at_risk'
                    ? 'bg-red-600 text-white font-bold'
                    : 'text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                At Risk ({summary?.atRiskCount || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('reinforcing')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeFilter === 'reinforcing'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                Reinforcing ({summary?.reinforcingCount || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('mastered')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeFilter === 'mastered'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                Mastered ({summary?.masteredCount || 0})
              </button>
            </div>
          </div>

          {/* Concepts Grid */}
          {filteredConcepts.length === 0 ? (
            <div className="p-8 border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl text-center text-stone-500 dark:text-zinc-500 font-mono text-xs">
              No concepts matching the selected filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredConcepts.map((c) => {
                let badgeClass =
                  'bg-stone-100 text-stone-600 dark:bg-zinc-900 dark:text-zinc-400 border-stone-300 dark:border-zinc-800';
                let statusLabel = 'Unlearned';

                if (c.status === 'mastered') {
                  badgeClass =
                    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-900/60';
                  statusLabel = `Mastered (${c.mastery_score}%)`;
                } else if (c.status === 'reinforcing') {
                  badgeClass =
                    'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 dark:border-amber-900/60';
                  statusLabel = `Reinforcing (${c.mastery_score}%)`;
                } else if (c.status === 'at_risk') {
                  badgeClass =
                    'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-red-300 dark:border-red-900/60';
                  statusLabel = `At Risk (${c.mastery_score}%)`;
                }

                return (
                  <div
                    key={c.id}
                    className="p-4 sm:p-5 border border-stone-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 rounded-2xl shadow-sm space-y-3 hover:border-red-500/40 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded border font-mono text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}
                        >
                          {statusLabel}
                        </span>

                        <span className="font-mono text-[10px] text-stone-500 dark:text-zinc-500 truncate max-w-[160px]">
                          {c.video_title}
                        </span>
                      </div>

                      <h4 className="font-ninja text-sm font-bold text-stone-900 dark:text-white tracking-tight">
                        {c.name}
                      </h4>

                      {c.summary && (
                        <p className="font-sans text-xs leading-relaxed text-stone-600 dark:text-zinc-400 line-clamp-2">
                          {c.summary}
                        </p>
                      )}
                    </div>

                    {/* Footer Actions & Interval Info */}
                    <div className="pt-2 border-t border-stone-100 dark:border-zinc-900 flex items-center justify-between text-xs">
                      <Link
                        href={`/course/${c.course_id}`}
                        className="inline-flex items-center space-x-1.5 text-[11px] font-mono text-red-600 dark:text-red-400 hover:underline"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>
                          {formatSecondsToMMSS(c.start_sec)} – {formatSecondsToMMSS(c.end_sec)}
                        </span>
                      </Link>

                      <span className="font-mono text-[10px] text-stone-500 dark:text-zinc-500">
                        {c.repetitions > 0 ? `Streak: ${c.repetitions} reps` : 'Unreviewed'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
