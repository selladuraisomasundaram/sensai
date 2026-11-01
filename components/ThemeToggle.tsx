'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    // Check initial preference from localStorage or HTML root class
    const saved = localStorage.getItem('sensai_theme') as 'dark' | 'light' | null;
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
      applyTheme(saved);
    } else {
      setTheme('dark');
      applyTheme('dark');
    }
  }, []);

  const applyTheme = (newTheme: 'dark' | 'light') => {
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('sensai_theme', nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={`Switch to ${theme === 'dark' ? 'Parchment Light' : 'Stealth Dark'} Mode`}
      className={`p-1.5 border transition-colors flex items-center space-x-1.5 font-mono text-xs rounded-none ${
        theme === 'dark'
          ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700'
          : 'bg-zinc-100 border-zinc-300 text-zinc-800 hover:text-black hover:border-zinc-400'
      } ${className}`}
    >
      {theme === 'dark' ? (
        <>
          <Moon className="w-3.5 h-3.5 text-zinc-300" />
          <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider">Dark</span>
        </>
      ) : (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider">Light</span>
        </>
      )}
    </button>
  );
}

