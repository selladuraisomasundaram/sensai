'use client';

import { useState, useEffect } from 'react';
import { KeyRound, Check, HelpCircle, ExternalLink, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

export default function ApiKeyManager() {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('llm_api_key');
    if (storedKey) {
      setApiKey(storedKey);
      setIsSaved(true);
    }
  }, []);

  const handleSave = () => {
    if (apiKey.trim().length < 15) {
      alert('Please enter a valid LLM API Key.');
      return;
    }
    localStorage.setItem('llm_api_key', apiKey.trim());
    setIsSaved(true);
  };

  return (
    <div className="border border-stone-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 p-6 rounded-2xl shadow-sm transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2 text-stone-500 dark:text-zinc-500 text-xs tracking-widest uppercase font-ninja">
          <KeyRound className="w-3.5 h-3.5 text-stone-500 dark:text-zinc-400" />
          <span>Zero-Trust BYOK Vault</span>
        </div>
        {isSaved && (
          <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-300 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-900/60 px-2 py-0.5 uppercase tracking-wider rounded font-mono font-bold">
            <Check className="w-3 h-3" />
            <span>Key Armed</span>
          </span>
        )}
      </div>

      <p className="text-xs text-stone-600 dark:text-zinc-400 mb-4 font-sans leading-relaxed">
        Your key stays securely in your local browser sandbox. It is transmitted transiently via Authorization headers and never stored on Sensai servers.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-3 font-mono">
        <div className="relative flex-1">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setIsSaved(false);
            }}
            placeholder="AI Studio / OpenAI / Anthropic key..."
            className="w-full px-4 py-2.5 bg-stone-50 dark:bg-zinc-900/70 border border-stone-300 dark:border-zinc-800 rounded-lg text-stone-900 dark:text-zinc-100 placeholder-stone-400 dark:placeholder-zinc-600 text-xs focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>
        <button
          onClick={handleSave}
          className={`px-5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-lg transition-all active:scale-[0.98] font-ninja ${
            isSaved
              ? 'bg-stone-200 text-stone-800 border border-stone-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
              : 'bg-stone-900 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-black shadow-sm'
          }`}
        >
          {isSaved ? 'Key Stored' : 'Store Key'}
        </button>
      </div>

      {/* Where to find guide link */}
      <div className="flex items-center justify-between pt-1 font-ninja">
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="inline-flex items-center space-x-1.5 text-[11px] text-stone-600 dark:text-zinc-400 hover:text-stone-950 dark:hover:text-zinc-200 transition-colors group cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-stone-500 dark:text-zinc-500 group-hover:text-stone-700 dark:group-hover:text-zinc-300 transition-colors" />
          <span className="underline underline-offset-4 decoration-stone-400 dark:decoration-zinc-700 group-hover:decoration-stone-700 dark:group-hover:decoration-zinc-400">
            Where to find your API key?
          </span>
          {showGuide ? (
            <ChevronUp className="w-3 h-3 text-stone-500 dark:text-zinc-500 group-hover:text-stone-700 dark:group-hover:text-zinc-300" />
          ) : (
            <ChevronDown className="w-3 h-3 text-stone-500 dark:text-zinc-500 group-hover:text-stone-700 dark:group-hover:text-zinc-300" />
          )}
        </button>

        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1 text-[11px] text-red-600 dark:text-red-400 hover:underline transition-colors"
        >
          <span>Get Free Key on Google AI Studio</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Expandable Step-by-Step Guide */}
      {showGuide && (
        <div className="mt-4 p-4 rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900/70 text-xs text-stone-700 dark:text-zinc-300 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-zinc-800 font-ninja">
            <div className="flex items-center space-x-2 text-stone-900 dark:text-zinc-200 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-red-600 dark:text-red-500" />
              <span>Step-by-Step: Getting a Free Gemini API Key</span>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-[11px] px-2.5 py-1 bg-red-100 border border-red-300 text-red-800 dark:bg-red-950/60 dark:border-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/80 transition-colors rounded"
            >
              <span>Open AI Studio</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <ol className="space-y-2 text-[11px] text-stone-600 dark:text-zinc-400 list-decimal list-inside leading-relaxed font-sans">
            <li>
              Navigate to{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-stone-900 dark:text-zinc-200 underline underline-offset-2 hover:text-red-600"
              >
                aistudio.google.com/app/apikey
              </a>{' '}
              and sign in with your regular Google account.
            </li>
            <li>
              Click the <strong className="text-stone-900 dark:text-zinc-200">"Create API key"</strong> button in Google AI Studio.
            </li>
            <li>
              Select an existing Google Cloud project or click <em>"Create key in new project"</em> (takes ~3 seconds, no credit card required).
            </li>
            <li>
              Copy your generated key (it starts with <code className="text-red-600 dark:text-red-400 bg-stone-200 dark:bg-black/40 px-1 py-0.5 rounded font-mono">AIza...</code>).
            </li>
            <li>
              Paste the key into the vault input above and click <strong className="text-stone-900 dark:text-zinc-200">"Store Key"</strong>.
            </li>
          </ol>

          <div className="pt-2 border-t border-stone-200 dark:border-zinc-800/80 text-[10px] text-stone-500 dark:text-zinc-500 font-mono">
            * OpenAI (<code className="text-stone-600 dark:text-zinc-400">sk-...</code>) and Anthropic (<code className="text-stone-600 dark:text-zinc-400">sk-ant...</code>) keys are also accepted if you prefer them.
          </div>
        </div>
      )}
    </div>
  );
}
