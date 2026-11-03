'use client';

import React from 'react';
import Link from 'next/link';
import { calculateRankProgress, getRankTier, type RankTitle } from '@/lib/ranks';
import { Flame, Shield, ChevronRight, Brain } from 'lucide-react';

interface ProfileWidgetProps {
  totalXp: number;
  streak: number;
  email?: string;
  className?: string;
}

export default function ProfileWidget({
  totalXp = 0,
  streak = 0,
  email,
  className = '',
}: ProfileWidgetProps) {
  const progress = calculateRankProgress(totalXp);
  const tier = getRankTier(progress.currentRank);

  return (
    <div
      className={`border border-stone-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 p-4 font-mono shadow-sm rounded-xl transition-colors ${className}`}
    >
      {/* Top Meta Line: Rank & Streak */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center space-x-2">
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-[10px] text-stone-900 dark:text-white font-bold border border-stone-300 dark:border-zinc-800"
            style={{ backgroundColor: tier.beltHex + '33' }}
          >
            忍
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] uppercase tracking-widest text-stone-500 dark:text-zinc-500 font-ninja">
                Belt:
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-stone-900 dark:text-white font-ninja">
                {tier.beltColor} {progress.currentRank}
              </span>
            </div>
          </div>
        </div>

        {/* Current Streak & Skill Map link */}
        <div className="flex items-center space-x-2">
          <Link
            href="/skill-map"
            className="inline-flex items-center space-x-1 text-[11px] font-ninja font-bold text-red-600 dark:text-red-400 hover:underline"
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Skill Map</span>
          </Link>

          <div className="flex items-center space-x-1 bg-stone-100 dark:bg-zinc-900/80 border border-stone-200 dark:border-zinc-800 px-2 py-0.5 rounded">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] font-bold text-stone-800 dark:text-zinc-200">{streak}d</span>
          </div>
        </div>
      </div>

      {/* Razor-Thin Progress Bar (2px height, Crimson Red / Katana Accent) */}
      <div className="space-y-1.5 mb-2">
        <div className="w-full h-[2px] bg-stone-200 dark:bg-zinc-900 overflow-hidden relative rounded-full">
          <div
            className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-500"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-zinc-500 tracking-wider">
          <span className="font-semibold">{totalXp} XP</span>
          {progress.nextRank ? (
            <Link
              href="/skill-map"
              className="flex items-center space-x-0.5 text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white"
            >
              <span>{progress.xpNeededForNextTier} XP to {progress.nextRank}</span>
              <ChevronRight className="w-2.5 h-2.5 text-stone-400 dark:text-zinc-600" />
            </Link>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 font-bold">MAX RANK ACHIEVED</span>
          )}
        </div>
      </div>

      {email && (
        <div className="pt-2 border-t border-stone-100 dark:border-zinc-900/80 text-[10px] text-stone-400 dark:text-zinc-600 truncate flex items-center justify-between">
          <span>{email}</span>
          <Link href="/skill-map" className="text-stone-500 hover:text-stone-800 dark:hover:text-zinc-300">
            View Belt Trials &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}

