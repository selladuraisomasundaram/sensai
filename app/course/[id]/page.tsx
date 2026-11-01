'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { CourseRow, ModuleRow, VideoDomain } from '@/types/course';
import type { UserProfile } from '@/lib/streak';
import { parseTimestampToSeconds, formatSecondsToTimestamp } from '@/lib/timeUtils';
import YouTubePlayer from '@/components/YouTubePlayer';
import ModuleCard from '@/components/ModuleCard';
import FinalQuiz from '@/components/FinalQuiz';
import ProfileWidget from '@/components/ProfileWidget';
import StealthSkeleton from '@/components/StealthSkeleton';
import FeedbackModal from '@/components/FeedbackModal';
import ThemeToggle from '@/components/ThemeToggle';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { Toaster } from 'sonner';
import { ArrowLeft, Clock, ShieldCheck, Flame, ExternalLink, AlertOctagon } from 'lucide-react';
import type { YouTubePlayer as YTPlayerInstance } from 'react-youtube';

function extractVideoId(url: string): string {
  const match = url?.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : '';
}

function ModuleErrorFallback({ error }: FallbackProps) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="p-4 border border-red-900/60 bg-red-950/20 text-red-300 font-mono text-xs space-y-1">
      <div className="flex items-center space-x-2 font-bold uppercase tracking-wider text-red-400">
        <AlertOctagon className="w-3.5 h-3.5" />
        <span>Module Structural Render Exception</span>
      </div>
      <p className="text-[11px] text-zinc-400">{message || 'Malformed schema segment bypassed.'}</p>
    </div>
  );
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = (params?.id as string) || '';

  const [course, setCourse] = useState<CourseRow | null>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentTime, setCurrentTime] = useState(0);
  const [activeModuleId, setActiveModuleId] = useState<string | number | null>(null);
  const playerInstanceRef = useRef<YTPlayerInstance | null>(null);

  // Fetch course data, user profile, and modules with RLS verification
  useEffect(() => {
    let mounted = true;

    async function loadCourseData() {
      if (!courseId) return;

      try {
        setLoading(true);

        // 1. Check current session (Optional for viewing)
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          setUserEmail(session.user.email || '');

          // 2. Fetch User Profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (mounted && profileData) {
            setUserProfile(profileData as UserProfile);
          }
        }

        // 3. Fetch Course
        const { data: courseData, error: courseErr } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();

        if (courseErr || !courseData) {
          throw new Error(courseErr?.message || 'Access Denied: Course not found or unauthorized.');
        }

        // 4. Fetch Modules ordered chronologically
        const { data: moduleData, error: moduleErr } = await supabase
          .from('modules')
          .select('*')
          .eq('course_id', courseId)
          .order('module_order', { ascending: true });

        if (moduleErr) {
          throw new Error(moduleErr.message);
        }

        if (mounted) {
          const normalizedModules: ModuleRow[] = ((moduleData as any[]) || []).map((m) => ({
            ...m,
            title: m.title || m.content?.title || `Module ${m.module_order}`,
          }));
          setCourse(courseData as CourseRow);
          setModules(normalizedModules);
          if (normalizedModules.length > 0) {
            setActiveModuleId(normalizedModules[0].id || normalizedModules[0].module_order);
          }
        }
      } catch (err: any) {
        console.error('Failed to load course:', err);
        if (mounted) {
          setError(err.message || 'Failed to retrieve course data.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadCourseData();

    return () => {
      mounted = false;
    };
  }, [courseId, router]);

  // Synchronize active module based on player currentTime
  useEffect(() => {
    if (modules.length === 0) return;

    let matchingModule = modules.find((mod) => {
      const start = parseTimestampToSeconds(mod.content?.start_timestamp);
      const end = parseTimestampToSeconds(mod.content?.end_timestamp);
      return currentTime >= start && (end > start ? currentTime <= end : true);
    });

    if (!matchingModule) {
      const pastModules = modules.filter(
        (mod) => parseTimestampToSeconds(mod.content?.start_timestamp) <= currentTime
      );
      if (pastModules.length > 0) {
        matchingModule = pastModules[pastModules.length - 1];
      }
    }

    if (matchingModule) {
      const id = matchingModule.id || matchingModule.module_order;
      setActiveModuleId(id);
    }
  }, [currentTime, modules]);

  const handleSeek = (seconds: number) => {
    if (playerInstanceRef.current && typeof playerInstanceRef.current.seekTo === 'function') {
      playerInstanceRef.current.seekTo(seconds, true);
      setCurrentTime(seconds);
    }
  };

  const handleProgressUpdated = (newTotalXp: number) => {
    setUserProfile((prev) => (prev ? { ...prev, total_xp: newTotalXp } : null));
  };

  // Stealth Skeleton Loading State
  if (loading) {
    return (
      <main className="min-h-screen bg-black text-zinc-400 font-mono p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-10 bg-zinc-950 border border-zinc-900 flex items-center px-4">
            <span className="text-xs uppercase tracking-widest text-zinc-500 animate-pulse">
              Synchronizing Training Grounds &amp; Fetching Ledger...
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="aspect-video bg-zinc-950 border border-zinc-900 animate-pulse" />
            <div className="space-y-4">
              <StealthSkeleton count={3} />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !course) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center font-mono text-zinc-400 p-6">
        <div className="max-w-md w-full border border-red-900/60 bg-zinc-950 p-6 space-y-4">
          <div className="text-red-400 text-xs font-bold uppercase tracking-wider">
            [ACCESS PROTOCOL ERROR]
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">{error || 'Course inaccessible.'}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 bg-zinc-900 border border-zinc-800 text-white text-xs uppercase tracking-wider hover:bg-zinc-800"
          >
            Return to Command Center
          </button>
        </div>
      </main>
    );
  }

  const videoId = extractVideoId(course.youtube_url);
  const domainType = (course.domain_type as VideoDomain) || 'technical_coding';

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-mono">
      <Toaster theme="dark" position="bottom-right" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <button
            onClick={() => router.push('/')}
            title="Return to Main Workspace"
            className="p-1.5 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="truncate">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">
              SENSAI TRAINING GROUNDS
            </span>
            <h1 className="text-xs sm:text-sm font-bold text-white truncate max-w-sm sm:max-w-md">
              {course.video_title}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs shrink-0">
          <ThemeToggle />
          <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest bg-zinc-900 border border-zinc-800 px-2 py-1 text-zinc-400">
            {domainType}
          </span>
          <div className="flex items-center space-x-1.5 bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-[11px] text-zinc-300">
            <Clock className="w-3 h-3 text-zinc-400" />
            <span>{formatSecondsToTimestamp(currentTime)}</span>
          </div>
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Left Column (Desktop Sticky): Embedded Player, Profile, Metadata */}
          <div className="w-full lg:w-5/12 xl:w-1/2 lg:sticky lg:top-20 space-y-4">
            <YouTubePlayer
              videoId={videoId}
              onTimeUpdate={(time) => setCurrentTime(time)}
              onReadyInstance={(player) => {
                playerInstanceRef.current = player;
              }}
            />

            {/* Discipline Progression Widget */}
            <ProfileWidget
              totalXp={userProfile?.total_xp ?? 0}
              streak={userProfile?.current_streak ?? 0}
              email={userEmail}
            />

            {/* Video Tactical Meta Card */}
            <div className="border border-zinc-900 bg-zinc-950 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Target Intel</span>
                <a
                  href={course.youtube_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1 text-[11px] text-zinc-400 hover:text-white"
                >
                  <span>Source URL</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="text-xs text-zinc-300 leading-relaxed font-semibold">
                {course.video_title}
              </div>

              <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-500">
                <div className="flex items-center space-x-1.5 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>RLS Verified ({modules.length} Modules)</span>
                </div>
                <div className="flex items-center space-x-1 text-zinc-400">
                  <Flame className="w-3 h-3 text-amber-500" />
                  <span>Interactive Sync</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Scrollable Modules & Final Trial Quiz */}
          <div className="w-full lg:w-7/12 xl:w-1/2 space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Curriculum Decomposition ({modules.length} Lessons)
              </span>
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest">
                Click module or code to seek video
              </span>
            </div>

            {/* Modules List Wrapped in React Error Boundaries */}
            <div className="space-y-4">
              {modules.map((mod) => {
                const id = mod.id || mod.module_order;
                const isActive = activeModuleId === id;

                return (
                  <ErrorBoundary key={id} fallbackRender={ModuleErrorFallback}>
                    <ModuleCard
                      module={mod}
                      domainType={domainType}
                      isActive={isActive}
                      onSeek={handleSeek}
                      onProgressUpdated={handleProgressUpdated}
                    />
                  </ErrorBoundary>
                );
              })}
            </div>

            {/* Final Trial Examination Block */}
            {course.final_quiz && course.final_quiz.length > 0 && (
              <div className="pt-6">
                <FinalQuiz quiz={course.final_quiz} courseId={course.id} />
              </div>
            )}
          </div>

        </div>
      </main>
      <FeedbackModal initialEmail={userEmail} />
    </div>
  );
}
