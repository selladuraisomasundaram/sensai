'use client';

import React, { useState } from 'react';
import type { QuizQuestion } from '@/types/course';
import { HelpCircle, Check, X, ChevronDown, ChevronUp } from 'lucide-react';

interface QuizViewProps {
  quiz: QuizQuestion[];
  title?: string;
  isCollapsible?: boolean;
  onComplete?: (score: number, totalQuestions: number) => void;
}

export default function QuizView({
  quiz,
  title = 'Tactical Knowledge Check',
  isCollapsible = true,
  onComplete,
}: QuizViewProps) {
  const [isOpen, setIsOpen] = useState(!isCollapsible);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [hasReportedCompletion, setHasReportedCompletion] = useState(false);

  if (!quiz || quiz.length === 0) return null;

  const handleSelectOption = (questionIdx: number, optionIdx: number) => {
    const updated = {
      ...selectedAnswers,
      [questionIdx]: optionIdx,
    };
    setSelectedAnswers(updated);

    // If all questions answered, calculate score and trigger completion callback
    if (Object.keys(updated).length === quiz.length && !hasReportedCompletion && onComplete) {
      let score = 0;
      quiz.forEach((q, idx) => {
        if (updated[idx] === q.correct_answer_index) {
          score += 1;
        }
      });
      setHasReportedCompletion(true);
      onComplete(score, quiz.length);
    }
  };

  return (
    <div className="mt-4 border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl overflow-hidden shadow-sm transition-colors">
      {isCollapsible ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-left bg-stone-50 hover:bg-stone-100 dark:bg-zinc-900/60 dark:hover:bg-zinc-900 transition-colors"
        >
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-zinc-300 font-ninja">
            <HelpCircle className="w-3.5 h-3.5 text-stone-500 dark:text-zinc-400" />
            <span>{title}</span>
            <span className="text-[10px] bg-stone-200 dark:bg-zinc-800 text-stone-700 dark:text-zinc-400 px-1.5 py-0.5 rounded font-mono">
              {quiz.length} {quiz.length === 1 ? 'Trial' : 'Trials'}
            </span>
          </div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-stone-500 dark:text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-stone-500 dark:text-zinc-500" />
          )}
        </button>
      ) : (
        <div className="px-4 py-3 bg-stone-50 dark:bg-zinc-900/60 border-b border-stone-200 dark:border-zinc-800 flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-zinc-300 font-ninja">
          <HelpCircle className="w-3.5 h-3.5 text-stone-500 dark:text-zinc-400" />
          <span>{title}</span>
        </div>
      )}

      {isOpen && (
        <div className="p-4 sm:p-5 space-y-6">
          {quiz.map((q, qIdx) => {
            const hasAnswered = selectedAnswers[qIdx] !== undefined;
            const chosenIdx = selectedAnswers[qIdx];
            const isCorrect = chosenIdx === q.correct_answer_index;

            return (
              <div key={qIdx} className="space-y-3">
                <div className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-zinc-100 leading-relaxed font-sans">
                  <span className="text-stone-400 dark:text-zinc-500 font-mono mr-2">{qIdx + 1}.</span>
                  {q.question}
                </div>

                <div className="space-y-2">
                  {q.options.map((option, optIdx) => {
                    const isSelected = chosenIdx === optIdx;
                    const isTargetAnswer = optIdx === q.correct_answer_index;

                    let buttonStyle =
                      'border-stone-200 dark:border-zinc-800 bg-stone-50 hover:bg-stone-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 text-stone-800 dark:text-zinc-300';

                    if (hasAnswered) {
                      if (isSelected && isCorrect) {
                        buttonStyle =
                          'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300';
                      } else if (isSelected && !isCorrect) {
                        buttonStyle =
                          'border-red-600 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-300';
                      } else if (isTargetAnswer) {
                        buttonStyle =
                          'border-emerald-500/80 bg-emerald-50/60 text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/20 dark:text-emerald-400';
                      } else {
                        buttonStyle =
                          'border-stone-200 dark:border-zinc-900 bg-stone-100/50 dark:bg-zinc-950/40 text-stone-400 dark:text-zinc-600 opacity-60';
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(qIdx, optIdx)}
                        className={`w-full text-left p-3 border rounded-lg text-xs sm:text-sm font-sans flex items-center justify-between transition-colors ${buttonStyle}`}
                      >
                        <span className="flex-1">{option}</span>
                        {hasAnswered && isSelected && (
                          <span className="ml-2 shrink-0">
                            {isCorrect ? (
                              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                            )}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {hasAnswered && (
                  <div
                    className={`p-3 text-xs rounded-lg border leading-relaxed font-sans ${
                      isCorrect
                        ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300'
                        : 'border-red-200 bg-red-50/80 text-red-900 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300'
                    }`}
                  >
                    <span className="font-bold font-mono mr-1">
                      {isCorrect ? '[CONFIRMED]:' : '[TACTICAL DEBRIEF]:'}
                    </span>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
