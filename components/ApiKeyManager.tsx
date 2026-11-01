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
    <div className="border border-zinc-900 bg-zinc-950 p-6 font-mono">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2 text-zinc-500 text-xs tracking-widest uppercase">
          <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
          <span>Zero-Trust BYOK Vault</span>
        </div>
        {isSaved && (
          <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-2 py-0.5 uppercase tracking-wider">
            <Check className="w-3 h-3" />
            <span>Key Armed</span>
          </span>
        )}
      </div>

      <p className="text-xs text-zinc-400 mb-4">
        Your key stays securely in your local browser sandbox. It is transmitted transiently via Authorization headers and never stored on Sensai servers.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setIsSaved(false);
            }}
            placeholder="AI Studio / OpenAI / Anthropic key..."
            className="w-full px-4 py-2.5 bg-zinc-900/70 border border-zinc-800 rounded-none text-zinc-100 placeholder-zinc-600 text-xs focus:outline-none focus:border-zinc-500 font-mono transition-colors"
          />
        </div>
        <button
          onClick={handleSave}
          className={`px-5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-none transition-all active:scale-[0.98] ${
            isSaved
              ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
              : 'bg-zinc-100 hover:bg-white text-black border border-white'
          }`}
        >
          {isSaved ? 'Key Stored' : 'Store Key'}
        </button>
      </div>

      {/* Where to find guide link */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="inline-flex items-center space-x-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors group cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
          <span className="underline underline-offset-4 decoration-zinc-700 group-hover:decoration-zinc-400">
            Where to find your API key?
          </span>
          {showGuide ? (
            <ChevronUp className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
          ) : (
            <ChevronDown className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
          )}
        </button>

        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <span>Get Free Key on Google AI Studio</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Expandable Step-by-Step Guide */}
      {showGuide && (
        <div className="mt-4 p-4 border border-zinc-800 bg-zinc-900/70 text-xs text-zinc-300 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center space-x-2 text-zinc-200 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-red-500" />
              <span>Step-by-Step: Getting a Free Gemini API Key</span>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-[11px] px-2.5 py-1 bg-red-950/60 border border-red-800 text-red-200 hover:bg-red-900/80 hover:text-white transition-colors"
            >
              <span>Open AI Studio</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <ol className="space-y-2 text-[11px] text-zinc-400 list-decimal list-inside leading-relaxed">
            <li>
              Navigate to{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-200 underline underline-offset-2 hover:text-white"
              >
                aistudio.google.com/app/apikey
              </a>{' '}
              and sign in with your regular Google account.
            </li>
            <li>
              Click the <strong className="text-zinc-200">"Create API key"</strong> button in Google AI Studio.
            </li>
            <li>
              Select an existing Google Cloud project or click <em>"Create key in new project"</em> (takes ~3 seconds, no credit card required).
            </li>
            <li>
              Copy your generated key (it starts with <code className="text-red-400 bg-black/40 px-1 py-0.5">AIza...</code>).
            </li>
            <li>
              Paste the key into the vault input above and click <strong className="text-zinc-200">"Store Key"</strong>.
            </li>
          </ol>

          <div className="pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-500">
            * OpenAI (<code className="text-zinc-400">sk-...</code>) and Anthropic (<code className="text-zinc-400">sk-ant...</code>) keys are also accepted if you prefer them.
          </div>
        </div>
      )}
    </div>
  );
}
