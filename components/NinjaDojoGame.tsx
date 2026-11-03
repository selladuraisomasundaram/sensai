'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Swords, Trophy, RotateCcw, Flame, Sparkles, Terminal } from 'lucide-react';

interface NinjaDojoGameProps {
  statusMessage?: string;
  onBonusXp?: (bonusXp: number) => void;
}

export default function NinjaDojoGame({
  statusMessage = 'Decomposing target stream in background...',
  onBonusXp,
}: NinjaDojoGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [bonusAwarded, setBonusAwarded] = useState(false);

  // Game internal mutable state across animation frames
  const stateRef = useRef({
    gameState: 'idle' as 'idle' | 'playing' | 'gameover',
    score: 0,
    ninjaY: 100,
    velocity: 0,
    obstacles: [] as Array<{ x: number; top: number; bottom: number; passed: boolean }>,
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }>,
    frameCount: 0,
  });

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (s.gameState === 'idle') {
      s.gameState = 'playing';
      s.ninjaY = 100;
      s.velocity = -6;
      s.obstacles = [];
      s.score = 0;
      setScore(0);
      setGameState('playing');
    } else if (s.gameState === 'playing') {
      s.velocity = -6.2;
      // Add jump smoke particles
      for (let i = 0; i < 4; i++) {
        s.particles.push({
          x: 55,
          y: s.ninjaY + 12,
          vx: (Math.random() - 0.5) * 2 - 1,
          vy: Math.random() * 2 + 1,
          life: 18,
          color: '#dc2626',
        });
      }
    } else if (s.gameState === 'gameover') {
      // Restart
      s.gameState = 'playing';
      s.ninjaY = 100;
      s.velocity = -6;
      s.obstacles = [];
      s.particles = [];
      s.score = 0;
      setScore(0);
      setGameState('playing');
    }
  }, []);

  // Keyboard handlers (Space, ArrowUp)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [jump]);

  // Main 60fps Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      const s = stateRef.current;
      s.frameCount++;

      const width = canvas.width;
      const height = canvas.height;

      // 1. Clear & Background
      ctx.fillStyle = '#09090b'; // dark zinc-950
      ctx.fillRect(0, 0, width, height);

      // Subtle Dojo Floor grid lines
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 1;
      for (let y = 30; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Physics & Logic (If playing)
      if (s.gameState === 'playing') {
        s.velocity += 0.32; // Gravity
        s.ninjaY += s.velocity;

        // Ground / Ceiling collision
        if (s.ninjaY > height - 16) {
          s.ninjaY = height - 16;
          s.gameState = 'gameover';
          setGameState('gameover');
        } else if (s.ninjaY < 12) {
          s.ninjaY = 12;
          s.velocity = 0;
        }

        // Spawn obstacles (Bamboo gates)
        if (s.frameCount % 90 === 0) {
          const gap = 76;
          const minHeight = 25;
          const maxTop = height - gap - minHeight;
          const top = Math.floor(Math.random() * (maxTop - minHeight + 1)) + minHeight;
          s.obstacles.push({
            x: width,
            top,
            bottom: top + gap,
            passed: false,
          });
        }

        // Move & Collide Obstacles
        for (let i = s.obstacles.length - 1; i >= 0; i--) {
          const ob = s.obstacles[i];
          ob.x -= 2.2;

          // Score point when cleared
          if (!ob.passed && ob.x < 50) {
            ob.passed = true;
            s.score += 1;
            setScore(s.score);
            setHighScore((prev) => Math.max(prev, s.score));

            // Reward Focus XP at 5 points
            if (s.score >= 5 && !bonusAwarded && onBonusXp) {
              setBonusAwarded(true);
              onBonusXp(15);
            }
          }

          // Check AABB collision with Ninja (hitbox: x: 50, y: ninjaY, w: 22, h: 22)
          const ninjaLeft = 45;
          const ninjaRight = 67;
          const ninjaTop = s.ninjaY - 11;
          const ninjaBottom = s.ninjaY + 11;

          if (ninjaRight > ob.x && ninjaLeft < ob.x + 30) {
            if (ninjaTop < ob.top || ninjaBottom > ob.bottom) {
              s.gameState = 'gameover';
              setGameState('gameover');
            }
          }

          // Remove offscreen
          if (ob.x < -35) {
            s.obstacles.splice(i, 1);
          }
        }
      }

      // 3. Draw Obstacles (Stylized Bamboo Torii Pillars)
      for (const ob of s.obstacles) {
        // Top pillar
        const topGrad = ctx.createLinearGradient(ob.x, 0, ob.x + 30, 0);
        topGrad.addColorStop(0, '#15803d');
        topGrad.addColorStop(0.5, '#22c55e');
        topGrad.addColorStop(1, '#166534');
        ctx.fillStyle = topGrad;
        ctx.fillRect(ob.x, 0, 30, ob.top);

        // Bamboo cap top
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(ob.x - 3, ob.top - 6, 36, 6);

        // Bottom pillar
        const botGrad = ctx.createLinearGradient(ob.x, 0, ob.x + 30, 0);
        botGrad.addColorStop(0, '#15803d');
        botGrad.addColorStop(0.5, '#22c55e');
        botGrad.addColorStop(1, '#166534');
        ctx.fillStyle = botGrad;
        ctx.fillRect(ob.x, ob.bottom, 30, height - ob.bottom);

        // Bamboo cap bottom
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(ob.x - 3, ob.bottom, 36, 6);
      }

      // 4. Update & Draw Jump Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();

        if (p.life <= 0) {
          s.particles.splice(i, 1);
        }
      }

      // 5. Draw Ninja (Katana / Shinobi Avatar)
      ctx.save();
      ctx.translate(56, s.ninjaY);

      // Tilt ninja based on velocity
      const tilt = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, s.velocity * 0.08));
      ctx.rotate(tilt);

      // Ninja Body (Dark Shadow)
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Ninja Headband (Flowing Crimson Ribbon)
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-10, -5, 20, 4);

      // Headband ribbon tails trailing behind
      ctx.beginPath();
      ctx.moveTo(-9, -4);
      ctx.lineTo(-18, -2 - s.velocity * 0.4);
      ctx.lineTo(-10, -1);
      ctx.fill();

      // Ninja Eyes Visor (White glowing focused gaze)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2, -4, 6, 2.5);

      ctx.restore();

      // 6. State Overlays
      if (s.gameState === 'idle') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SHINOBI FOCUS KATA', width / 2, height / 2 - 12);

        ctx.fillStyle = '#ef4444';
        ctx.font = '11px monospace';
        ctx.fillText('TAP or PRESS [SPACE] TO LEAP', width / 2, height / 2 + 10);
      } else if (s.gameState === 'gameover') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('KATA INTERRUPTED', width / 2, height / 2 - 12);

        ctx.fillStyle = '#d4d4d8';
        ctx.font = '11px monospace';
        ctx.fillText(`Gates Cleared: ${s.score}  |  TAP TO RETRY`, width / 2, height / 2 + 10);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [jump, bonusAwarded, onBonusXp]);

  return (
    <div className="w-full rounded-2xl border border-stone-300 dark:border-zinc-800 bg-stone-900 text-white overflow-hidden shadow-2xl space-y-0 select-none animate-in fade-in duration-300">
      {/* Top Banner: Status & Focus Score */}
      <div className="p-3 bg-stone-950 dark:bg-black border-b border-stone-800 dark:border-zinc-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2 text-stone-300">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
          <span className="text-[11px] truncate max-w-[200px] sm:max-w-xs text-stone-300 font-sans">
            {statusMessage}
          </span>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <div className="flex items-center space-x-1 text-emerald-400 font-bold">
            <Trophy className="w-3.5 h-3.5" />
            <span>Score: {score}</span>
          </div>

          <div className="hidden sm:flex items-center space-x-1 text-stone-400">
            <span>Best: {highScore}</span>
          </div>
        </div>
      </div>

      {/* Interactive Game Canvas */}
      <div
        className="relative w-full cursor-pointer bg-black"
        onClick={jump}
        onTouchStart={(e) => {
          e.preventDefault();
          jump();
        }}
      >
        <canvas
          ref={canvasRef}
          width={480}
          height={180}
          className="w-full h-[180px] block"
        />

        {/* Floating Quick Action Tip */}
        <div className="absolute bottom-2 left-3 text-[10px] text-zinc-500 font-mono pointer-events-none">
          Click / [Space] to Jump
        </div>

        {score >= 5 && (
          <div className="absolute top-2 right-3 inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-950/70 border border-amber-800 text-amber-300 font-mono text-[10px] pointer-events-none animate-bounce">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>+15 Focus XP Armed!</span>
          </div>
        )}
      </div>

      {/* Bottom Progress Bar: AI Deconstruction Indicator */}
      <div className="px-3.5 py-2 bg-stone-950 dark:bg-black border-t border-stone-800 dark:border-zinc-900 flex items-center justify-between text-[11px] font-mono text-stone-400">
        <span className="text-[10px] font-ninja tracking-wider uppercase text-red-500 font-bold">
          Dojo Training Buffer Active
        </span>
        <span className="text-[10px] text-stone-500">
          Your course will appear automatically upon completion
        </span>
      </div>
    </div>
  );
}
