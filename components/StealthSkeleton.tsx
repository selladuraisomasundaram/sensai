'use client';

import React from 'react';

interface StealthSkeletonProps {
  count?: number;
}

export default function StealthSkeleton({ count = 3 }: StealthSkeletonProps) {
  return (
    <div className="space-y-4 font-mono animate-pulse select-none">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="border border-stone-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 p-5 rounded-xl space-y-4 relative overflow-hidden shadow-sm"
        >
          {/* Subtle top scanline */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500/40 dark:via-zinc-800 to-transparent" />

          {/* Module Header Skeleton */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-zinc-900/80">
            <div className="flex items-center space-x-3">
              <div className="h-4 w-12 bg-stone-200 dark:bg-zinc-900 border border-stone-300 dark:border-zinc-800 rounded" />
              <div className="h-4 w-48 sm:w-64 bg-stone-200 dark:bg-zinc-900 rounded" />
            </div>
            <div className="h-5 w-24 bg-stone-200 dark:bg-zinc-900 border border-stone-300 dark:border-zinc-800 rounded" />
          </div>

          {/* Objective / Context Paragraph Skeleton */}
          <div className="space-y-2">
            <div className="h-3 w-32 bg-stone-200 dark:bg-zinc-900/80 rounded" />
            <div className="h-3 w-full bg-stone-200/80 dark:bg-zinc-900/60 rounded" />
            <div className="h-3 w-5/6 bg-stone-200/80 dark:bg-zinc-900/60 rounded" />
          </div>

          {/* Code Block or Detailed Diagram Box Skeleton */}
          <div className="border border-stone-200 dark:border-zinc-900 bg-stone-100/60 dark:bg-black/60 p-4 rounded-lg space-y-2">
            <div className="h-3 w-20 bg-stone-300 dark:bg-zinc-900 rounded mb-3" />
            <div className="h-2.5 w-full bg-stone-200 dark:bg-zinc-900/80 rounded" />
            <div className="h-2.5 w-3/4 bg-stone-200 dark:bg-zinc-900/80 rounded" />
            <div className="h-2.5 w-4/5 bg-stone-200 dark:bg-zinc-900/80 rounded" />
          </div>

          {/* Tactical Mission Box Skeleton */}
          <div className="p-3 border border-stone-200 dark:border-zinc-900 bg-stone-100/40 dark:bg-zinc-900/20 rounded flex items-center justify-between">
            <div className="h-3 w-40 bg-stone-200 dark:bg-zinc-900 rounded" />
            <div className="h-3 w-16 bg-stone-200 dark:bg-zinc-900 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
