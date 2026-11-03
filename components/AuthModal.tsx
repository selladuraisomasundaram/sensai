'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Terminal, X, Mail, ArrowRight, AlertTriangle, CheckCircle, Shield } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueAsGuest?: () => void;
  title?: string;
  subtitle?: string;
}

export default function AuthModal({
  isOpen,
  onClose,
  onContinueAsGuest,
  title = 'Identity Verification Required',
  subtitle = 'Sign in to record your courses permanently, advance through ranks, and maintain daily discipline streaks.',
}: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerNotEnabled, setProviderNotEnabled] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setError(null);
    setProviderNotEnabled(false);
    setLoadingGoogle(true);

    try {
      const { error: loginErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });

      if (loginErr) {
        if (
          loginErr.message.includes('not enabled') ||
          loginErr.message.includes('Unsupported provider')
        ) {
          setProviderNotEnabled(true);
        } else {
          setError(loginErr.message);
        }
      }
    } catch (err: any) {
      setError(err.message || 'OAuth initialization failed.');
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    setError(null);
    setLoadingEmail(true);

    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });

      if (otpErr) {
        setError(otpErr.message);
      } else {
        setEmailSent(true);
      }
    } catch (err: any) {
      setError(err.message || 'Magic link dispatch failed.');
    } finally {
      setLoadingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-600 to-transparent" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-zinc-900 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-stone-600 dark:text-zinc-400 text-xs tracking-widest uppercase font-ninja">
            <Terminal className="w-4 h-4 text-stone-500 dark:text-zinc-400" />
            <span>Gate 01 // Identity</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border border-stone-300 hover:border-stone-400 bg-stone-100 text-stone-600 hover:text-stone-900 dark:border-zinc-800 dark:hover:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-md transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-lg font-black tracking-tight text-stone-900 dark:text-white mb-1.5 font-ninja">
              {title}
            </h2>
            <p className="text-xs text-stone-600 dark:text-zinc-400 leading-relaxed font-sans">{subtitle}</p>
          </div>

          {/* Provider Not Enabled Diagnostic Alert */}
          {providerNotEnabled && (
            <div className="p-3.5 border border-amber-300 dark:border-amber-600/70 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300 text-xs space-y-2 rounded-lg font-sans">
              <div className="flex items-center space-x-2 font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 font-ninja">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Supabase Google Provider Not Activated</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Google OAuth is currently toggled <strong>OFF</strong> in your Supabase project.
              </p>
              <div className="text-[11px] bg-stone-100 dark:bg-black/40 p-2.5 border border-amber-200 dark:border-amber-800/60 rounded space-y-1 font-mono">
                <span className="font-bold block text-amber-600 dark:text-amber-400">To enable in 30 seconds:</span>
                <div>1. Open your Supabase Dashboard</div>
                <div>2. Navigate to <strong>Authentication &rarr; Providers &rarr; Google</strong></div>
                <div>3. Toggle <strong>&quot;Enable Google provider&quot;</strong>, enter Client ID &amp; Secret, and click Save.</div>
              </div>
              <p className="text-[11px]">
                In the meantime, you can sign in below with <strong>Email Magic Link</strong> or <strong>Continue as Guest</strong>!
              </p>
            </div>
          )}

          {error && !providerNotEnabled && (
            <div className="p-3 border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs rounded-lg font-mono">
              [ERROR]: {error}
            </div>
          )}

          {/* Option 1: Monochromatic Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            disabled={loadingGoogle}
            type="button"
            className="w-full group flex items-center justify-center space-x-3 bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-300 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-800 dark:hover:border-zinc-700 py-3 px-4 rounded-lg transition-all active:scale-[0.99] disabled:opacity-50 font-ninja"
          >
            <svg
              className="w-4 h-4 fill-current text-stone-700 dark:text-zinc-300 group-hover:text-black dark:group-hover:text-white transition-colors"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
            </svg>
            <span className="text-xs uppercase tracking-wider font-semibold">
              {loadingGoogle ? 'Initializing OAuth...' : 'Continue with Google'}
            </span>
          </button>

          <div className="flex items-center space-x-3 my-2 text-stone-400 dark:text-zinc-600 text-[10px] uppercase tracking-widest font-ninja">
            <span className="flex-1 h-[1px] bg-stone-200 dark:bg-zinc-900" />
            <span>or instant email magic link</span>
            <span className="flex-1 h-[1px] bg-stone-200 dark:bg-zinc-900" />
          </div>

          {/* Option 2: Instant Email Magic Link */}
          {!emailSent ? (
            <form onSubmit={handleEmailLogin} className="space-y-2.5 font-mono">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operative@domain.com"
                  className="flex-1 px-3 py-2 bg-stone-50 dark:bg-zinc-900/70 border border-stone-300 dark:border-zinc-800 rounded-lg text-stone-900 dark:text-zinc-100 placeholder-stone-400 dark:placeholder-zinc-600 text-xs focus:outline-none focus:border-red-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={loadingEmail}
                  className="px-4 py-2 bg-stone-900 hover:bg-black text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 border border-transparent dark:border-zinc-700 text-xs uppercase font-bold tracking-wider rounded-lg transition-colors font-ninja"
                >
                  {loadingEmail ? 'Sending...' : 'Send Link'}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-3 border border-emerald-300 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center space-x-2 rounded-lg font-sans">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Magic login link dispatched to <strong>{email}</strong>. Check your inbox!</span>
            </div>
          )}

          {/* Option 3: Continue as Guest */}
          {onContinueAsGuest && (
            <div className="pt-3 border-t border-stone-200 dark:border-zinc-900 text-center">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onContinueAsGuest();
                }}
                className="text-xs text-stone-600 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white uppercase tracking-wider flex items-center justify-center space-x-1.5 mx-auto transition-colors font-ninja"
              >
                <span>Explore &amp; Decompose as Guest</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
