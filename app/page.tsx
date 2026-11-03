'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import ApiKeyManager from '@/components/ApiKeyManager';
import ProfileWidget from '@/components/ProfileWidget';
import StealthSkeleton from '@/components/StealthSkeleton';
import FeedbackModal from '@/components/FeedbackModal';
import ThemeToggle from '@/components/ThemeToggle';
import AuthModal from '@/components/AuthModal';
import { supabase } from '@/lib/supabaseClient';
import { calculateAndUpdateStreak, type UserProfile } from '@/lib/streak';
import { Toaster, toast } from 'sonner';
import {
  Flame,
  Shield,
  Zap,
  LogOut,
  Terminal,
  CheckCircle2,
  ArrowRight,
  Swords,
  Brain,
  ListVideo,
  Layers,
  LogIn,
  UserCheck,
} from 'lucide-react';

interface GenerationResult {
  courseId: string;
  videoId: string;
  videoTitle: string;
  domainType: string;
  status: string;
  transcriptWordCount?: number;
  intervalCount?: number;
  moduleCount?: number;
  finalQuizQuestionCount?: number;
  isPlaylist?: boolean;
}

export default function SensaiDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [playlistProgress, setPlaylistProgress] = useState<{
    current: number;
    total: number;
    currentTitle: string;
  } | null>(null);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);

  // Synchronize authentication session and streak metrics
  useEffect(() => {
    let mounted = true;

    const syncSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        const updatedProfile = await calculateAndUpdateStreak(supabase, session.user.id);
        if (mounted && updatedProfile) {
          setProfile(updatedProfile);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setAuthLoading(false);
    };

    syncSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            const updatedProfile = await calculateAndUpdateStreak(supabase, session.user.id);
            if (mounted && updatedProfile) {
              setProfile(updatedProfile);
            }
          }
        } else {
          setUser(null);
          setProfile(null);
        }
        setAuthLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    toast('Session terminated.', {
      className: '!bg-zinc-900 !border-zinc-800 !text-zinc-300 font-mono text-xs rounded-none',
    });
  };

  const executeGeneration = async () => {
    setError('');
    setGenerationResult(null);
    setPlaylistProgress(null);

    // 1. Zero-Trust BYOK Check
    const apiKey = localStorage.getItem('llm_api_key');
    if (!apiKey) {
      setError('Discipline requires preparation: Arm your LLM API key in the vault below first.');
      return;
    }

    const trimmedUrl = url.trim();
    const isPlaylist = /[?&]list=([a-zA-Z0-9_-]+)/.test(trimmedUrl);
    const youtubeRegex = /^(https?:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+$/;

    if (!youtubeRegex.test(trimmedUrl)) {
      setError('Invalid coordinates: Provide a legitimate YouTube URL or Playlist.');
      return;
    }

    setLoading(true);

    // ========================================================
    // BRANCH A: PLAYLIST ASYNCHRONOUS MEGA-COURSE QUEUE
    // ========================================================
    if (isPlaylist) {
      setStatusMessage('Infiltrating YouTube Playlist catalog...');

      try {
        const playlistRes = await fetch('/api/playlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: trimmedUrl }),
        });

        const playlistData = await playlistRes.json();
        if (!playlistRes.ok || !playlistData.videos || playlistData.videos.length === 0) {
          throw new Error(playlistData.error || 'Failed to extract playlist video items.');
        }

        const totalVideos = playlistData.videos.length;

        // Step 1: Create Parent Mega-Course record (supports guest if unauthenticated)
        const { data: parentCourse, error: parentErr } = await supabase
          .from('courses')
          .insert([
            {
              user_id: user?.id || null,
              youtube_url: trimmedUrl,
              video_title: `Mega-Course: ${playlistData.playlistTitle}`,
              domain_type: 'technical_coding',
              status: 'processing',
            },
          ])
          .select()
          .single();

        if (parentErr) throw parentErr;

        let totalExtractedModules = 0;
        let detectedDomain = 'technical_coding';

        // Step 2: Client-Side Sequential Fetching Loop (Zero-Timeout Risk)
        for (let i = 0; i < totalVideos; i++) {
          const video = playlistData.videos[i];
          setPlaylistProgress({
            current: i + 1,
            total: totalVideos,
            currentTitle: video.title,
          });
          setStatusMessage(`Extracting Playlist Target [${i + 1}/${totalVideos}]: ${video.title}`);

          try {
            const ingestRes = await fetch('/api/ingest', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey.trim()}`,
              },
              body: JSON.stringify({
                url: video.url,
                courseId: parentCourse.id,
              }),
            });

            const ingestData = await ingestRes.json();

            if (!ingestRes.ok) {
              toast.error(`Target bypassed: Unable to access "${video.title}"`, {
                className:
                  '!bg-zinc-900 !border-red-900/60 !text-red-300 font-mono text-xs rounded-none',
              });
              continue;
            }

            if (ingestData.isSynthesized) {
              toast.info(`Captions disabled for "${video.title}": Extracted via Deep Synthesis`, {
                className:
                  '!bg-zinc-900 !border-amber-900/60 !text-amber-300 font-mono text-xs rounded-none',
              });
            }

            if (i === 0) detectedDomain = ingestData.domainType;

            const generateRes = await fetch('/api/generate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey.trim()}`,
              },
              body: JSON.stringify({
                course_id: parentCourse.id,
                domain_type: ingestData.domainType,
                transcript: ingestData.transcript,
                append_mode: true,
              }),
            });

            const generateData = await generateRes.json();
            if (generateRes.ok) {
              totalExtractedModules += generateData.moduleCount || 0;
            }
          } catch (itemErr) {
            console.warn(`Skipping playlist target ${video.id} due to extraction error:`, itemErr);
          }
        }

        await supabase
          .from('courses')
          .update({
            status: 'completed',
            domain_type: detectedDomain,
          })
          .eq('id', parentCourse.id);

        setGenerationResult({
          courseId: parentCourse.id,
          videoId: playlistData.videos[0]?.id || '',
          videoTitle: `Mega-Course: ${playlistData.playlistTitle}`,
          domainType: detectedDomain,
          status: 'completed',
          moduleCount: totalExtractedModules,
          finalQuizQuestionCount: 5,
          isPlaylist: true,
        });

        setStatusMessage('');
      } catch (playlistErr: any) {
        console.error('Playlist queue failed:', playlistErr);
        setError(playlistErr.message || 'Playlist mega-course generation aborted.');
      } finally {
        setLoading(false);
        setPlaylistProgress(null);
      }
      return;
    }

    // ========================================================
    // BRANCH B: SINGLE VIDEO INGESTION PIPELINE
    // ========================================================
    setStatusMessage('Registering target in ledger...');

    try {
      // Step 1: Create initial course record in Supabase (status: 'processing')
      const { data: course, error: dbError } = await supabase
        .from('courses')
        .insert([
          {
            user_id: user?.id,
            youtube_url: trimmedUrl,
            video_title: 'Ingesting Target...',
            domain_type: 'pending',
            status: 'processing',
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      // Step 2: Phase 2 - Infiltration & Classifier Node
      setStatusMessage('Extracting transcript stream & classifying domain...');

      const ingestRes = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          url: trimmedUrl,
          courseId: course.id,
        }),
      });

      const ingestData = await ingestRes.json();

      if (!ingestRes.ok) {
        toast.error(ingestData.error || 'Ingestion pipeline encountered a breakdown.', {
          className:
            '!bg-zinc-900 !border-red-900/80 !text-red-400 font-mono text-xs rounded-none shadow-2xl',
        });
        throw new Error(ingestData.error || 'Ingestion pipeline encountered a breakdown.');
      }

      if (ingestData.isSynthesized) {
        toast.info('Closed captions unavailable: Synthesizing curriculum via deep video intelligence...', {
          className:
            '!bg-zinc-900 !border-amber-900/60 !text-amber-300 font-mono text-xs rounded-none',
        });
      }

      // Step 3: Phase 3 - Domain-Specific Curriculum Extraction
      setStatusMessage(`Executing ${ingestData.domainType} decomposition & tactical trials...`);

      const generateRes = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          course_id: course.id,
          domain_type: ingestData.domainType,
          transcript: ingestData.transcript,
        }),
      });

      const generateData = await generateRes.json();

      if (!generateRes.ok) {
        throw new Error(generateData.error || 'Curriculum extraction pipeline encountered a breakdown.');
      }

      setGenerationResult({
        courseId: course.id,
        videoId: ingestData.videoId,
        videoTitle: ingestData.videoTitle,
        domainType: ingestData.domainType,
        status: 'completed',
        transcriptWordCount: ingestData.transcriptWordCount,
        intervalCount: ingestData.intervalCount,
        moduleCount: generateData.moduleCount,
        finalQuizQuestionCount: generateData.finalQuizQuestionCount,
      });

      setStatusMessage('');
    } catch (err: any) {
      console.error('Course generation failed:', err);
      setError(err.message || 'Operation failed: Unable to initialize course generation.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      // Prompt user to sign in to arm streak & permanent storage, or continue as guest
      setAuthModalOpen(true);
    } else {
      executeGeneration();
    }
  };

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-black text-stone-800 dark:text-zinc-200 font-sans py-10 px-4 transition-colors duration-200">
      <Toaster position="bottom-right" />
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Top Header */}
        <header className="border border-stone-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-stone-100 dark:bg-zinc-900 border border-stone-300 dark:border-zinc-800 rounded-lg flex items-center justify-center font-bold text-stone-900 dark:text-white text-sm font-ninja">
              仙
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-stone-900 dark:text-white tracking-wider font-ninja">SENSAI</span>
                <span className="text-[10px] bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-stone-600 dark:text-zinc-400 px-1.5 py-0.5 rounded font-mono">
                  OPERATIONAL
                </span>
              </div>
              <span className="text-[11px] text-stone-500 dark:text-zinc-500 font-mono">
                {user ? user.email : 'Guest Operative // Explore Mode'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <Link
              href="/skill-map"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-stone-300 dark:border-zinc-800 hover:border-stone-400 dark:hover:border-zinc-700 bg-stone-100 dark:bg-zinc-900 text-stone-700 dark:text-zinc-300 hover:text-stone-950 dark:hover:text-white transition-colors rounded-md font-ninja font-bold"
            >
              <Brain className="w-3.5 h-3.5 text-red-600 dark:text-red-500" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Skill Map</span>
            </Link>

            <ThemeToggle />

            {user ? (
              <button
                onClick={handleSignOut}
                title="Terminate Session"
                className="p-1.5 border border-stone-300 dark:border-zinc-800 hover:border-stone-400 dark:hover:border-zinc-700 bg-stone-100 dark:bg-zinc-900 text-stone-700 dark:text-zinc-400 hover:text-stone-950 dark:hover:text-white transition-colors flex items-center space-x-1.5 px-3 rounded-md font-ninja font-bold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Sign Out</span>
              </button>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="p-1.5 bg-stone-900 hover:bg-black dark:bg-zinc-900 dark:hover:bg-zinc-800 text-white border border-transparent dark:border-zinc-700 font-bold transition-colors flex items-center space-x-1.5 px-3 rounded-md font-ninja shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5 text-stone-300 dark:text-zinc-400" />
                <span className="text-[10px] uppercase tracking-wider">Sign In</span>
              </button>
            )}
          </div>
        </header>

        {/* Guest Exploration Banner (If unauthenticated) */}
        {!user && (
          <div className="p-3.5 border border-stone-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/70 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5 text-stone-600 dark:text-zinc-400">
              <UserCheck className="w-4 h-4 text-stone-500 dark:text-zinc-300 shrink-0" />
              <span>
                You are in <strong>Explore Mode</strong>. Arm your API key below and test course generation freely.
              </span>
            </div>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="text-[11px] text-red-600 dark:text-zinc-300 hover:text-red-700 dark:hover:text-white font-bold uppercase tracking-wider underline underline-offset-4 shrink-0 font-ninja"
            >
              Sign In for Streaks &amp; XP &rarr;
            </button>
          </div>
        )}

        {/* Ninja Discipline Progression Widget (If logged in) */}
        {user && (
          <section>
            <ProfileWidget
              totalXp={profile?.total_xp ?? 0}
              streak={profile?.current_streak ?? 0}
              email={user.email}
            />
          </section>
        )}

        {/* Daily Dojo Spaced-Repetition Training Session Portal */}
        <section className="relative overflow-hidden border border-red-200 dark:border-red-950/60 bg-gradient-to-r from-red-50 via-white to-red-50 dark:from-red-950/20 dark:via-zinc-950 dark:to-red-950/20 p-5 rounded-2xl shadow-sm transition-all hover:border-red-400 dark:hover:border-red-700/60 group">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2 text-xs font-ninja tracking-widest uppercase text-red-600 dark:text-red-500 font-bold">
                <Brain className="w-4 h-4" />
                <span>Daily Dojo Session // Spaced Repetition</span>
              </div>
              <h3 className="text-base sm:text-lg font-black font-ninja text-stone-900 dark:text-white tracking-tight">
                Train Aging Concepts &amp; Reinforce Recall
              </h3>
              <p className="text-xs text-stone-600 dark:text-zinc-400 font-sans leading-relaxed max-w-lg">
                Stop forgetting YouTube insights. Take a 5-minute active recall drill across your decomposed courses with SuperMemo-2 spaced repetition and in-video checkpoints.
              </p>
            </div>

            <Link
              href="/dojo"
              className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-ninja text-xs font-bold uppercase tracking-wider transition-all shadow-md group-hover:scale-105 active:scale-95 shrink-0"
            >
              <Swords className="w-4 h-4" />
              <span>Enter Daily Dojo &rarr;</span>
            </Link>
          </div>
        </section>

        {/* Bring-Your-Own-Key Interface */}
        <section>
          <ApiKeyManager />
        </section>

        {/* Target Ingestion Form */}
        <section className="border border-stone-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 p-6 rounded-2xl shadow-sm transition-colors">
          <div className="flex items-center space-x-2 text-stone-500 dark:text-zinc-500 text-xs mb-3 tracking-widest uppercase font-ninja">
            <Shield className="w-3.5 h-3.5 text-stone-500 dark:text-zinc-400" />
            <span>Target Acquisition &amp; Playlist Queue</span>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white mb-1 font-ninja">
            Enter YouTube Source or Playlist
          </h2>
          <p className="text-xs text-stone-600 dark:text-zinc-400 mb-6 font-sans leading-relaxed">
            Supply any technical video or playlist URL. Sensai dynamically extracts lessons, code blocks, and localized trial quizzes.
          </p>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wider font-ninja">
                Target URL (Single Video or Playlist)
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or playlist?list=..."
                disabled={loading}
                className="w-full px-4 py-3 bg-stone-50 dark:bg-zinc-900/70 border border-stone-300 dark:border-zinc-800 rounded-lg text-stone-900 dark:text-zinc-100 placeholder-stone-400 dark:placeholder-zinc-600 text-xs focus:outline-none focus:border-red-500 font-mono transition-colors disabled:opacity-50"
              />
            </div>

            {/* Playlist Queue Progress Bar */}
            {playlistProgress && (
              <div className="p-3 border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900/80 rounded-lg space-y-2 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-stone-800 dark:text-zinc-300">
                    <ListVideo className="w-3.5 h-3.5 text-stone-500 dark:text-zinc-400" />
                    <span className="font-bold">Playlist Queue Infiltration</span>
                  </div>
                  <span className="text-[11px] text-stone-500 dark:text-zinc-400">
                    {playlistProgress.current} / {playlistProgress.total} Targets
                  </span>
                </div>
                <div className="w-full h-1 bg-stone-200 dark:bg-zinc-800 overflow-hidden rounded-full">
                  <div
                    className="h-full bg-red-600 transition-all duration-300"
                    style={{
                      width: `${(playlistProgress.current / playlistProgress.total) * 100}%`,
                    }}
                  />
                </div>
                <div className="text-[10px] text-stone-500 dark:text-zinc-500 truncate">
                  Current: {playlistProgress.currentTitle}
                </div>
              </div>
            )}

            {statusMessage && !playlistProgress && (
              <div className="p-3 border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900/50 text-stone-800 dark:text-zinc-300 text-xs flex items-center space-x-2 rounded-lg font-mono">
                <span className="w-2 h-2 bg-red-500 animate-ping rounded-full"></span>
                <span>{statusMessage}</span>
              </div>
            )}

            {error && (
              <div className="p-3 border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs leading-relaxed rounded-lg font-mono">
                [ERROR]: {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-stone-900 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-black font-bold text-xs uppercase tracking-widest rounded-lg disabled:opacity-40 transition-all active:scale-[0.99] font-ninja shadow-sm"
            >
              {loading ? 'Decomposing Target Stream...' : 'Strike: Generate Interactive Course'}
            </button>
          </form>

          {/* Stealth Skeletons displayed during processing */}
          {loading && (
            <div className="mt-8 space-y-4 font-mono">
              <div className="flex items-center space-x-2 text-xs text-stone-500 dark:text-zinc-500 uppercase tracking-widest font-ninja">
                <Layers className="w-3.5 h-3.5 text-stone-500 dark:text-zinc-400" />
                <span>Assembling Curriculum Structure...</span>
              </div>
              <StealthSkeleton count={2} />
            </div>
          )}

          {/* Complete Course Generation Result Display */}
          {generationResult && (
            <div className="mt-6 p-5 border border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-900/40 rounded-xl space-y-4 font-mono">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider font-ninja">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {generationResult.isPlaylist ? 'Mega-Course Decomposed' : 'Curriculum Decomposed'}
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-stone-200 dark:bg-zinc-800 text-stone-800 dark:text-zinc-300 px-2.5 py-1 border border-stone-300 dark:border-zinc-700 rounded">
                  {generationResult.domainType}
                </span>
              </div>

              <div className="text-sm text-stone-900 dark:text-white font-medium font-sans">
                {generationResult.videoTitle}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 border-y border-stone-200 dark:border-zinc-800 text-xs text-stone-600 dark:text-zinc-400">
                <div className="bg-white dark:bg-zinc-950/60 p-2.5 border border-stone-200 dark:border-zinc-900 rounded">
                  <span className="block text-[10px] uppercase text-stone-500 dark:text-zinc-500 font-ninja">Modules</span>
                  <span className="text-stone-900 dark:text-white font-bold">{generationResult.moduleCount}</span>
                </div>
                <div className="bg-white dark:bg-zinc-950/60 p-2.5 border border-stone-200 dark:border-zinc-900 rounded">
                  <span className="block text-[10px] uppercase text-stone-500 dark:text-zinc-500 font-ninja">Final Trial</span>
                  <span className="text-stone-900 dark:text-white font-bold">{generationResult.finalQuizQuestionCount} Questions</span>
                </div>
                <div className="bg-white dark:bg-zinc-950/60 p-2.5 border border-stone-200 dark:border-zinc-900 rounded">
                  <span className="block text-[10px] uppercase text-stone-500 dark:text-zinc-500 font-ninja">Type</span>
                  <span className="text-stone-900 dark:text-white font-bold">{generationResult.isPlaylist ? 'Mega-Playlist' : 'Single Video'}</span>
                </div>
                <div className="bg-white dark:bg-zinc-950/60 p-2.5 border border-stone-200 dark:border-zinc-900 rounded">
                  <span className="block text-[10px] uppercase text-stone-500 dark:text-zinc-500 font-ninja">Status</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">{generationResult.status}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3 font-ninja">
                <a
                  href={`/course/${generationResult.courseId}`}
                  className="flex-1 flex items-center justify-center space-x-2 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider transition-colors rounded-lg shadow-sm"
                >
                  <Swords className="w-4 h-4" />
                  <span>Enter Training Dojo</span>
                </a>
              </div>
            </div>
          )}
        </section>

      </div>

      {/* Floating Developer Feedback Comms */}
      <FeedbackModal initialEmail={user?.email} />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onContinueAsGuest={executeGeneration}
      />
    </main>
  );
}
