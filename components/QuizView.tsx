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
    <div className="mt-4 border border-zinc-800 bg-zinc-950 font-mono">
      {isCollapsible ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-left bg-zinc-900/60 hover:bg-zinc-900 transition-colors"
        >
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-zinc-300">
            <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
            <span>{title}</span>
            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5">
              {quiz.length} {quiz.length === 1 ? 'Trial' : 'Trials'}
            </span>
          </div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}
        </button>
      ) : (
        <div className="px-4 py-3 bg-zinc-900/60 border-b border-zinc-800 flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-zinc-300">
          <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
          <span>{title}</span>
        </div>
      )}

      {isOpen && (
        <div className="p-4 space-y-6">
          {quiz.map((q, qIdx) => {
            const hasAnswered = selectedAnswers[qIdx] !== undefined;
            const chosenIdx = selectedAnswers[qIdx];
            const isCorrect = chosenIdx === q.correct_answer_index;

            return (
              <div key={qIdx} className="space-y-3">
                <div className="text-xs font-semibold text-zinc-200 leading-relaxed">
                  <span className="text-zinc-500 mr-2">{qIdx + 1}.</span>
                  {q.question}
                </div>

                <div className="space-y-2">
                  {q.options.map((option, optIdx) => {
                    const isSelected = chosenIdx === optIdx;
                    const isTargetAnswer = optIdx === q.correct_answer_index;

                    let buttonStyle = 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300';

                    if (hasAnswered) {
                      if (isSelected && isCorrect) {
                        buttonStyle = 'border-emerald-600 bg-emerald-950/40 text-emerald-300';
                      } else if (isSelected && !isCorrect) {
                        buttonStyle = 'border-red-600 bg-red-950/40 text-red-300';
                      } else if (isTargetAnswer) {
                        buttonStyle = 'border-emerald-800/80 bg-emerald-950/20 text-emerald-400';
                      } else {
                        buttonStyle = 'border-zinc-900 bg-zinc-950/40 text-zinc-600 opacity-60';
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(qIdx, optIdx)}
                        className={`w-full text-left p-3 border rounded-none text-xs flex items-center justify-between transition-colors ${buttonStyle}`}
                      >
                        <span className="flex-1">{option}</span>
                        {hasAnswered && isSelected && (
                          <span className="ml-2">
                            {isCorrect ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-red-400" />
                            )}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {hasAnswered && (
                  <div
                    className={`p-3 text-[11px] border leading-relaxed ${
                      isCorrect
                        ? 'border-emerald-900/40 bg-emerald-950/20 text-emerald-300'
                        : 'border-red-900/40 bg-red-950/20 text-red-300'
                    }`}
                  >
                    <span className="font-bold mr-1">
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
