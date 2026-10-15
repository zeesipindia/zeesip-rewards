'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  playWhooshSound,
  playSliceShing,
  playCoinCollectSound,
  playLowBuzzer,
  playGameEndJingle,
} from '@/lib/sound';
import { BottleSpawn, BottleType } from '@/app/api/games/sip-slice/start/route';

interface ActiveBottle {
  id: number;
  type: BottleType;
  spawnTimeMs: number;
  durationMs: number;
  startXPercent: number;
  driftXPercent: number;
  peakYPercent: number;
  isSliced: boolean;
  sliceX?: number;
  sliceY?: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 1 to 0
  type: 'coin' | 'splash';
  color: string;
}

// Crisp pure SVGs for each bottle type
function BottleSvg({ type }: { type: BottleType }) {
  if (type === 'expired') {
    return (
      <svg width="60" height="100" viewBox="0 0 60 100" className="drop-shadow-lg">
        {/* Grey Cap */}
        <rect x="22" y="4" width="16" height="8" rx="2" fill="#546E7A" stroke="#37474F" strokeWidth="1.5" />
        {/* Bottle Body */}
        <path
          d="M24 12H36V22C36 26 48 32 48 44V88C48 94 43 98 36 98H24C17 98 12 94 12 88V44C12 32 24 26 24 22V12Z"
          fill="#90A4AE"
          stroke="#455A64"
          strokeWidth="2"
        />
        {/* Cracked lines */}
        <path d="M22 35L28 46L24 58L34 72" stroke="#37474F" strokeWidth="1.5" fill="none" />
        <path d="M38 52L30 62L36 78" stroke="#37474F" strokeWidth="1.5" fill="none" />
        {/* Label with Red X */}
        <rect x="18" y="50" width="24" height="24" rx="4" fill="#ECEFF1" stroke="#B0BEC5" />
        <path d="M24 56L36 68M36 56L24 68" stroke="#D32F2F" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'gold') {
    return (
      <svg width="60" height="100" viewBox="0 0 60 100" className="drop-shadow-[0_0_15px_#FFD700]">
        {/* Shiny Gold Cap */}
        <rect x="22" y="4" width="16" height="8" rx="2" fill="#FFE082" stroke="#FFB300" strokeWidth="1.5" />
        {/* Bottle Body */}
        <path
          d="M24 12H36V22C36 26 48 32 48 44V88C48 94 43 98 36 98H24C17 98 12 94 12 88V44C12 32 24 26 24 22V12Z"
          fill="#FFD54F"
          stroke="#FFA000"
          strokeWidth="2"
        />
        {/* Sparkle highlights */}
        <path d="M18 42C18 36 24 30 24 30" stroke="#FFF9C4" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M18 55V80" stroke="#FFF9C4" strokeWidth="2.5" strokeLinecap="round" />
        {/* Gold Coin Emblem */}
        <circle cx="30" cy="62" r="10" fill="#FFC107" stroke="#FF8F00" strokeWidth="1.5" />
        <text x="30" y="66" fill="#5D4037" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">+3</text>
      </svg>
    );
  }

  if (type === 'mango') {
    return (
      <svg width="60" height="100" viewBox="0 0 60 100" className="drop-shadow-lg">
        {/* Yellow Cap */}
        <rect x="22" y="4" width="16" height="8" rx="2" fill="#FFC93C" stroke="#D89D10" strokeWidth="1.5" />
        {/* Mango Green Body */}
        <path
          d="M24 12H36V22C36 26 48 32 48 44V88C48 94 43 98 36 98H24C17 98 12 94 12 88V44C12 32 24 26 24 22V12Z"
          fill="#58A727"
          stroke="#388E3C"
          strokeWidth="2"
        />
        {/* Gloss highlight */}
        <path d="M18 44V82" stroke="#81C784" strokeWidth="2" strokeLinecap="round" />
        {/* Label */}
        <rect x="18" y="52" width="24" height="22" rx="4" fill="#FFFFFF" />
        <circle cx="30" cy="63" r="6" fill="#FFC93C" />
        <text x="30" y="66" fill="#388E3C" fontSize="8" fontWeight="900" textAnchor="middle">ZEE</text>
      </svg>
    );
  }

  // Pineapple
  return (
    <svg width="60" height="100" viewBox="0 0 60 100" className="drop-shadow-lg">
      {/* Green Cap */}
      <rect x="22" y="4" width="16" height="8" rx="2" fill="#4CAF50" stroke="#2E7D32" strokeWidth="1.5" />
      {/* Yellow Pineapple Body */}
      <path
        d="M24 12H36V22C36 26 48 32 48 44V88C48 94 43 98 36 98H24C17 98 12 94 12 88V44C12 32 24 26 24 22V12Z"
        fill="#FFC93C"
        stroke="#E5A61E"
        strokeWidth="2"
      />
      {/* Pineapple textures */}
      <line x1="18" y1="50" x2="42" y2="74" stroke="#E5A61E" strokeWidth="1.5" strokeDasharray="2 2" />
      <line x1="42" y1="50" x2="18" y2="74" stroke="#E5A61E" strokeWidth="1.5" strokeDasharray="2 2" />
      {/* Label */}
      <rect x="18" y="52" width="24" height="22" rx="4" fill="#FFFFFF" />
      <circle cx="30" cy="63" r="6" fill="#4CAF50" />
      <text x="30" y="66" fill="#FFC93C" fontSize="8" fontWeight="900" textAnchor="middle">SIP</text>
    </svg>
  );
}

export default function SipSlicePage() {
  const router = useRouter();
  const [gameState, setGameState] = useState<'loading' | 'already_played' | 'ready' | 'playing' | 'expired_flash' | 'game_over'>('loading');
  const [readyCountdown, setReadyCountdown] = useState<string>('READY?');

  const [gameId, setGameId] = useState<string | null>(null);
  const [activeBottles, setActiveBottles] = useState<ActiveBottle[]>([]);
  const [slicedIndices, setSlicedIndices] = useState<number[]>([]);
  const [score, setScore] = useState<number>(0);
  const [gameTimeLeftMs, setGameTimeLeftMs] = useState<number>(30000);

  // Result state
  const [finalResult, setFinalResult] = useState<{
    coins_won: number;
    bottles_sliced: number;
    hit_expired: boolean;
  } | null>(null);
  const [cooldownCountdown, setCooldownCountdown] = useState<string>('');
  const [nextAvailable, setNextAvailable] = useState<string | null>(null);

  // Canvas / Swipe state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const swipeTrailRef = useRef<{ x: number; y: number; time: number }[]>([]);
  const isPointerDownRef = useRef<boolean>(false);
  const particlesRef = useRef<Particle[]>([]);

  const gameStartTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const hasFinishedRef = useRef<boolean>(false);

  // 1. Check auth and initialize game
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/');
        return;
      }

      fetch('/api/games/sip-slice/start', { method: 'POST' })
        .then(async (res) => {
          if (res.status === 409) {
            const data = await res.json();
            setNextAvailable(data.next_available || null);
            setGameState('already_played');
            return;
          }
          if (!res.ok) {
            router.push('/play');
            return;
          }
          const data = await res.json();
          setGameId(data.game_id);

          // Show READY? for 1s, then SLICE! for 0.5s, then start game
          setGameState('ready');
          setReadyCountdown('READY?');
          setTimeout(() => {
            setReadyCountdown('SLICE!');
            setTimeout(() => {
              startGame(data.bottles || [], data.game_id);
            }, 600);
          }, 1000);
        })
        .catch(() => {
          router.push('/play');
        });
    });

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Cooldown countdown updater
  useEffect(() => {
    if (!nextAvailable) return;
    const interval = setInterval(() => {
      const diff = new Date(nextAvailable).getTime() - Date.now();
      if (diff <= 0) {
        setCooldownCountdown('Ready to play!');
        clearInterval(interval);
      } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setCooldownCountdown(`${h}h ${m}m ${s}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [nextAvailable]);

  // Start the 30-second game loop
  const startGame = (sequence: BottleSpawn[], gId: string) => {
    setGameState('playing');
    gameStartTimeRef.current = Date.now();
    hasFinishedRef.current = false;

    const gameDurationMs = 30000;
    const spawnedMap = new Set<number>();

    const tick = () => {
      if (hasFinishedRef.current) return;

      const now = Date.now();
      const elapsed = now - gameStartTimeRef.current;
      const remaining = Math.max(0, gameDurationMs - elapsed);
      setGameTimeLeftMs(remaining);

      // Check spawn triggers
      sequence.forEach((item) => {
        if (!spawnedMap.has(item.index) && elapsed >= item.appear_at_ms) {
          spawnedMap.add(item.index);
          playWhooshSound();

          setActiveBottles((prev) => [
            ...prev,
            {
              id: item.index,
              type: item.type,
              spawnTimeMs: now,
              durationMs: item.speed,
              startXPercent: item.start_x,
              driftXPercent: (Math.random() - 0.5) * 20,
              peakYPercent: item.arc_height,
              isSliced: false,
            },
          ]);
        }
      });

      // Update particles
      particlesRef.current = particlesRef.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.3,
          life: p.life - 0.03,
        }))
        .filter((p) => p.life > 0);

      // Render swipe blade trail & particles on canvas
      renderCanvas();

      if (remaining <= 0) {
        finishGame(false, gId);
        return;
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  };

  // Render canvas swipe trail and particles
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw blade trail
    const now = Date.now();
    swipeTrailRef.current = swipeTrailRef.current.filter((pt) => now - pt.time < 220);

    const trail = swipeTrailRef.current;
    if (trail.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < trail.length; i++) {
        const pt = trail[i];
        const age = now - pt.time;
        const alpha = Math.max(0, 1 - age / 220);
        ctx.lineTo(pt.x, pt.y);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = Math.max(2, 6 * alpha);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#FFC93C';
        ctx.shadowBlur = 8;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    // 2. Draw coin particles
    particlesRef.current.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.type === 'coin' ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.shadowColor = '#FFC93C';
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    });
  };

  // Finish game and send results to server
  const finishGame = async (hitExpired: boolean, gId?: string) => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const targetGameId = gId || gameId;
    if (!targetGameId) return;

    if (hitExpired) {
      playLowBuzzer();
      setGameState('expired_flash');
    } else {
      playGameEndJingle();
    }

    try {
      const res = await fetch('/api/games/sip-slice/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: targetGameId,
          sliced_indices: slicedIndices,
          ended_early: hitExpired,
          ended_at_ms: Date.now() - gameStartTimeRef.current,
        }),
      });

      const data = await res.json();
      setTimeout(() => {
        setFinalResult({
          coins_won: data.coins_won ?? Math.max(1, score),
          bottles_sliced: data.bottles_sliced ?? slicedIndices.length,
          hit_expired: Boolean(hitExpired),
        });
        setGameState('game_over');
      }, hitExpired ? 800 : 400);
    } catch {
      setTimeout(() => {
        setFinalResult({
          coins_won: Math.max(1, score),
          bottles_sliced: slicedIndices.length,
          hit_expired: Boolean(hitExpired),
        });
        setGameState('game_over');
      }, 500);
    }
  };

  // Slice check when pointer moves across the screen
  const handlePointerSlice = (px: number, py: number) => {
    if (gameState !== 'playing' || hasFinishedRef.current) return;

    swipeTrailRef.current.push({ x: px, y: py, time: Date.now() });

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const now = Date.now();

    setActiveBottles((prev) =>
      prev.map((b) => {
        if (b.isSliced) return b;

        // Calculate bottle current position
        const t = (now - b.spawnTimeMs) / b.durationMs;
        if (t < 0 || t > 1) return b;

        const currentX = (b.startXPercent + b.driftXPercent * t) * (rect.width / 100);
        // Parabolic arc: 0 at start, peak at t=0.5, 0 at end
        const arcProgress = 4 * t * (1 - t);
        const currentY = rect.height - (b.peakYPercent * (rect.height / 100) * arcProgress) - 60;

        // Check distance to pointer (hitbox ~45px radius)
        const dx = px - currentX;
        const dy = py - currentY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 46) {
          // Sliced!
          playSliceShing();
          if (b.type === 'expired') {
            // Hit expired bottle!
            setSlicedIndices((prev) => [...prev, b.id]);
            setScore((s) => Math.max(1, s - 3));
            setTimeout(() => {
              finishGame(true);
            }, 50);
          } else {
            // Good bottle sliced
            playCoinCollectSound();
            const gain = b.type === 'gold' ? 3 : 1;
            setScore((s) => s + gain);
            setSlicedIndices((prev) => [...prev, b.id]);

            // Spawn bursting coin particles
            for (let i = 0; i < (b.type === 'gold' ? 6 : 4); i++) {
              particlesRef.current.push({
                id: Math.random(),
                x: px,
                y: py,
                vx: (Math.random() - 0.5) * 7,
                vy: -Math.random() * 5 - 2,
                life: 1,
                type: 'coin',
                color: b.type === 'gold' ? '#FFD700' : '#FFC93C',
              });
            }
          }

          return {
            ...b,
            isSliced: true,
            sliceX: px,
            sliceY: py,
          };
        }
        return b;
      })
    );
  };

  // Touch and Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isPointerDownRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    handlePointerSlice(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    handlePointerSlice(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleMouseUp = () => {
    isPointerDownRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    isPointerDownRef.current = true;
    if (e.touches.length > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const touch = e.touches[0];
      handlePointerSlice(touch.clientX - rect.left, touch.clientY - rect.top);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const touch = e.touches[0];
      handlePointerSlice(touch.clientX - rect.left, touch.clientY - rect.top);
    }
  };

  const handleTouchEnd = () => {
    isPointerDownRef.current = false;
  };

  // Keep canvas size synced with container
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (container && canvas) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  return (
    <main
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`fixed inset-0 w-full h-[100dvh] select-none overflow-hidden touch-none cursor-crosshair ${
        gameState === 'expired_flash' ? 'bg-red-700 animate-ping' : 'bg-gradient-to-b from-[#B92429] via-[#85161B] to-[#45090C]'
      }`}
    >
      {/* Canvas for swipe trails and coin sparks */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-30" />

      {/* TOP TIMER BAR & SCORE */}
      {gameState === 'playing' && (
        <div className="absolute top-0 left-0 right-0 z-40 flex flex-col p-4 pointer-events-none">
          {/* Top Thin Timer Bar */}
          <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/20 mb-2">
            <div
              className="h-full bg-[#FFC93C] rounded-full transition-all duration-75 ease-linear"
              style={{
                width: `${(gameTimeLeftMs / 30000) * 100}%`,
              }}
            />
          </div>

          <div className="flex justify-between items-center px-1">
            {/* Live Score Counter */}
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#FFC93C]/40 animate-scaleUp">
              <span className="text-[12px] font-extrabold text-white/80">COINS:</span>
              <span className="font-anton text-[22px] text-[#FFC93C] leading-none">
                +{score}
              </span>
            </div>

            {/* Time Left */}
            <div className="text-[14px] font-anton text-white/90">
              {(gameTimeLeftMs / 1000).toFixed(0)}s
            </div>
          </div>
        </div>
      )}

      {/* READY / SLICE COUNTDOWN OVERLAY */}
      {gameState === 'ready' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none">
          <h2 className="font-anton text-[84px] text-[#FFC93C] leading-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)] animate-bounce tracking-wide">
            {readyCountdown}
          </h2>
        </div>
      )}

      {/* EXPIRED HIT OVERLAY */}
      {gameState === 'expired_flash' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-900/90 pointer-events-none">
          <h2 className="font-anton text-[68px] text-white leading-none tracking-tight animate-bounce">
            EXPIRED!
          </h2>
          <span className="font-anton text-[24px] text-[#FFC93C] mt-2">
            -3 COINS
          </span>
        </div>
      )}

      {/* BOTTLES IN AIR */}
      {gameState === 'playing' &&
        activeBottles.map((b) => {
          const now = Date.now();
          const t = (now - b.spawnTimeMs) / b.durationMs;
          if (t < 0 || t > 1) return null;

          const arcProgress = 4 * t * (1 - t);
          const currentXPercent = b.startXPercent + b.driftXPercent * t;
          const currentYPercent = b.peakYPercent * arcProgress;
          const rotationDeg = (t - 0.5) * 60;

          if (b.isSliced) {
            // Sliced bottle splitting in two halves
            return (
              <div
                key={b.id}
                className="absolute pointer-events-none z-20"
                style={{
                  left: `${currentXPercent}%`,
                  bottom: `${currentYPercent}%`,
                  transform: 'translate(-50%, 50%)',
                }}
              >
                {/* Left Half falling and rotating */}
                <div
                  className="inline-block transition-transform duration-500 [clip-path:polygon(0_0,50%_0,30%_100%,0_100%)] animate-floatUp"
                  style={{
                    transform: 'translate(-25px, 20px) rotate(-45deg)',
                    opacity: 0.8,
                  }}
                >
                  <BottleSvg type={b.type} />
                </div>
                {/* Right Half falling opposite */}
                <div
                  className="inline-block transition-transform duration-500 [clip-path:polygon(50%_0,100%_0,100%_100%,30%_100%)] animate-floatUp"
                  style={{
                    transform: 'translate(25px, 20px) rotate(45deg)',
                    opacity: 0.8,
                  }}
                >
                  <BottleSvg type={b.type} />
                </div>
              </div>
            );
          }

          return (
            <div
              key={b.id}
              className="absolute pointer-events-none z-10 transition-transform duration-75"
              style={{
                left: `${currentXPercent}%`,
                bottom: `${currentYPercent}%`,
                transform: `translate(-50%, 50%) rotate(${rotationDeg}deg)`,
              }}
            >
              <BottleSvg type={b.type} />
            </div>
          );
        })}

      {/* ALREADY PLAYED TODAY OVERLAY */}
      {gameState === 'already_played' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-5 select-none animate-fadeIn">
          <div className="w-full max-w-[340px] bg-white rounded-[28px] p-7 shadow-2xl flex flex-col items-center text-center border-4 border-[#FFC93C]">
            <div className="w-16 h-16 rounded-full bg-[#8FC31F] flex items-center justify-center mb-3 shadow-md">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="font-anton text-[28px] text-[#B92429] leading-tight uppercase">
              DONE TODAY!
            </h2>
            <p className="text-[13px] font-bold text-[#7A4547] mt-1 mb-4">
              You have already played Sip Slice today. Next game unlocks at midnight IST:
            </p>

            <div className="bg-[#FFF5F3] border border-[#F4D2CF] rounded-[16px] px-5 py-3 mb-5 w-full">
              <span className="font-anton text-[24px] text-[#B92429]">
                {cooldownCountdown || 'Calculating...'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => router.push('/play')}
              className="w-full h-[52px] bg-[#B92429] text-[#FFC93C] font-anton text-[20px] uppercase rounded-[16px] shadow-lg cursor-pointer"
            >
              BACK TO PLAY
            </button>
          </div>
        </div>
      )}

      {/* RESULT SCREEN */}
      {gameState === 'game_over' && finalResult && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-5 select-none animate-fadeIn">
          <div className="w-full max-w-[340px] bg-white rounded-[28px] p-7 shadow-2xl flex flex-col items-center text-center relative border-4 border-[#FFC93C]">
            {/* Top Close X */}
            <button
              type="button"
              onClick={() => router.push('/home')}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#FFF5F3] text-[#7A4547] flex items-center justify-center font-bold text-lg hover:bg-[#FCE4E1] cursor-pointer"
            >
              ✕
            </button>

            {/* Title */}
            {finalResult.hit_expired ? (
              <h2 className="font-anton text-[30px] text-[#B92429] leading-none uppercase mb-1">
                EXPIRED BOTTLE!
              </h2>
            ) : (
              <h2 className="font-anton text-[30px] text-[#3D0B0E] leading-none uppercase mb-1">
                TIME&apos;S UP!
              </h2>
            )}

            <span className="text-[13px] font-extrabold text-[#7A4547] tracking-wider uppercase mb-3">
              {finalResult.bottles_sliced} BOTTLES SLICED
            </span>

            {/* Coin SVG */}
            <div className="my-2 animate-scaleUp">
              <svg width="72" height="72" viewBox="0 0 24 24" className="drop-shadow-lg">
                <circle cx="12" cy="12" r="11" fill="#FFC93C" />
                <circle cx="12" cy="12" r="7" fill="none" stroke="#B92429" strokeWidth="1.6" />
                <path
                  d="M12 6.5C12.35 10.2 13.8 11.65 17.5 12 13.8 12.35 12.35 13.8 12 17.5 11.65 13.8 10.2 12.35 6.5 12 10.2 11.65 11.65 10.2 12 6.5z"
                  fill="#B92429"
                />
              </svg>
            </div>

            <div className="font-anton text-[48px] text-[#FFC93C] leading-none -my-1 drop-shadow-[0_2px_4px_rgba(61,11,14,0.3)]">
              +{finalResult.coins_won}
            </div>

            <span className="font-anton text-[20px] text-[#B92429] uppercase tracking-wide mb-5">
              SIP COINS
            </span>

            <button
              type="button"
              onClick={() => router.push('/play')}
              className="w-full h-[54px] bg-[#FFC93C] hover:bg-[#FFE14D] text-[#3D0B0E] font-anton text-[22px] uppercase rounded-[16px] shadow-lg transition-all cursor-pointer flex items-center justify-center"
            >
              CONTINUE
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
