'use client';

import React, { useState, useEffect } from 'react';
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
    <main className="min-h-screen bg-black text-zinc-200 font-mono py-10 px-4">
      <Toaster theme="dark" position="bottom-right" />
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Top Header */}
        <header className="border border-zinc-900 bg-zinc-950 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-white text-sm">
              仙
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white tracking-wider">SENSAI</span>
                <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5">
                  OPERATIONAL
                </span>
              </div>
              <span className="text-[11px] text-zinc-500">
                {user ? user.email : 'Guest Operative // Explore Mode'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <ThemeToggle />

            {user ? (
              <button
                onClick={handleSignOut}
                title="Terminate Session"
                className="p-1.5 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors flex items-center space-x-1.5 px-3"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Sign Out</span>
              </button>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold transition-colors flex items-center space-x-1.5 px-3"
              >
                <LogIn className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-[10px] uppercase tracking-wider">Sign In</span>
              </button>
            )}
          </div>
        </header>

        {/* Guest Exploration Banner (If unauthenticated) */}
        {!user && (
          <div className="p-3.5 border border-zinc-800 bg-zinc-950/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5 text-zinc-400">
              <UserCheck className="w-4 h-4 text-zinc-300 shrink-0" />
              <span>
                You are in <strong>Explore Mode</strong>. Arm your API key below and test course generation freely.
              </span>
            </div>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="text-[11px] text-zinc-300 hover:text-white font-bold uppercase tracking-wider underline underline-offset-4 shrink-0"
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

        {/* Bring-Your-Own-Key Interface */}
        <section>
          <ApiKeyManager />
        </section>

        {/* Target Ingestion Form */}
        <section className="border border-zinc-900 bg-zinc-950 p-6">
          <div className="flex items-center space-x-2 text-zinc-500 text-xs mb-3 tracking-widest uppercase">
            <Shield className="w-3.5 h-3.5 text-zinc-400" />
            <span>Target Acquisition &amp; Playlist Queue</span>
          </div>

          <h2 className="text-base font-bold text-white mb-1">Enter YouTube Source or Playlist</h2>
          <p className="text-xs text-zinc-400 mb-6">
            Supply any technical video or playlist URL. Sensai dynamically extracts lessons, code blocks, and localized trial quizzes.
          </p>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                Target URL (Single Video or Playlist)
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or playlist?list=..."
                disabled={loading}
                className="w-full px-4 py-3 bg-zinc-900/70 border border-zinc-800 rounded-none text-zinc-100 placeholder-zinc-600 text-xs focus:outline-none focus:border-zinc-500 transition-colors disabled:opacity-50"
              />
            </div>

            {/* Playlist Queue Progress Bar */}
            {playlistProgress && (
              <div className="p-3 border border-zinc-800 bg-zinc-900/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-zinc-300">
                    <ListVideo className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="font-bold">Playlist Queue Infiltration</span>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    {playlistProgress.current} / {playlistProgress.total} Targets
                  </span>
                </div>
                <div className="w-full h-1 bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-red-600 transition-all duration-300"
                    style={{
                      width: `${(playlistProgress.current / playlistProgress.total) * 100}%`,
                    }}
                  />
                </div>
                <div className="text-[10px] text-zinc-500 truncate">
                  Current: {playlistProgress.currentTitle}
                </div>
              </div>
            )}

            {statusMessage && !playlistProgress && (
              <div className="p-3 border border-zinc-800 bg-zinc-900/50 text-zinc-300 text-xs flex items-center space-x-2">
                <span className="w-2 h-2 bg-zinc-400 animate-ping"></span>
                <span>{statusMessage}</span>
              </div>
            )}

            {error && (
              <div className="p-3 border border-red-900/50 bg-red-950/20 text-red-400 text-xs leading-relaxed">
                [ERROR]: {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-zinc-100 hover:bg-white text-black font-bold text-xs uppercase tracking-widest rounded-none disabled:opacity-40 transition-all active:scale-[0.99]"
            >
              {loading ? 'Decomposing Target Stream...' : 'Strike: Generate Interactive Course'}
            </button>
          </form>

          {/* Stealth Skeletons displayed during processing */}
          {loading && (
            <div className="mt-8 space-y-4">
              <div className="flex items-center space-x-2 text-xs text-zinc-500 uppercase tracking-widest">
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                <span>Assembling Curriculum Structure...</span>
              </div>
              <StealthSkeleton count={2} />
            </div>
          )}

          {/* Complete Course Generation Result Display */}
          {generationResult && (
            <div className="mt-6 p-5 border border-zinc-800 bg-zinc-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {generationResult.isPlaylist ? 'Mega-Course Decomposed' : 'Curriculum Decomposed'}
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-zinc-800 text-zinc-300 px-2.5 py-1 border border-zinc-700">
                  {generationResult.domainType}
                </span>
              </div>

              <div className="text-sm text-white font-medium">
                {generationResult.videoTitle}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 border-y border-zinc-800 text-xs text-zinc-400">
                <div className="bg-zinc-950/60 p-2 border border-zinc-900">
                  <span className="block text-[10px] uppercase text-zinc-500">Modules</span>
                  <span className="text-white font-bold">{generationResult.moduleCount}</span>
                </div>
                <div className="bg-zinc-950/60 p-2 border border-zinc-900">
                  <span className="block text-[10px] uppercase text-zinc-500">Final Trial</span>
                  <span className="text-white font-bold">{generationResult.finalQuizQuestionCount} Questions</span>
                </div>
                <div className="bg-zinc-950/60 p-2 border border-zinc-900">
                  <span className="block text-[10px] uppercase text-zinc-500">Type</span>
                  <span className="text-white font-bold">{generationResult.isPlaylist ? 'Mega-Playlist' : 'Single Video'}</span>
                </div>
                <div className="bg-zinc-950/60 p-2 border border-zinc-900">
                  <span className="block text-[10px] uppercase text-zinc-500">Status</span>
                  <span className="text-emerald-400 font-bold uppercase">{generationResult.status}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <a
                  href={`/course/${generationResult.courseId}`}
                  className="flex-1 flex items-center justify-center space-x-2 py-3 bg-zinc-100 hover:bg-white text-black font-bold text-xs uppercase tracking-wider transition-colors"
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
