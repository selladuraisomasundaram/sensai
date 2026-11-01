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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono select-none animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-none shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-600 to-transparent" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-900 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-zinc-400 text-xs tracking-widest uppercase">
            <Terminal className="w-4 h-4 text-zinc-400" />
            <span>Gate 01 // Identity</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-lg font-black tracking-tight text-white mb-1.5">{title}</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">{subtitle}</p>
          </div>

          {/* Provider Not Enabled Diagnostic Alert */}
          {providerNotEnabled && (
            <div className="p-3.5 border border-amber-600/70 bg-amber-950/20 text-amber-300 text-xs space-y-2">
              <div className="flex items-center space-x-2 font-bold uppercase tracking-wider text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Supabase Google Provider Not Activated</span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                Google OAuth is currently toggled <strong>OFF</strong> in your Supabase project.
              </p>
              <div className="text-[11px] bg-black/40 p-2.5 border border-amber-800/60 text-zinc-300 space-y-1">
                <span className="font-bold block text-amber-400">To enable in 30 seconds:</span>
                <div>1. Open your Supabase Dashboard</div>
                <div>2. Navigate to <strong>Authentication &rarr; Providers &rarr; Google</strong></div>
                <div>3. Toggle <strong>&quot;Enable Google provider&quot;</strong>, enter Client ID &amp; Secret, and click Save.</div>
              </div>
              <p className="text-[11px] text-zinc-300">
                In the meantime, you can sign in below with <strong>Email Magic Link</strong> or <strong>Continue as Guest</strong>!
              </p>
            </div>
          )}

          {error && !providerNotEnabled && (
            <div className="p-3 border border-red-900/60 bg-red-950/20 text-red-400 text-xs">
              [ERROR]: {error}
            </div>
          )}

          {/* Option 1: Monochromatic Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            disabled={loadingGoogle}
            type="button"
            className="w-full group flex items-center justify-center space-x-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-800 hover:border-zinc-700 py-3 px-4 rounded-none transition-all active:scale-[0.99] disabled:opacity-50"
          >
            <svg
              className="w-4 h-4 fill-current text-zinc-300 group-hover:text-white transition-colors"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
            </svg>
            <span className="text-xs uppercase tracking-wider font-semibold">
              {loadingGoogle ? 'Initializing OAuth...' : 'Continue with Google'}
            </span>
          </button>

          <div className="flex items-center space-x-3 my-2 text-zinc-600 text-[10px] uppercase tracking-widest">
            <span className="flex-1 h-[1px] bg-zinc-900" />
            <span>or instant email magic link</span>
            <span className="flex-1 h-[1px] bg-zinc-900" />
          </div>

          {/* Option 2: Instant Email Magic Link */}
          {!emailSent ? (
            <form onSubmit={handleEmailLogin} className="space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operative@domain.com"
                  className="flex-1 px-3 py-2 bg-zinc-900/70 border border-zinc-800 rounded-none text-zinc-100 placeholder-zinc-600 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={loadingEmail}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs uppercase font-bold tracking-wider rounded-none transition-colors"
                >
                  {loadingEmail ? 'Sending...' : 'Send Link'}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-3 border border-emerald-900/60 bg-emerald-950/20 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Magic login link dispatched to <strong>{email}</strong>. Check your inbox!</span>
            </div>
          )}

          {/* Option 3: Continue as Guest */}
          {onContinueAsGuest && (
            <div className="pt-3 border-t border-zinc-900 text-center">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onContinueAsGuest();
                }}
                className="text-xs text-zinc-400 hover:text-white uppercase tracking-wider flex items-center justify-center space-x-1.5 mx-auto transition-colors"
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

