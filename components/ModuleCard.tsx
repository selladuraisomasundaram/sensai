'use client';

import React, { useState } from 'react';
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
  Play,
  Code,
  CheckSquare,
  MessageSquare,
  BookOpen,
  Copy,
  Check,
  Target,
  Compass,
  CheckCircle,
  AlertTriangle,
  Wrench,
  Layers,
  Keyboard,
  Cpu,
  BookmarkCheck,
} from 'lucide-react';

interface ModuleCardProps {
  module: ModuleRow;
  domainType: VideoDomain;
  isActive: boolean;
  onSeek: (seconds: number) => void;
  onProgressUpdated?: (totalXp: number) => void;
}

export default function ModuleCard({
  module,
  domainType,
  isActive,
  onSeek,
  onProgressUpdated,
}: ModuleCardProps) {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(Boolean(module.is_completed));
  const [isSubmittingProgress, setIsSubmittingProgress] = useState(false);

  const startSeconds = parseTimestampToSeconds(module.content?.start_timestamp);

  const handleCopyCode = (code: string, idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  const handleSeekStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSeek(startSeconds);
  };

  const handleQuizComplete = async (score: number, totalQuestions: number) => {
    if (isSubmittingProgress) return;
    setIsSubmittingProgress(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setIsCompleted(true);
        toast('Knowledge checkpoint cleared! Sign in to claim XP & record discipline.', {
          className: '!bg-zinc-900 !border-zinc-800 !text-amber-300 font-mono text-xs rounded-none shadow-2xl',
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
          module_id: module.id,
          course_id: module.course_id,
          quiz_score: score,
          total_questions: totalQuestions,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsCompleted(true);

        if (data.earnedXp > 0) {
          toast(`Module cleared. +${data.earnedXp} XP.`, {
            description: `Total Discipline: ${data.totalXp} XP | Rank: ${data.rankProgress?.currentRank}`,
            className:
              '!bg-zinc-900 !border-zinc-800 !text-white font-mono text-xs rounded-none shadow-2xl',
          });

          if (onProgressUpdated) {
            onProgressUpdated(data.totalXp);
          }
        } else {
          toast('Module cleared. Knowledge reinforced.', {
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

  return (
    <article
      id={`module-${module.id || module.module_order}`}
      onClick={() => onSeek(startSeconds)}
      className={`border font-mono transition-all duration-200 cursor-pointer ${
        isActive
          ? 'border-zinc-700 border-l-4 border-l-red-600 bg-gradient-to-r from-red-950/20 via-zinc-950 to-zinc-950 shadow-lg'
          : 'border-zinc-900 bg-zinc-950/90 hover:border-zinc-800'
      }`}
    >
      {/* Module Header Bar */}
      <div className="p-4 sm:p-5 border-b border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          <span className="text-[10px] tracking-widest font-black uppercase text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5">
            CH {module.module_order.toString().padStart(2, '0')}
          </span>
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center space-x-2">
            <span>{module.title || (module.content as any)?.title || `Module ${module.module_order}`}</span>
            {isCompleted && (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 inline-block shrink-0" />
            )}
          </h3>
        </div>

        {/* Timestamp Sync Pill */}
        <button
          type="button"
          onClick={handleSeekStart}
          title="Jump video to timestamp"
          className={`self-start sm:self-auto flex items-center space-x-1.5 px-2.5 py-1 text-[11px] rounded-none border transition-colors ${
            isActive
              ? 'border-red-600/80 bg-red-950/40 text-red-300 font-bold'
              : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          <Play className="w-3 h-3 fill-current" />
          <span>
            {module.content?.start_timestamp || '00:00'} - {module.content?.end_timestamp || '00:00'}
          </span>
        </button>
      </div>

      {/* Polymorphic Content Body */}
      <div className="p-4 sm:p-5 space-y-5 text-xs text-zinc-300">
        
        {/* ======================================================== */}
        {/* 1. TECHNICAL CODING PILLAR                                */}
        {/* ======================================================== */}
        {domainType === 'technical_coding' && (
          <div className="space-y-4">
            {(module.content as TechnicalCodingContent).architectural_objective && (
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                  <Target className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Architectural Objective</span>
                </div>
                <p className="text-zinc-300 leading-relaxed bg-zinc-900/50 p-3 border border-zinc-800/80">
                  {(module.content as TechnicalCodingContent).architectural_objective}
                </p>
              </div>
            )}

            {(module.content as TechnicalCodingContent).code_blocks?.map((cb, idx) => (
              <div
                key={idx}
                className="border border-zinc-800 bg-black overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-zinc-900/90 px-3 py-1.5 border-b border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
                  <div className="flex items-center space-x-2">
                    <Code className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="font-semibold text-zinc-300">
                      {cb.filename || `${cb.language || 'code'}-snippet-${idx + 1}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleCopyCode(cb.code, idx, e)}
                    className="flex items-center space-x-1 text-[10px] hover:text-white transition-colors"
                  >
                    {copiedCodeIdx === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>COPY</span>
                      </>
                    )}
                  </button>
                </div>
                <SyntaxHighlighter
                  language={cb.language || 'typescript'}
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    padding: '12px',
                    background: 'transparent',
                    fontSize: '11px',
                    fontFamily: 'inherit',
                    lineHeight: '1.5',
                  }}
                >
                  {cb.code}
                </SyntaxHighlighter>
              </div>
            ))}

            {(module.content as TechnicalCodingContent).challenge_mission && (
              <div className="p-3.5 border border-red-900/60 bg-red-950/20 text-red-200 space-y-1.5">
                <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest text-red-400 font-bold">
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Local IDE Mission Challenge</span>
                </div>
                <p className="leading-relaxed text-zinc-200">
                  {(module.content as TechnicalCodingContent).challenge_mission}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. PODCAST / DEBATE PILLAR                                */}
        {/* ======================================================== */}
        {domainType === 'podcast_debate' && (
          <div className="space-y-4">
            {(module.content as PodcastDebateContent).context && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                  Discourse Background
                </div>
                <p className="text-zinc-300 leading-relaxed bg-zinc-900/50 p-3 border border-zinc-800/80">
                  {(module.content as PodcastDebateContent).context}
                </p>
              </div>
            )}

            {(module.content as PodcastDebateContent).speaker_perspectives && (
              <div className="space-y-2.5">
                <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Dialectic Perspectives</span>
                </div>
                <div className="space-y-2">
                  {(module.content as PodcastDebateContent).speaker_perspectives.map((sp, idx) => (
                    <div
                      key={idx}
                      className="p-3 border-l-2 border-zinc-700 bg-zinc-900/40 border-r border-t border-b border-zinc-900"
                    >
                      <div className="text-[11px] font-bold text-white mb-1 uppercase tracking-wider">
                        {sp.speaker}
                      </div>
                      <p className="text-zinc-300 leading-relaxed">{sp.perspective}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(module.content as PodcastDebateContent).key_takeaways && (
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                  Key Takeaways
                </div>
                <ul className="space-y-1.5 pl-4 list-disc text-zinc-300">
                  {(module.content as PodcastDebateContent).key_takeaways.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. ACADEMIC LECTURE PILLAR                                */}
        {/* ======================================================== */}
        {domainType === 'academic_lecture' && (
          <div className="space-y-4">
            {/* Core Theories */}
            {(module.content as AcademicLectureContent).core_theories && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                  <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Core Pedagogical Theories</span>
                </div>
                <ul className="space-y-1.5 pl-4 list-disc text-zinc-200">
                  {(module.content as AcademicLectureContent).core_theories.map((theory, idx) => (
                    <li key={idx} className="leading-relaxed">{theory}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Formulas or Milestone Dates */}
            {(module.content as AcademicLectureContent).formulas_or_dates && (
              <div className="space-y-2 bg-zinc-900/60 p-3.5 border border-zinc-800">
                <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                  <BookmarkCheck className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Formulations, Equations &amp; Historical Milestones</span>
                </div>
                <div className="space-y-1.5">
                  {(module.content as AcademicLectureContent).formulas_or_dates.map((item, idx) => (
                    <div key={idx} className="font-mono text-zinc-100 bg-black/50 p-2 border border-zinc-800/80">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Real World Application */}
            {(module.content as AcademicLectureContent).real_world_application && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                  Empirical &amp; Practical Application
                </div>
                <p className="p-3 bg-zinc-900/40 border border-zinc-800 text-zinc-300 leading-relaxed">
                  {(module.content as AcademicLectureContent).real_world_application}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. DIY HARDWARE PILLAR                                    */}
        {/* ======================================================== */}
        {domainType === 'diy_hardware' && (
          <div className="space-y-4">
            {/* Safety Hazard Warning (Yellow/Amber Hazard Box) */}
            {(module.content as DiyHardwareContent).safety_warnings &&
              (module.content as DiyHardwareContent).safety_warnings.length > 0 && (
                <div className="p-3.5 border-2 border-amber-500/80 bg-amber-950/20 text-amber-200 space-y-1.5">
                  <div className="flex items-center space-x-2 text-[11px] uppercase tracking-widest text-amber-400 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>Hazard &amp; Safety Protocol</span>
                  </div>
                  <ul className="space-y-1 pl-4 list-disc text-xs text-amber-200/90">
                    {(module.content as DiyHardwareContent).safety_warnings.map((warn, idx) => (
                      <li key={idx}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Materials & Components Required */}
            {(module.content as DiyHardwareContent).materials_needed && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                  <Cpu className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Components &amp; Materials</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {(module.content as DiyHardwareContent).materials_needed.map((mat, idx) => (
                    <div key={idx} className="bg-zinc-900/60 p-2 border border-zinc-800/80 text-[11px] text-zinc-300">
                      • {mat}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step-by-Step Physical Build Actions */}
            {(module.content as DiyHardwareContent).step_by_step_actions && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                  <Wrench className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Physical Execution Actions</span>
                </div>
                <ol className="space-y-1.5 pl-4 list-decimal text-zinc-200">
                  {(module.content as DiyHardwareContent).step_by_step_actions.map((act, idx) => (
                    <li key={idx} className="leading-relaxed">{act}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Troubleshooting Diagnosis */}
            {(module.content as DiyHardwareContent).troubleshooting &&
              (module.content as DiyHardwareContent).troubleshooting.length > 0 && (
                <div className="p-3 border border-zinc-800 bg-zinc-900/50 space-y-1.5">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                    Troubleshooting &amp; Calibration Defect Fixes
                  </div>
                  <ul className="space-y-1 pl-4 list-disc text-zinc-300">
                    {(module.content as DiyHardwareContent).troubleshooting.map((fix, idx) => (
                      <li key={idx}>{fix}</li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 5. SOFTWARE WALKTHROUGH PILLAR (Figma, Notion, Excel...) */}
        {/* ======================================================== */}
        {domainType === 'software_walkthrough' && (
          <div className="space-y-4">
            {/* Workflow End Goal */}
            {(module.content as SoftwareWalkthroughContent).workflow_objective && (
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                  <Target className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Workflow Objective</span>
                </div>
                <p className="p-3 bg-zinc-900/50 border border-zinc-800 text-zinc-200 leading-relaxed">
                  {(module.content as SoftwareWalkthroughContent).workflow_objective}
                </p>
              </div>
            )}

            {/* UI Navigation Steps */}
            {(module.content as SoftwareWalkthroughContent).ui_navigation_steps && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                  <Layers className="w-3.5 h-3.5 text-zinc-400" />
                  <span>UI Navigation Route</span>
                </div>
                <ol className="space-y-1.5 pl-4 list-decimal text-zinc-200">
                  {(module.content as SoftwareWalkthroughContent).ui_navigation_steps.map((step, idx) => (
                    <li key={idx} className="leading-relaxed">{step}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Keyboard Shortcuts (Dark Monospace Blocks with Key Badges) */}
            {(module.content as SoftwareWalkthroughContent).keyboard_shortcuts &&
              (module.content as SoftwareWalkthroughContent).keyboard_shortcuts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                    <Keyboard className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Tactical Keyboard Shortcuts</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(module.content as SoftwareWalkthroughContent).keyboard_shortcuts.map((sc, idx) => (
                      <div
                        key={idx}
                        className="bg-black/70 border border-zinc-800 p-2.5 flex items-center justify-between text-xs"
                      >
                        <span className="text-zinc-400">{sc.action}</span>
                        <kbd className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono text-[11px] shadow-sm">
                          {sc.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Module-Level Knowledge Check Quiz with Progression Hook */}
        {module.module_quiz && module.module_quiz.length > 0 && (
          <div onClick={(e) => e.stopPropagation()}>
            <QuizView
              quiz={module.module_quiz}
              title="Module Checkpoint Trial"
              onComplete={handleQuizComplete}
            />
          </div>
        )}

      </div>
    </article>
  );
}
