/**
 * SuperMemo-2 (SM-2) Spaced Repetition Scheduling Engine
 * Computes memory retention intervals, ease factors, and due dates.
 */

export interface SM2Input {
  grade: number;         // 0 to 5 (0-2: Fail, 3: Pass with effort, 4: Good, 5: Perfect)
  repetitions: number;   // Prior consecutive successful reviews
  easeFactor: number;    // Starting default is typically 2.5
  intervalDays: number;  // Current interval in days
}

export interface SM2Output {
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  dueAt: Date;
  masteryScore: number;  // 0 to 100%
}

/**
 * Calculates updated SM-2 parameters based on user recall grade (0 to 5).
 * - Grade 5: Perfect response, zero hesitation
 * - Grade 4: Correct response after brief hesitation
 * - Grade 3: Correct response recalled with serious difficulty
 * - Grade 2: Incorrect response; correct answer seemed easy to recall
 * - Grade 1: Incorrect response; correct one remembered
 * - Grade 0: Complete blackout
 */
export function calculateSM2({
  grade,
  repetitions,
  easeFactor,
  intervalDays,
}: SM2Input): SM2Output {
  let nextRepetitions = repetitions;
  let nextInterval = intervalDays;
  let nextEase = easeFactor;

  // 1. Update Ease Factor: EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  nextEase = nextEase + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (nextEase < 1.3) nextEase = 1.3; // SM-2 safety floor

  // 2. Compute Next Interval
  if (grade < 3) {
    // Failed recall: reset repetitions and schedule for immediate review tomorrow
    nextRepetitions = 0;
    nextInterval = 1;
  } else {
    // Successful recall: graduate through intervals
    if (repetitions === 0) {
      nextInterval = 1; // 1 day
    } else if (repetitions === 1) {
      nextInterval = 6; // 6 days
    } else {
      nextInterval = Math.round(intervalDays * nextEase);
    }
    nextRepetitions += 1;
  }

  // 3. Compute next due timestamp
  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + nextInterval);

  // 4. Normalized Mastery percentage (0 to 100%)
  const masteryScore = Math.min(100, Math.round((nextRepetitions / 5) * 100));

  return {
    repetitions: nextRepetitions,
    easeFactor: Number(nextEase.toFixed(2)),
    intervalDays: nextInterval,
    dueAt,
    masteryScore,
  };
}
