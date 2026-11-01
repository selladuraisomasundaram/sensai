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
          className="border border-zinc-900 bg-zinc-950 p-5 rounded-none space-y-4 relative overflow-hidden"
        >
          {/* Subtle top scanline */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

          {/* Module Header Skeleton */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-900/80">
            <div className="flex items-center space-x-3">
              <div className="h-4 w-12 bg-zinc-900 border border-zinc-800 rounded-none" />
              <div className="h-4 w-48 sm:w-64 bg-zinc-900 rounded-none" />
            </div>
            <div className="h-5 w-24 bg-zinc-900 border border-zinc-800 rounded-none" />
          </div>

          {/* Objective / Context Paragraph Skeleton */}
          <div className="space-y-2">
            <div className="h-3 w-32 bg-zinc-900/80 rounded-none" />
            <div className="h-3 w-full bg-zinc-900/60 rounded-none" />
            <div className="h-3 w-5/6 bg-zinc-900/60 rounded-none" />
          </div>

          {/* Code Block or Detailed Diagram Box Skeleton */}
          <div className="border border-zinc-900 bg-black/60 p-4 rounded-none space-y-2">
            <div className="h-3 w-20 bg-zinc-900 rounded-none mb-3" />
            <div className="h-2.5 w-full bg-zinc-900/80 rounded-none" />
            <div className="h-2.5 w-3/4 bg-zinc-900/80 rounded-none" />
            <div className="h-2.5 w-4/5 bg-zinc-900/80 rounded-none" />
          </div>

          {/* Tactical Mission Box Skeleton */}
          <div className="p-3 border border-zinc-900 bg-zinc-900/20 rounded-none flex items-center justify-between">
            <div className="h-3 w-40 bg-zinc-900 rounded-none" />
            <div className="h-3 w-16 bg-zinc-900 rounded-none" />
          </div>
        </div>
      ))}
    </div>
  );
}

