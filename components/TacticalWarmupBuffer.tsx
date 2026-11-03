'use client';

import React, { useState, useEffect } from 'react';
import {
  Brain,
  Sparkles,
  CheckCircle2,
  Clock,
  Compass,
  Lightbulb,
  ChevronRight,
  ShieldAlert,
  Zap,
  Swords,
  Scroll,
} from 'lucide-react';

interface TacticalWarmupBufferProps {
  statusMessage?: string;
  onBonusXp?: (bonusXp: number) => void;
}

interface WarmupQuestion {
  question: string;
  options: [string, string];
  correctIndex: number;
  explanation: string;
}

const WARMUP_QUESTIONS: WarmupQuestion[] = [
  {
    question: 'According to cognitive learning science, which method yields the highest long-term retention?',
    options: ['Active Recall & Retrieval Practice', 'Re-reading highlighted notes repeatedly'],
    correctIndex: 0,
    explanation: 'Active retrieval forces the brain to reconstruct neural pathways, generating up to 300% higher retention than passive review.',
  },
  {
    question: 'In computer science, what is the average time complexity of searching a key in a Hash Table?',
    options: ['O(1) Constant Time', 'O(n) Linear Time'],
    correctIndex: 0,
    explanation: 'With a well-distributed hash function, hash tables resolve key lookups in O(1) average time.',
  },
  {
    question: 'In the Feynman Technique, what is the true test of deep comprehension?',
    options: ['Explaining it simply in plain words to a beginner', 'Memorizing the exact textbook technical definitions'],
    correctIndex: 0,
    explanation: 'Richard Feynman stated: if you cannot explain a concept simply without hiding behind jargon, you have not truly mastered it.',
  },
  {
    question: 'What is the primary benefit of the SuperMemo-2 (SM-2) spaced repetition algorithm?',
    options: ['It expands review intervals right before you forget', 'It schedules flashcards randomly every hour'],
    correctIndex: 0,
    explanation: 'SM-2 tracks ease factors and exponentially expands review intervals (1d → 6d → interval * ease) to combat Ebbinghaus forgetting.',
  },
  {
    question: 'In modern JavaScript, how does block scope behave with `let` and `const`?',
    options: ['Scoped strictly to nearest curly braces {}', 'Hoisted globally across the entire enclosing function'],
    correctIndex: 0,
    explanation: '`let` and `const` are block-scoped to the nearest enclosing pair of curly braces {}, eliminating var hoisting bugs.',
  },
  {
    question: 'What is the role of an invariant in system and algorithm design?',
    options: ['A condition that always remains true throughout execution', 'A variable that mutates randomly at runtime'],
    correctIndex: 0,
    explanation: 'An invariant is a foundational mathematical property or assertion that must hold true through every step of a loop or state machine.',
  },
];

const SENSEI_PROVERBS = [
  '“Active recall is not a test of what you know—it is the very act of building the memory.”',
  '“The master has failed more times than the beginner has even attempted.”',
  '“Break every massive system down to its atomic mechanics; complexity is merely layered simplicity.”',
  '“Spacing your practice across days turns temporary short-term recall into permanent neural muscle memory.”',
  '“Do not merely watch code be written. Transcribe it, break it, and reconstruct it with your own hands.”',
];

export default function TacticalWarmupBuffer({
  statusMessage = 'Decomposing target stream in background...',
  onBonusXp,
}: TacticalWarmupBufferProps) {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [proverbIndex, setProverbIndex] = useState(0);
  const [earnedBonus, setEarnedBonus] = useState(false);

  // Rotate Sensei proverbs every 7 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setProverbIndex((prev) => (prev + 1) % SENSEI_PROVERBS.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const currentQ = WARMUP_QUESTIONS[currentQIndex];

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);

    if (index === currentQ.correctIndex && !earnedBonus) {
      setEarnedBonus(true);
      if (onBonusXp) {
        onBonusXp(15);
      }
    }
  };

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setCurrentQIndex((prev) => (prev + 1) % WARMUP_QUESTIONS.length);
  };

  return (
    <div className="w-full border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl shadow-xl overflow-hidden transition-all animate-in fade-in duration-300">
      {/* Top Accent Strip */}
      <div className="h-1 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

      {/* Real-Time Processing Status Header */}
      <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-zinc-800/80 bg-stone-50/70 dark:bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-red-600 dark:bg-red-500" />
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping absolute opacity-75" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-ninja tracking-widest uppercase text-red-600 dark:text-red-500 font-bold">
                Decomposition In Progress
              </span>
              <span className="text-[10px] bg-stone-200 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 font-mono px-1.5 py-0.2 rounded">
                AI Pipeline
              </span>
            </div>
            <p className="text-xs font-mono text-stone-800 dark:text-zinc-200 font-semibold mt-0.5">
              {statusMessage}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-stone-500 dark:text-zinc-400 text-xs font-mono self-start sm:self-center">
          <Clock className="w-3.5 h-3.5 text-stone-400 animate-spin" />
          <span>Synthesis Buffer Active</span>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Interactive Sensei Focus Flashcard */}
        <div className="p-5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50/60 dark:bg-zinc-900/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-red-600 dark:text-red-500" />
              <span className="text-xs font-ninja tracking-wider uppercase font-bold text-stone-900 dark:text-white">
                Pre-Flight Focus Warmup
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {earnedBonus && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-[10px] font-mono font-bold animate-pulse border border-amber-300 dark:border-amber-900">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>+15 Warmup XP</span>
                </span>
              )}
              <span className="font-mono text-[10px] text-stone-400 dark:text-zinc-500">
                Drill {currentQIndex + 1}/{WARMUP_QUESTIONS.length}
              </span>
            </div>
          </div>

          <h4 className="font-sans text-sm sm:text-base font-semibold text-stone-900 dark:text-zinc-100 leading-snug">
            {currentQ.question}
          </h4>

          {/* 2-Option Binary Choice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {currentQ.options.map((opt, idx) => {
              const isSelected = selectedAnswer === idx;
              const isCorrect = idx === currentQ.correctIndex;

              let buttonClass =
                'border-stone-300 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 hover:border-red-500 text-stone-800 dark:text-zinc-200';

              if (selectedAnswer !== null) {
                if (isCorrect) {
                  buttonClass =
                    'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-500/80 dark:text-emerald-200 font-bold';
                } else if (isSelected && !isCorrect) {
                  buttonClass =
                    'border-red-500 bg-red-50 text-red-950 dark:bg-red-950/40 dark:border-red-500 dark:text-red-200';
                } else {
                  buttonClass = 'opacity-40 border-stone-200 dark:border-zinc-800';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={selectedAnswer !== null}
                  onClick={() => handleAnswer(idx)}
                  className={`p-3.5 rounded-xl border text-left font-sans text-xs sm:text-sm leading-relaxed transition-all flex items-start space-x-2.5 ${buttonClass}`}
                >
                  <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-stone-100 dark:bg-black text-stone-600 dark:text-zinc-400 shrink-0">
                    {idx === 0 ? 'A' : 'B'}
                  </span>
                  <span className="grow">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation & Next Drill Button */}
          {selectedAnswer !== null && (
            <div className="pt-3 border-t border-stone-200 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="text-xs font-sans text-stone-600 dark:text-zinc-400 max-w-md leading-relaxed">
                <strong className={selectedAnswer === currentQ.correctIndex ? 'text-emerald-600 dark:text-emerald-400 font-ninja' : 'text-amber-600 dark:text-amber-400 font-ninja'}>
                  {selectedAnswer === currentQ.correctIndex ? '✓ Correct Strike: ' : 'Notice: '}
                </strong>
                {currentQ.explanation}
              </div>

              <button
                type="button"
                onClick={handleNextQuestion}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-black dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-ninja text-xs font-bold uppercase tracking-wider shrink-0 self-start sm:self-center transition-colors"
              >
                <span>Next Warmup</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Rotating Sensei Wisdom Scroll */}
        <div className="p-4 rounded-xl border border-stone-200 dark:border-zinc-800/80 bg-stone-50/40 dark:bg-zinc-900/20 flex items-start space-x-3 text-xs">
          <Scroll className="w-4 h-4 text-red-600 dark:text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="text-[10px] font-ninja uppercase tracking-widest text-stone-400 dark:text-zinc-500 font-bold block">
              Sensei&apos;s Proverb // Neural Discipline
            </span>
            <p className="font-sans text-stone-700 dark:text-zinc-300 italic transition-all duration-300">
              {SENSEI_PROVERBS[proverbIndex]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
