export type RankTitle = 'Initiate' | 'Ronin' | 'Shinobi' | 'Sensai';

export interface RankTier {
  title: RankTitle;
  minXp: number;
  maxXp: number;
  description: string;
}

export const RANKS: readonly RankTier[] = [
  {
    title: 'Initiate',
    minXp: 0,
    maxXp: 100,
    description: 'Neophyte taking the first steps of digital discipline.',
  },
  {
    title: 'Ronin',
    minXp: 101,
    maxXp: 500,
    description: 'Wandering practitioner mastering core system fundamentals.',
  },
  {
    title: 'Shinobi',
    minXp: 501,
    maxXp: 2000,
    description: 'Disciplined operative executing complex architectural trials.',
  },
  {
    title: 'Sensai',
    minXp: 2001,
    maxXp: Infinity,
    description: 'Master of the decomposition craft.',
  },
] as const;

export interface RankProgress {
  currentRank: RankTitle;
  nextRank: RankTitle | null;
  totalXp: number;
  minXp: number;
  maxXp: number;
  xpInCurrentTier: number;
  xpNeededForNextTier: number;
  percentage: number;
}

/**
 * Calculates current rank and the percentage progress toward the next rank.
 */
export function calculateRankProgress(totalXp: number = 0): RankProgress {
  const xp = Math.max(0, Math.floor(totalXp));

  if (xp >= 2001) {
    return {
      currentRank: 'Sensai',
      nextRank: null,
      totalXp: xp,
      minXp: 2001,
      maxXp: 2001,
      xpInCurrentTier: xp - 2001,
      xpNeededForNextTier: 0,
      percentage: 100,
    };
  }

  if (xp >= 501) {
    const min = 501;
    const max = 2000;
    const tierSpan = max - min;
    const currentInTier = xp - min;
    const percentage = Math.min(100, Math.floor((currentInTier / tierSpan) * 100));

    return {
      currentRank: 'Shinobi',
      nextRank: 'Sensai',
      totalXp: xp,
      minXp: min,
      maxXp: max,
      xpInCurrentTier: currentInTier,
      xpNeededForNextTier: max - xp,
      percentage,
    };
  }

  if (xp >= 101) {
    const min = 101;
    const max = 500;
    const tierSpan = max - min;
    const currentInTier = xp - min;
    const percentage = Math.min(100, Math.floor((currentInTier / tierSpan) * 100));

    return {
      currentRank: 'Ronin',
      nextRank: 'Shinobi',
      totalXp: xp,
      minXp: min,
      maxXp: max,
      xpInCurrentTier: currentInTier,
      xpNeededForNextTier: max - xp,
      percentage,
    };
  }

  // Initiate (0 - 100 XP)
  const min = 0;
  const max = 100;
  const percentage = Math.min(100, Math.floor((xp / max) * 100));

  return {
    currentRank: 'Initiate',
    nextRank: 'Ronin',
    totalXp: xp,
    minXp: min,
    maxXp: max,
    xpInCurrentTier: xp,
    xpNeededForNextTier: max - xp,
    percentage,
  };
}

