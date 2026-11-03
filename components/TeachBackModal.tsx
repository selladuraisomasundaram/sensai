'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { TeachBackEvaluation } from '@/types/course';
import { toast } from 'sonner';
import {
  Brain,
  Mic,
  MicOff,
  Send,
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Play,
  RotateCcw,
  Swords,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface TeachBackModalProps {
  isOpen: boolean;
  onClose: () => void;
  conceptId: string;
  conceptName: string;
  conceptSummary?: string;
  startSec?: number;
  endSec?: number;
  courseId?: string;
  videoTitle?: string;
  onEvaluationComplete?: (evalResult: TeachBackEvaluation) => void;
}

function formatSecondsToMMSS(seconds?: number): string {
  if (typeof seconds !== 'number' || isNaN(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function TeachBackModal({
  isOpen,
  onClose,
  conceptId,
  conceptName,
  conceptSummary,
  startSec = 0,
  endSec = 60,
  courseId,
  videoTitle,
  onEvaluationComplete,
}: TeachBackModalProps) {
  const [explanation, setExplanation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [evaluation, setEvaluation] = useState<TeachBackEvaluation | null>(null);

  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API for voice dictation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript.trim()) {
            setExplanation((prev) => (prev ? `${prev} ${currentTranscript}` : currentTranscript));
          }
        };

        recognition.onerror = (err: any) => {
          console.warn('Speech recognition error:', err);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setExplanation('');
      setEvaluation(null);
      setIsListening(false);
    }
  }, [isOpen, conceptId]);

  if (!isOpen) return null;

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      toast.info('Voice input is not supported in this browser. Please type your explanation.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.info('Listening... Explain the concept in your own words.');
      } catch (err) {
        console.warn('Could not start microphone:', err);
        setIsListening(false);
      }
    }
  };

  const handleEvaluate = async () => {
    if (!explanation.trim() || explanation.trim().length < 10) {
      toast.error('Please provide a more detailed explanation (minimum 10 characters).');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Check user session & stored API key
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const storedKey =
        typeof window !== 'undefined'
          ? localStorage.getItem('sensai_byok_api_key') || sessionStorage.getItem('sensai_byok_api_key')
          : '';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (storedKey) {
        headers['x-api-key'] = storedKey.trim();
      } else if (token) {
        headers['authorization'] = `Bearer ${token}`;
      } else {
        toast.error('Please arm your LLM API Key in the dashboard to enable Teach-Back evaluation.');
        setIsSubmitting(false);
        return;
      }

      if (token && storedKey) {
        headers['authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/teach-back/evaluate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          concept_id: conceptId,
          explanation: explanation.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to evaluate explanation.');
      }

      setEvaluation(data.evaluation);
      if (onEvaluationComplete) {
        onEvaluationComplete(data.evaluation);
      }
      toast.success('Feynman Teach-Back evaluated by Sensei!');
    } catch (err: any) {
      console.error('Teach-back submission error:', err);
      toast.error(err.message || 'Sensei was unable to evaluate your response.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Accent Bar */}
        <div className="h-1 bg-gradient-to-r from-red-600 via-stone-400 to-red-600 dark:from-red-600 dark:via-zinc-700 dark:to-red-600" />

        {/* Modal Header */}
        <div className="p-5 border-b border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-900/40 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-ninja tracking-widest uppercase font-bold text-red-600 dark:text-red-400 block">
                The Feynman Technique // Teach-Back Challenge
              </span>
              <h3 className="font-ninja text-base sm:text-lg font-black text-stone-900 dark:text-white">
                {conceptName}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto dojo-scrollbar space-y-5">
          {!evaluation ? (
            /* Input Phase: Typing or Speaking */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-900/30 flex items-start space-x-3 text-xs">
                <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-stone-600 dark:text-zinc-400 font-sans leading-relaxed">
                  <strong>The Feynman Rule:</strong> Explain this concept in your own words as if
                  teaching a beginner. Avoid reciting buzzwords without explaining the underlying
                  cause and effect.
                </p>
              </div>

              {conceptSummary && (
                <div className="text-[11px] font-mono text-stone-500 dark:text-zinc-500">
                  Target Concept Baseline: <span className="italic">{conceptSummary}</span>
                </div>
              )}

              {/* Textarea */}
              <div className="relative">
                <textarea
                  rows={6}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Explain how this concept works, why it matters, and what happens behind the scenes..."
                  disabled={isSubmitting}
                  className="w-full p-4 rounded-xl border border-stone-300 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-900/50 text-stone-900 dark:text-zinc-100 placeholder-stone-400 dark:placeholder-zinc-600 font-sans text-sm sm:text-base leading-relaxed focus:outline-none focus:border-red-500 transition-colors"
                />

                {/* Microphone Button */}
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`absolute right-3 bottom-3 p-2 rounded-lg border transition-all ${
                    isListening
                      ? 'bg-red-600 text-white border-red-500 animate-pulse'
                      : 'bg-white dark:bg-zinc-800 border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-300 hover:text-stone-900 dark:hover:text-white'
                  }`}
                  title={isListening ? 'Stop listening' : 'Speak your explanation'}
                >
                  {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-stone-500 dark:text-zinc-500">
                <span>{explanation.trim().split(/\s+/).filter(Boolean).length} words</span>
                {isListening && <span className="text-red-600 animate-pulse font-bold">● Recording voice...</span>}
              </div>
            </div>
          ) : (
            /* Evaluation Results Phase */
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Score Header */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50/60 dark:bg-zinc-900/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-ninja uppercase tracking-widest text-stone-500 dark:text-zinc-500 font-bold block">
                    Mastery Verdict
                  </span>
                  <h4 className="text-lg font-black font-ninja text-stone-900 dark:text-white">
                    {evaluation.mastery_verdict}
                  </h4>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-ninja uppercase tracking-widest text-stone-500 dark:text-zinc-500 font-bold block">
                    Accuracy Score
                  </span>
                  <span className="font-mono text-2xl font-bold text-red-600 dark:text-red-400">
                    {evaluation.accuracy_score}%
                  </span>
                </div>
              </div>

              {/* Strengths */}
              {evaluation.strengths.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-ninja uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>What You Nailed</span>
                  </div>
                  <ul className="space-y-1.5 font-sans text-xs sm:text-sm text-stone-700 dark:text-zinc-300">
                    {evaluation.strengths.map((str, idx) => (
                      <li key={idx} className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 flex items-start space-x-2">
                        <span className="text-emerald-600 shrink-0">✓</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Knowledge Gaps */}
              {evaluation.knowledge_gaps.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-ninja uppercase tracking-wider text-amber-700 dark:text-amber-400 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Blind Spots / Omissions</span>
                  </div>
                  <ul className="space-y-1.5 font-sans text-xs sm:text-sm text-stone-700 dark:text-zinc-300">
                    {evaluation.knowledge_gaps.map((gap, idx) => (
                      <li key={idx} className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex items-start space-x-2">
                        <span className="text-amber-600 shrink-0">!</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Simplified Analogy */}
              {evaluation.simplified_analogy && (
                <div className="p-3.5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900/50 space-y-1 text-xs">
                  <span className="font-ninja text-[10px] uppercase tracking-wider text-stone-500 font-bold block">
                    Sensei's Simplified Analogy
                  </span>
                  <p className="font-sans text-stone-800 dark:text-zinc-200 italic leading-relaxed">
                    &ldquo;{evaluation.simplified_analogy}&rdquo;
                  </p>
                </div>
              )}

              {/* Sensei Coaching Advice */}
              {evaluation.sensei_coaching && (
                <div className="p-3.5 rounded-xl border border-red-200 dark:border-red-950/50 bg-red-50/40 dark:bg-red-950/20 text-xs space-y-1">
                  <span className="font-ninja text-[10px] uppercase tracking-wider text-red-600 dark:text-red-400 font-bold block">
                    Sensei Coaching Decree
                  </span>
                  <p className="font-sans text-stone-800 dark:text-zinc-200 leading-relaxed">
                    {evaluation.sensei_coaching}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-900/40 flex items-center justify-between">
          {!evaluation ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-ninja uppercase tracking-wider text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmitting || explanation.trim().length < 10}
                onClick={handleEvaluate}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-ninja text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center space-x-2"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Evaluating...' : 'Submit to Sensei'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEvaluation(null)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 text-xs font-ninja uppercase tracking-wider text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-stone-900 hover:bg-black dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white rounded-xl font-ninja text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

