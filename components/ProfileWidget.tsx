'use client';

import React from 'react';
import { calculateRankProgress, type RankTitle } from '@/lib/ranks';
import { Flame, Shield, ChevronRight } from 'lucide-react';

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

  return (
    <div className={`border border-zinc-900 bg-zinc-950 p-4 font-mono ${className}`}>
      {/* Top Meta Line: Rank & Streak */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] text-white font-bold">
            忍
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500">Rank:</span>
              <span className="text-xs font-black uppercase tracking-wider text-white">
                {progress.currentRank}
              </span>
            </div>
          </div>
        </div>

        {/* Current Streak */}
        <div className="flex items-center space-x-1 bg-zinc-900/80 border border-zinc-800 px-2 py-0.5">
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[11px] font-bold text-zinc-200">{streak}d</span>
        </div>
      </div>

      {/* Razor-Thin Progress Bar (2px height, Crimson Red / Katana Accent) */}
      <div className="space-y-1.5 mb-2">
        <div className="w-full h-[2px] bg-zinc-900 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-500"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-zinc-500 tracking-wider">
          <span>{totalXp} XP</span>
          {progress.nextRank ? (
            <span className="flex items-center space-x-0.5 text-zinc-400">
              <span>{progress.xpNeededForNextTier} XP to {progress.nextRank}</span>
              <ChevronRight className="w-2.5 h-2.5 text-zinc-600" />
            </span>
          ) : (
            <span className="text-amber-400 font-bold">MAX RANK ACHIEVED</span>
          )}
        </div>
      </div>

      {email && (
        <div className="pt-2 border-t border-zinc-900/80 text-[10px] text-zinc-600 truncate">
          {email}
        </div>
      )}
    </div>
  );
}

