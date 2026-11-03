'use client';

import React, { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type {
  VideoDomain,
  ModuleRow,
  TechnicalCodingContent,
  PodcastDebateContent,
  AcademicLectureContent,
  DiyHardwareContent,
  SoftwareWalkthroughContent,
} from '@/types/course';
import { parseTimestampToSeconds } from '@/lib/timeUtils';
import QuizView from '@/components/QuizView';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import {
  BookOpen,
  Target,
  Code,
  CheckCircle,
  Clock,
  Play,
  Copy,
  Check,
  CheckSquare,
  AlertTriangle,
  Wrench,
  Layers,
  Keyboard,
  Scroll,
  ChevronLeft,
  ChevronRight,
  FileText,
  Compass,
  Sparkles,
} from 'lucide-react';

interface KnowledgeScrollProps {
  modules: ModuleRow[];
  activeModuleId: string | number | null;
  onSelectModule: (id: string | number) => void;
  domainType: VideoDomain;
  onSeek: (seconds: number) => void;
  onProgressUpdated?: (totalXp: number) => void;
}

type TabType = 'overview' | 'concepts' | 'code' | 'quiz' | 'notes';

export default function KnowledgeScroll({
  modules,
  activeModuleId,
  onSelectModule,
  domainType,
  onSeek,
  onProgressUpdated,
}: KnowledgeScrollProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);
  const [completedModules, setCompletedModules] = useState<Record<string | number, boolean>>({});
  const [isSubmittingProgress, setIsSubmittingProgress] = useState(false);

  // Initialize completed state from modules
  useEffect(() => {
    const state: Record<string | number, boolean> = {};
    modules.forEach((mod) => {
      const id = mod.id || mod.module_order;
      if (mod.is_completed) state[id] = true;
    });
    setCompletedModules(state);
  }, [modules]);

  // Find active module or default to first
  const activeIndex = Math.max(
    0,
    modules.findIndex((m) => (m.id || m.module_order) === activeModuleId)
  );
  const currentModule = modules[activeIndex] || modules[0];

  if (!currentModule) {
    return (
      <div className="border border-zinc-900 bg-zinc-950 p-8 rounded-xl text-center text-zinc-500 font-mono text-sm">
        No scroll scrolls found in this Dojo session.
      </div>
    );
  }

  const currentModuleId = currentModule.id || currentModule.module_order;
  const isCurrentCompleted = Boolean(completedModules[currentModuleId]);
  const startSeconds = parseTimestampToSeconds(currentModule.content?.start_timestamp);
  const content = currentModule.content as any;

  const handleCopyCode = (codeText: string, idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  const handleSeek = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSeek(startSeconds);
  };

  const handlePrevModule = () => {
    if (activeIndex > 0) {
      const prev = modules[activeIndex - 1];
      const prevId = prev.id || prev.module_order;
      onSelectModule(prevId);
      onSeek(parseTimestampToSeconds(prev.content?.start_timestamp));
      setActiveTab('overview');
    }
  };

  const handleNextModule = () => {
    if (activeIndex < modules.length - 1) {
      const next = modules[activeIndex + 1];
      const nextId = next.id || next.module_order;
      onSelectModule(nextId);
      onSeek(parseTimestampToSeconds(next.content?.start_timestamp));
      setActiveTab('overview');
    }
  };

  const handleQuizComplete = async (score: number, totalQuestions: number) => {
    if (isSubmittingProgress) return;
    setIsSubmittingProgress(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setCompletedModules((prev) => ({ ...prev, [currentModuleId]: true }));
        toast('Knowledge checkpoint cleared! Sign in to claim XP & record discipline.', {
          className:
            '!bg-zinc-900 !border-zinc-800 !text-amber-300 font-mono text-xs rounded-none shadow-2xl',
        });
        return;
      }

      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          module_id: currentModule.id,
          course_id: currentModule.course_id,
          quiz_score: score,
          total_questions: totalQuestions,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setCompletedModules((prev) => ({ ...prev, [currentModuleId]: true }));

        if (data.earnedXp > 0) {
          toast(`Knowledge Scroll cleared. +${data.earnedXp} XP.`, {
            description: `Discipline: ${data.totalXp} XP | Rank: ${data.rankProgress?.currentRank}`,
            className:
              '!bg-zinc-900 !border-zinc-800 !text-white font-mono text-xs rounded-none shadow-2xl',
          });

          if (onProgressUpdated) {
            onProgressUpdated(data.totalXp);
          }
        } else {
          toast('Knowledge reinforced.', {
            className:
              '!bg-zinc-900 !border-zinc-800 !text-zinc-300 font-mono text-xs rounded-none shadow-2xl',
          });
        }
      }
    } catch (err) {
      console.error('Failed to report module progression:', err);
    } finally {
      setIsSubmittingProgress(false);
    }
  };

  // Determine available tabs based on domain content
  const hasCode =
    domainType === 'technical_coding' &&
    ((content as TechnicalCodingContent).code_blocks?.length > 0 ||
      Boolean((content as TechnicalCodingContent).challenge_mission));

  const hasKeyConcepts =
    (domainType === 'podcast_debate' &&
      ((content as PodcastDebateContent).speaker_perspectives?.length > 0 ||
        (content as PodcastDebateContent).key_takeaways?.length > 0)) ||
    (domainType === 'academic_lecture' &&
      ((content as AcademicLectureContent).core_theories?.length > 0 ||
        (content as AcademicLectureContent).formulas_or_dates?.length > 0)) ||
    (domainType === 'diy_hardware' &&
      ((content as DiyHardwareContent).materials_needed?.length > 0 ||
        (content as DiyHardwareContent).safety_warnings?.length > 0)) ||
    (domainType === 'software_walkthrough' &&
      ((content as SoftwareWalkthroughContent).keyboard_shortcuts?.length > 0 ||
        (content as SoftwareWalkthroughContent).ui_navigation_steps?.length > 0));

  const hasQuiz = Array.isArray(currentModule.module_quiz) && currentModule.module_quiz.length > 0;

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Chapter Selection Ribbon (Scroll Roll Header) */}
      <div className="relative">
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 dojo-scrollbar">
          {modules.map((m, idx) => {
            const mId = m.id || m.module_order;
            const isSelected = mId === currentModuleId;
            const isDone = completedModules[mId];

            return (
              <button
                key={mId}
                type="button"
                onClick={() => {
                  onSelectModule(mId);
                  onSeek(parseTimestampToSeconds(m.content?.start_timestamp));
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-mono whitespace-nowrap transition-all rounded-md border shrink-0 ${
                  isSelected
                    ? 'border-red-600 bg-red-950/40 text-red-200 font-bold shadow-[0_0_12px_rgba(220,38,38,0.3)]'
                    : 'border-zinc-800/80 bg-zinc-950/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                <span>CH {m.module_order.toString().padStart(2, '0')}</span>
                {isDone && <CheckCircle className="w-3 h-3 text-emerald-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Knowledge Scroll Container */}
      <section className="relative border border-zinc-800/80 bg-gradient-to-b from-zinc-950 via-zinc-950/95 to-black rounded-2xl shadow-[inset_0_2px_12px_rgba(0,0,0,0.85),0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col transition-all">
        {/* Top Scroll Cap Accent Line */}
        <div className="h-1 bg-gradient-to-r from-zinc-800 via-red-600/80 to-zinc-800" />

        {/* Scroll Header: Decorative Ninja Title & Seek Action */}
        <div className="p-5 sm:p-6 border-b border-zinc-800/80 bg-zinc-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-[10px] font-mono tracking-widest uppercase text-red-500 font-bold">
                <Scroll className="w-3.5 h-3.5" />
                <span>
                  Chapter {currentModule.module_order} of {modules.length}
                </span>
                {isCurrentCompleted && (
                  <span className="inline-flex items-center space-x-1 text-emerald-400 font-mono text-[10px] bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/50">
                    <CheckCircle className="w-2.5 h-2.5" />
                    <span>Mastered</span>
                  </span>
                )}
              </div>

              {/* Decorative Ninja Header (Strictly H1/H2 font-mono) */}
              <h2 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white leading-tight">
                {currentModule.title || content?.title || `Module ${currentModule.module_order}`}
              </h2>
            </div>

            {/* Jump to Timestamp Button */}
            <button
              type="button"
              onClick={handleSeek}
              title="Seek video to chapter start"
              className="self-start sm:self-auto inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-mono rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all shadow-sm active:scale-95 shrink-0"
            >
              <Play className="w-3 h-3 fill-current text-red-500" />
              <span>
                {content?.start_timestamp || '00:00'} – {content?.end_timestamp || '00:00'}
              </span>
            </button>
          </div>

          {/* Chunking Navigation Tabs */}
          <div className="flex items-center space-x-1 mt-5 border-b border-zinc-800/60 overflow-x-auto dojo-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-mono uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-red-500 text-white font-bold bg-zinc-900/30'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-red-400" />
              <span>Overview</span>
            </button>

            {hasKeyConcepts && (
              <button
                type="button"
                onClick={() => setActiveTab('concepts')}
                className={`inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-mono uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'concepts'
                    ? 'border-red-500 text-white font-bold bg-zinc-900/30'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span>Key Concepts</span>
              </button>
            )}

            {hasCode && (
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-mono uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'code'
                    ? 'border-red-500 text-white font-bold bg-zinc-900/30'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                <Code className="w-3.5 h-3.5 text-cyan-400" />
                <span>Missions &amp; Code</span>
              </button>
            )}

            {hasQuiz && (
              <button
                type="button"
                onClick={() => setActiveTab('quiz')}
                className={`inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-mono uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'quiz'
                    ? 'border-red-500 text-white font-bold bg-zinc-900/30'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Trial Quiz</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-mono uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'notes'
                  ? 'border-red-500 text-white font-bold bg-zinc-900/30'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>Intel Notes</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body: Clean Sans-Serif Typography for Body Text */}
        <div className="dojo-scrollbar overflow-y-auto max-h-[600px] p-6 sm:p-7 space-y-6">
          {/* ======================================================== */}
          {/* TAB 1: OVERVIEW                                          */}
          {/* ======================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Main Core Narrative / Architectural Objective in High-Legibility Sans */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-500 font-bold block">
                  Core Tactical Objective
                </span>

                <div className="p-4 sm:p-5 rounded-xl border border-zinc-800/90 bg-zinc-900/50 shadow-inner">
                  <p className="font-sans text-base sm:text-lg leading-relaxed text-zinc-200 antialiased font-normal">
                    {content?.architectural_objective ||
                      content?.context ||
                      content?.real_world_application ||
                      content?.workflow_objective ||
                      (content?.step_by_step_actions && content.step_by_step_actions[0]) ||
                      'Deconstruct this lesson module by observing the code patterns, theoretical concepts, and localized challenge missions.'}
                  </p>
                </div>
              </div>

              {/* Quick Summary Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-lg border border-zinc-800/80 bg-zinc-900/30 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                    Execution Window
                  </span>
                  <div className="font-mono text-sm font-semibold text-zinc-300">
                    {content?.start_timestamp || '00:00'} to {content?.end_timestamp || '00:00'}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-zinc-800/80 bg-zinc-900/30 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                    Discipline Pillar
                  </span>
                  <div className="font-mono text-sm font-semibold text-red-400 capitalize">
                    {domainType.replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* Teaser CTA to explore concepts or code */}
              <div className="pt-2 flex items-center justify-between text-xs font-mono text-zinc-500">
                <span>Select tabs above for detailed code and quizzes</span>
                <button
                  type="button"
                  onClick={() => setActiveTab(hasKeyConcepts ? 'concepts' : hasCode ? 'code' : 'quiz')}
                  className="text-red-400 hover:text-red-300 underline underline-offset-4 flex items-center space-x-1"
                >
                  <span>Explore Concepts</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: KEY CONCEPTS                                      */}
          {/* ======================================================== */}
          {activeTab === 'concepts' && (
            <div className="space-y-6">
              {/* Technical / Academic / Podcast / DIY / Software specifics */}
              {domainType === 'academic_lecture' && (
                <div className="space-y-4">
                  {content.core_theories?.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold block">
                        Theoretical Foundations
                      </span>
                      <ul className="space-y-2.5">
                        {content.core_theories.map((theory: string, idx: number) => (
                          <li
                            key={idx}
                            className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 font-sans text-base leading-relaxed text-zinc-200"
                          >
                            <strong className="font-mono text-xs text-red-400 mr-2 uppercase tracking-wider block sm:inline">
                              Theory {idx + 1}:
                            </strong>
                            {theory}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {content.formulas_or_dates?.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold block">
                        Formulas, Theorems &amp; Empirical Dates
                      </span>
                      <div className="p-4 rounded-xl border border-zinc-800 bg-black font-mono text-xs text-amber-300 space-y-1.5">
                        {content.formulas_or_dates.map((f: string, idx: number) => (
                          <div key={idx} className="leading-relaxed">
                            &bull; {f}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {domainType === 'podcast_debate' && (
                <div className="space-y-4">
                  {content.speaker_perspectives?.map((sp: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 sm:p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-2"
                    >
                      <div className="font-mono text-xs font-bold text-red-400 uppercase tracking-wider">
                        {sp.speaker || `Speaker ${idx + 1}`}
                      </div>
                      <p className="font-sans text-base leading-relaxed text-zinc-200">
                        {sp.perspective}
                      </p>
                    </div>
                  ))}

                  {content.key_takeaways?.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold block">
                        Key Dialectic Takeaways
                      </span>
                      <ul className="space-y-2">
                        {content.key_takeaways.map((takeaway: string, idx: number) => (
                          <li
                            key={idx}
                            className="p-3.5 rounded-lg border border-zinc-800/70 bg-zinc-900/30 font-sans text-sm sm:text-base leading-relaxed text-zinc-300 flex items-start space-x-2.5"
                          >
                            <span className="text-red-500 font-mono text-xs mt-0.5">&bull;</span>
                            <span>{takeaway}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {domainType === 'diy_hardware' && (
                <div className="space-y-4">
                  {content.materials_needed?.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold block">
                        Required Components &amp; Tools
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {content.materials_needed.map((mat: string, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg border border-zinc-800/80 bg-zinc-900/40 font-mono text-xs text-zinc-300 flex items-center space-x-2"
                          >
                            <Wrench className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span>{mat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {content.safety_warnings?.length > 0 && (
                    <div className="p-4 rounded-xl border border-amber-900/60 bg-amber-950/20 text-amber-200 space-y-2">
                      <div className="flex items-center space-x-2 font-mono text-xs font-bold uppercase tracking-wider text-amber-400">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Safety Hazard Protocols</span>
                      </div>
                      <ul className="space-y-1 font-sans text-sm leading-relaxed text-amber-100/90 list-disc list-inside">
                        {content.safety_warnings.map((warn: string, idx: number) => (
                          <li key={idx}>{warn}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {domainType === 'software_walkthrough' && (
                <div className="space-y-4">
                  {content.keyboard_shortcuts?.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold block">
                        Tactical Keyboard Shortcuts
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {content.keyboard_shortcuts.map((sc: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/50 flex items-center justify-between"
                          >
                            <span className="font-sans text-xs text-zinc-300">{sc.action}</span>
                            <kbd className="px-2 py-1 bg-black border border-zinc-700 font-mono text-xs text-amber-300 rounded shadow-sm">
                              {sc.key}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {content.ui_navigation_steps?.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold block">
                        Navigation Workflow Path
                      </span>
                      <ol className="space-y-2">
                        {content.ui_navigation_steps.map((step: string, idx: number) => (
                          <li
                            key={idx}
                            className="p-3 rounded-lg border border-zinc-800/80 bg-zinc-900/30 font-sans text-sm sm:text-base leading-relaxed text-zinc-200 flex items-start space-x-3"
                          >
                            <span className="font-mono text-xs font-bold text-red-500 bg-black px-1.5 py-0.5 rounded border border-zinc-800">
                              {idx + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {/* Fallback generic overview if not specific */}
              {!hasKeyConcepts && (
                <div className="p-6 text-center text-zinc-500 font-mono text-xs">
                  All foundational concepts for this chapter are summarized in the Overview tab.
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: MISSIONS & CODE                                   */}
          {/* ======================================================== */}
          {activeTab === 'code' && (
            <div className="space-y-6">
              {/* Code blocks with Syntax Highlighter */}
              {content.code_blocks?.map((cb: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-xl border border-zinc-800 bg-black overflow-hidden shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-zinc-900/90 px-4 py-2 border-b border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-400">
                    <div className="flex items-center space-x-2">
                      <Code className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="font-semibold text-zinc-300">
                        {cb.filename || `${cb.language || 'code'}-snippet-${idx + 1}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleCopyCode(cb.code, idx, e)}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-[11px] font-mono rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-colors"
                    >
                      {copiedCodeIdx === idx ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">COPIED</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>COPY CODE</span>
                        </>
                      )}
                    </button>
                  </div>

                  <SyntaxHighlighter
                    language={cb.language || 'typescript'}
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      padding: '16px',
                      background: 'transparent',
                      fontSize: '12px',
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      lineHeight: '1.6',
                    }}
                  >
                    {cb.code}
                  </SyntaxHighlighter>
                </div>
              ))}

              {/* Challenge Mission in local IDE */}
              {content.challenge_mission && (
                <div className="p-5 rounded-xl border border-red-900/60 bg-red-950/20 text-red-200 space-y-2 shadow-inner">
                  <div className="flex items-center space-x-2 font-mono text-xs font-bold uppercase tracking-wider text-red-400">
                    <CheckSquare className="w-4 h-4" />
                    <span>Local IDE Mission Challenge</span>
                  </div>
                  <p className="font-sans text-base sm:text-lg leading-relaxed text-zinc-100 antialiased">
                    {content.challenge_mission}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: TRIAL QUIZ                                        */}
          {/* ======================================================== */}
          {activeTab === 'quiz' && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-zinc-800 flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-zinc-400 font-bold">
                  Chapter Knowledge Trial
                </span>
                <span className="font-mono text-[11px] text-emerald-400">
                  Earn +10 to +50 XP upon completion
                </span>
              </div>

              {hasQuiz ? (
                <QuizView
                  quiz={currentModule.module_quiz}
                  title="Diagnostic Checkpoint Trial"
                  isCollapsible={false}
                  onComplete={handleQuizComplete}
                />
              ) : (
                <div className="p-8 text-center text-zinc-500 font-mono text-xs">
                  No checkpoint questions registered for this chapter.
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: INTEL NOTES / TRANSCRIPT                          */}
          {/* ======================================================== */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <span className="font-mono text-xs uppercase tracking-widest text-zinc-400 font-bold block">
                Chapter Intel &amp; Source Timing
              </span>

              <div className="p-4 sm:p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3 font-mono text-xs text-zinc-300">
                <div className="flex items-center justify-between text-zinc-400 pb-2 border-b border-zinc-800">
                  <span>Start Timestamp:</span>
                  <span className="text-white font-bold">{content?.start_timestamp || '00:00'}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400 pb-2 border-b border-zinc-800">
                  <span>End Timestamp:</span>
                  <span className="text-white font-bold">{content?.end_timestamp || '00:00'}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Chapter Index:</span>
                  <span className="text-red-400 font-bold">
                    {currentModule.module_order} of {modules.length}
                  </span>
                </div>
              </div>

              <p className="font-sans text-sm text-zinc-400 leading-relaxed italic">
                Tip: Click any timestamp in the header or chapter list to seek the video player
                directly to the start of this section.
              </p>
            </div>
          )}
        </div>

        {/* Scroll Footer Navigation (Next / Previous Chapter Roll) */}
        <div className="p-4 sm:p-5 border-t border-zinc-800/80 bg-zinc-900/50 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrevModule}
            disabled={activeIndex === 0}
            className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-mono rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 disabled:hover:bg-zinc-900 transition-all active:scale-95"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Previous Chapter</span>
            <span className="sm:hidden">Prev</span>
          </button>

          <span className="text-[11px] font-mono text-zinc-500">
            {activeIndex + 1} / {modules.length} Chapters
          </span>

          <button
            type="button"
            onClick={handleNextModule}
            disabled={activeIndex === modules.length - 1}
            className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-mono rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 disabled:hover:bg-zinc-900 transition-all active:scale-95"
          >
            <span className="hidden sm:inline">Next Chapter</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom Scroll Cap Accent Line */}
        <div className="h-1 bg-gradient-to-r from-zinc-800 via-red-600/80 to-zinc-800" />
      </section>
    </div>
  );
}

