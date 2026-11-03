'use client';

import React, { useState } from 'react';
import type { QuizQuestion } from '@/types/course';
import { Trophy, CheckCircle2, XCircle, Award } from 'lucide-react';

interface FinalQuizProps {
  quiz: QuizQuestion[];
  courseId: string;
}

export default function FinalQuiz({ quiz, courseId }: FinalQuizProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!quiz || quiz.length === 0) return null;

  const handleSelect = (questionIdx: number, optionIdx: number) => {
    if (submitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIdx]: optionIdx,
    }));
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const isComplete = answeredCount === quiz.length;

  const calculateScore = () => {
    let score = 0;
    quiz.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correct_answer_index) {
        score += 1;
      }
    });
    return score;
  };

  const score = calculateScore();
  const percentage = Math.round((score / quiz.length) * 100);

  return (
    <section className="border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 rounded-2xl shadow-sm dark:shadow-2xl space-y-6 transition-colors">
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-zinc-900 pb-4">
        <div className="flex items-center space-x-2 text-red-600 dark:text-red-500 text-xs font-bold uppercase tracking-widest font-ninja">
          <Trophy className="w-4 h-4" />
          <span>The Final Trial</span>
        </div>
        <span className="text-[11px] text-stone-500 dark:text-zinc-500 uppercase tracking-widest font-mono">
          {quiz.length} Examination Questions
        </span>
      </div>

      <div className="space-y-6">
        {quiz.map((q, qIdx) => {
          const chosenIdx = selectedAnswers[qIdx];
          const hasChosen = chosenIdx !== undefined;
          const isCorrect = chosenIdx === q.correct_answer_index;

          return (
            <div key={qIdx} className="space-y-3">
              <div className="text-xs sm:text-sm font-bold text-stone-900 dark:text-zinc-100 leading-relaxed font-sans">
                <span className="text-stone-400 dark:text-zinc-500 font-mono mr-2">Trial {qIdx + 1}:</span>
                {q.question}
              </div>

              <div className="space-y-2">
                {q.options.map((opt, optIdx) => {
                  const isSelected = chosenIdx === optIdx;
                  const isAnswerTarget = optIdx === q.correct_answer_index;

                  let style =
                    'border-stone-200 dark:border-zinc-800 bg-stone-50 hover:bg-stone-100 dark:bg-zinc-900/40 dark:hover:bg-zinc-900 text-stone-800 dark:text-zinc-300';

                  if (submitted) {
                    if (isSelected && isCorrect) {
                      style =
                        'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300';
                    } else if (isSelected && !isCorrect) {
                      style =
                        'border-red-600 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-300';
                    } else if (isAnswerTarget) {
                      style =
                        'border-emerald-500/80 bg-emerald-50/60 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400';
                    } else {
                      style =
                        'border-stone-200 dark:border-zinc-900 bg-stone-100/50 dark:bg-zinc-950/50 text-stone-400 dark:text-zinc-600';
                    }
                  } else if (isSelected) {
                    style =
                      'border-stone-400 bg-stone-200 text-stone-900 dark:border-zinc-400 dark:bg-zinc-800 dark:text-white font-semibold';
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={submitted}
                      onClick={() => handleSelect(qIdx, optIdx)}
                      className={`w-full text-left p-3 border rounded-lg text-xs sm:text-sm font-sans flex items-center justify-between transition-colors ${style}`}
                    >
                      <span>{opt}</span>
                      {submitted && isSelected && (
                        <span className="shrink-0 ml-2">
                          {isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <div
                  className={`p-3 text-xs rounded-lg border leading-relaxed font-sans ${
                    isCorrect
                      ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300'
                      : 'border-red-200 bg-red-50/80 text-red-900 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300'
                  }`}
                >
                  <span className="font-bold font-mono mr-1">[ANALYSIS]:</span>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!submitted ? (
        <button
          type="button"
          disabled={!isComplete}
          onClick={() => setSubmitted(true)}
          className="w-full py-3.5 bg-stone-900 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-black font-bold text-xs uppercase tracking-widest disabled:opacity-40 transition-all rounded-lg shadow-sm font-ninja"
        >
          {isComplete
            ? 'Submit Final Trial Protocol'
            : `Answer All Trials (${answeredCount}/${quiz.length})`}
        </button>
      ) : (
        <div className="p-4 rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Award className="w-6 h-6 text-amber-500" />
            <div>
              <div className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider font-ninja">
                Trial Protocol Evaluated
              </div>
              <div className="text-[11px] text-stone-600 dark:text-zinc-400 font-mono">
                Score: {score} of {quiz.length} ({percentage}%)
              </div>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 border rounded font-ninja ${
                percentage >= 70
                  ? 'border-emerald-600 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'border-red-600 bg-red-100 text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-300'
              }`}
            >
              {percentage >= 70 ? 'MASTERY ACHIEVED' : 'DISCIPLINE INCOMPLETE'}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
