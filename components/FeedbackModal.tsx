'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import {
  MessageSquare,
  X,
  Send,
  CheckCircle,
  Terminal,
  Clock,
  Sparkles,
} from 'lucide-react';

interface FeedbackModalProps {
  initialEmail?: string;
}

export default function FeedbackModal({ initialEmail }: FeedbackModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'Request a Feature' | 'Send Feedback'>('Request a Feature');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(initialEmail || '');
  const [userId, setUserId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Anti-Spam 60s cooldown state
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Auto-fill user email if logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        if (!email && session.user.email) {
          setEmail(session.user.email);
        }
        setUserId(session.user.id);
      }
    });
  }, [email]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownSeconds > 0) return;

    if (!message.trim() || message.trim().length < 5) {
      toast.error('Message payload too brief. Provide actionable details.', {
        className: '!bg-zinc-900 !border-red-900/60 !text-red-300 font-mono text-xs rounded-none',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message: message.trim(),
          userEmail: email.trim(),
          userId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch transmission.');
      }

      setIsSuccess(true);
      setCooldownSeconds(60);

      // Subtle stealth notification
      toast('Transmission sent.', {
        description: 'Developer notified at friendzforum69@gmail.com.',
        className:
          '!bg-zinc-900 !border-zinc-800 !text-white font-mono text-xs rounded-none shadow-2xl',
      });

      setTimeout(() => {
        setMessage('');
        setIsSuccess(false);
        setIsOpen(false);
      }, 1800);
    } catch (err: any) {
      toast.error('Transmission failed. Try again later.', {
        description: err.message,
        className:
          '!bg-zinc-900 !border-red-900/80 !text-red-400 font-mono text-xs rounded-none shadow-2xl',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Stealth Floating Trigger Button in Bottom-Right Corner */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Developer Dispatch: Feature Request & Feedback"
        className="fixed bottom-5 right-5 z-40 p-3 bg-white hover:bg-stone-100 text-stone-700 hover:text-stone-900 border border-stone-300 dark:bg-zinc-950 dark:hover:bg-zinc-900 dark:text-zinc-400 dark:hover:text-white dark:border-zinc-800 shadow-2xl rounded-lg font-mono transition-all duration-150 active:scale-95 group flex items-center space-x-2"
      >
        <MessageSquare className="w-4 h-4 text-stone-500 dark:text-zinc-400 group-hover:text-stone-900 dark:group-hover:text-zinc-200 transition-colors" />
        <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest text-stone-600 group-hover:text-stone-950 dark:text-zinc-400 dark:group-hover:text-white font-ninja">
          Comms
        </span>
      </button>

      {/* Ninja Modal Backdrop & Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Crimson Scanline Accent */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-600 to-transparent" />

            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-zinc-900 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Terminal className="w-4 h-4 text-stone-500 dark:text-zinc-400" />
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-stone-900 dark:text-white font-ninja">
                  Developer Comms // Dispatch
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 border border-stone-300 hover:border-stone-400 bg-stone-100 text-stone-600 hover:text-stone-900 dark:border-zinc-800 dark:hover:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
              {/* Type Selection */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-zinc-400 mb-1.5 font-ninja">
                  Transmission Classification
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('Request a Feature')}
                    className={`py-2 px-3 border rounded-lg text-left transition-colors flex items-center space-x-2 ${
                      type === 'Request a Feature'
                        ? 'border-red-600 bg-red-50 text-red-900 dark:border-zinc-400 dark:bg-zinc-900 dark:text-white font-bold'
                        : 'border-stone-200 bg-stone-50 text-stone-600 hover:text-stone-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-stone-500 dark:text-zinc-400" />
                    <span>Request Feature</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('Send Feedback')}
                    className={`py-2 px-3 border rounded-lg text-left transition-colors flex items-center space-x-2 ${
                      type === 'Send Feedback'
                        ? 'border-red-600 bg-red-50 text-red-900 dark:border-zinc-400 dark:bg-zinc-900 dark:text-white font-bold'
                        : 'border-stone-200 bg-stone-50 text-stone-600 hover:text-stone-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-stone-500 dark:text-zinc-400" />
                    <span>Send Feedback</span>
                  </button>
                </div>
              </div>

              {/* User Email (Optional / Auto-filled) */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-zinc-400 mb-1.5 font-ninja">
                  Operative Coordinates (Email)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com (optional)"
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-zinc-900/60 border border-stone-300 dark:border-zinc-800 rounded-lg text-stone-900 dark:text-zinc-100 placeholder-stone-400 dark:placeholder-zinc-600 text-xs focus:outline-none focus:border-red-500 font-mono transition-colors"
                />
              </div>

              {/* Message Textarea */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-zinc-400 mb-1.5 font-ninja">
                  Tactical Transmission Payload
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe desired feature capability, architecture improvement, or report..."
                  required
                  className="w-full px-3 py-2.5 bg-stone-50 dark:bg-zinc-900/60 border border-stone-300 dark:border-zinc-800 rounded-lg text-stone-900 dark:text-zinc-100 placeholder-stone-400 dark:placeholder-zinc-600 text-xs focus:outline-none focus:border-red-500 font-sans resize-none transition-colors"
                />
              </div>

              {/* Bottom Meta & Submit */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-stone-200 dark:border-zinc-900">
                <span className="text-[10px] text-stone-500 dark:text-zinc-500 tracking-wider font-mono">
                  Dispatched to friendzforum69@gmail.com
                </span>

                <button
                  type="submit"
                  disabled={isSubmitting || cooldownSeconds > 0}
                  className={`py-2.5 px-5 font-bold text-xs uppercase tracking-widest rounded-lg border transition-all flex items-center justify-center space-x-2 font-ninja ${
                    isSuccess
                      ? 'bg-emerald-100 border-emerald-500 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-600 dark:text-emerald-300'
                      : cooldownSeconds > 0
                      ? 'bg-stone-200 border-stone-300 text-stone-500 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-500 cursor-not-allowed'
                      : 'bg-stone-900 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-black border-transparent active:scale-[0.98]'
                  }`}
                >
                  {isSuccess ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Transmitted</span>
                    </>
                  ) : cooldownSeconds > 0 ? (
                    <>
                      <Clock className="w-3.5 h-3.5" />
                      <span>Cooldown ({cooldownSeconds}s)</span>
                    </>
                  ) : isSubmitting ? (
                    <span>Dispatching...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Transmit Dispatch</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

