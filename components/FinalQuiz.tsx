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
    <section className="border border-zinc-800 bg-zinc-950 p-6 font-mono space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
        <div className="flex items-center space-x-2 text-red-500 text-xs font-bold uppercase tracking-widest">
          <Trophy className="w-4 h-4" />
          <span>The Final Trial</span>
        </div>
        <span className="text-[11px] text-zinc-500 uppercase tracking-widest">
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
              <div className="text-xs font-bold text-white leading-relaxed">
                <span className="text-zinc-500 mr-2">Trial {qIdx + 1}:</span>
                {q.question}
              </div>

              <div className="space-y-2">
                {q.options.map((opt, optIdx) => {
                  const isSelected = chosenIdx === optIdx;
                  const isAnswerTarget = optIdx === q.correct_answer_index;

                  let style = 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 text-zinc-300';

                  if (submitted) {
                    if (isSelected && isCorrect) {
                      style = 'border-emerald-600 bg-emerald-950/40 text-emerald-300';
                    } else if (isSelected && !isCorrect) {
                      style = 'border-red-600 bg-red-950/40 text-red-300';
                    } else if (isAnswerTarget) {
                      style = 'border-emerald-800 bg-emerald-950/20 text-emerald-400';
                    } else {
                      style = 'border-zinc-900 bg-zinc-950/50 text-zinc-600';
                    }
                  } else if (isSelected) {
                    style = 'border-zinc-400 bg-zinc-800 text-white font-semibold';
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={submitted}
                      onClick={() => handleSelect(qIdx, optIdx)}
                      className={`w-full text-left p-3 border text-xs flex items-center justify-between transition-colors ${style}`}
                    >
                      <span>{opt}</span>
                      {submitted && isSelected && (
                        <span>
                          {isCorrect ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-400" />
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <div
                  className={`p-3 text-[11px] border leading-relaxed ${
                    isCorrect
                      ? 'border-emerald-900/50 bg-emerald-950/20 text-emerald-300'
                      : 'border-red-900/50 bg-red-950/20 text-red-300'
                  }`}
                >
                  <span className="font-bold mr-1">[ANALYSIS]:</span>
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
          className="w-full py-3.5 bg-zinc-100 hover:bg-white text-black font-bold text-xs uppercase tracking-widest disabled:opacity-40 transition-all"
        >
          {isComplete
            ? 'Submit Final Trial Protocol'
            : `Answer All Trials (${answeredCount}/${quiz.length})`}
        </button>
      ) : (
        <div className="p-4 border border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Award className="w-6 h-6 text-amber-400" />
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider">
                Trial Protocol Evaluated
              </div>
              <div className="text-[11px] text-zinc-400">
                Score: {score} of {quiz.length} ({percentage}%)
              </div>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 border ${
                percentage >= 70
                  ? 'border-emerald-700 bg-emerald-950 text-emerald-300'
                  : 'border-red-700 bg-red-950 text-red-300'
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

