'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { CoinIcon } from '@/components/CoinIcon';
import { createClient } from '@/lib/supabase/client';
import { BottleType, BottleSpawn } from '@/lib/bottleTypes';
import {
  playSliceShing,
  playJuiceSplat,
  playGoldPling,
  playExpiredHit,
  playGameCompleteSound,
} from '@/lib/sound';

// Bottle SVG Component (~50px x ~90px)
function BottleSVG({ type }: { type: BottleType }) {
  if (type === 'mango') {
    return (
      <svg width="50" height="90" viewBox="0 0 50 90" fill="none">
        <rect x="19" y="3" width="12" height="6" rx="2" fill="#8FC31F" />
        <rect x="22" y="9" width="6" height="8" rx="1" fill="#CDEE1C" />
        <path
          d="M16 17H34C39 17 43 21 43 26V75C43 82 39 86 33 86H17C11 86 7 82 7 75V26C7 21 11 17 16 17Z"
          fill="#CDEE1C"
        />
        <circle cx="25" cy="50" r="13" fill="#8FC31F" />
        <text
          x="25"
          y="56"
          fill="white"
          fontFamily="Arial, sans-serif"
          fontWeight="900"
          fontSize="16"
          textAnchor="middle"
        >
          M
        </text>
      </svg>
    );
  }

  if (type === 'pineapple') {
    return (
      <svg width="50" height="90" viewBox="0 0 50 90" fill="none">
        <rect x="19" y="3" width="12" height="6" rx="2" fill="#F5B800" />
        <rect x="22" y="9" width="6" height="8" rx="1" fill="#FFE14D" />
        <path
          d="M16 17H34C39 17 43 21 43 26V75C43 82 39 86 33 86H17C11 86 7 82 7 75V26C7 21 11 17 16 17Z"
          fill="#FFE14D"
        />
        <circle cx="25" cy="50" r="13" fill="#F5B800" />
        <text
          x="25"
          y="56"
          fill="white"
          fontFamily="Arial, sans-serif"
          fontWeight="900"
          fontSize="16"
          textAnchor="middle"
        >
          P
        </text>
      </svg>
    );
  }

  if (type === 'gold') {
    return (
      <svg width="50" height="90" viewBox="0 0 50 90" fill="none" className="drop-shadow-[0_0_12px_#FFC93C]">
        <rect x="19" y="3" width="12" height="6" rx="2" fill="#B8860B" />
        <rect x="22" y="9" width="6" height="8" rx="1" fill="#FFC93C" />
        <path
          d="M16 17H34C39 17 43 21 43 26V75C43 82 39 86 33 86H17C11 86 7 82 7 75V26C7 21 11 17 16 17Z"
          fill="#FFC93C"
        />
        <circle cx="25" cy="50" r="13" fill="#B8860B" />
        <polygon
          points="25,40 27.5,46 34,47 29,51.5 30.5,58 25,54.5 19.5,58 21,51.5 16,47 22.5,46"
          fill="#FFC93C"
        />
      </svg>
    );
  }

  // Expired bottle
  return (
    <svg width="50" height="90" viewBox="0 0 50 90" fill="none">
      <rect x="19" y="3" width="12" height="6" rx="2" fill="#555555" />
      <rect x="22" y="9" width="6" height="8" rx="1" fill="#808080" />
      <path
        d="M16 17H34C39 17 43 21 43 26V75C43 82 39 86 33 86H17C11 86 7 82 7 75V26C7 21 11 17 16 17Z"
        fill="#808080"
      />
      <path d="M12 30L26 44L17 58M38 48L24 64L32 78" stroke="#333333" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="25" cy="50" r="13" fill="#555555" />
      <text
        x="25"
        y="56"
        fill="#B92429"
        fontFamily="Arial, sans-serif"
        fontWeight="900"
        fontSize="18"
        textAnchor="middle"
      >
        ✕
      </text>
    </svg>
  );
}

// Slice particle definitions
interface SlicedHalf {
  id: number;
  type: BottleType;
  x: number;
  y: number;
  angle: number;
}

interface JuiceDroplet {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
}

interface ScorePop {
  id: number;
  text: string;
  x: number;
  y: number;
}

interface ActiveBottlePhysics {
  index: number;
  type: BottleType;
  x: number;
  y: number;
  rotation: number;
  isAlive: boolean;
}

// Geometry helper: distance from point (px, py) to line segment (x1, y1)-(x2, y2)
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export default function SipSlicePage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number>(0);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'already_played' | 'game_over'>('intro');

  const [gameId, setGameId] = useState<string | null>(null);
  const [bottles, setBottles] = useState<BottleSpawn[]>([]);
  const [score, setScore] = useState<number>(0);
  const [coinsWon, setCoinsWon] = useState<number>(0);
  const [timeLeftMs, setTimeLeftMs] = useState<number>(30000);
  const [hitExpired, setHitExpired] = useState<boolean>(false);
  const [comboText, setComboText] = useState<string | null>(null);

  // Sliced state
  const [slicedHalves, setSlicedHalves] = useState<SlicedHalf[]>([]);
  const [droplets, setDroplets] = useState<JuiceDroplet[]>([]);
  const [scorePops, setScorePops] = useState<ScorePop[]>([]);
  const [screenFlashRed, setScreenFlashRed] = useState<boolean>(false);
  const [expiredBanner, setExpiredBanner] = useState<boolean>(false);

  // Today score for already played view
  const [todayResult, setTodayResult] = useState<{ sliced: number; total: number; coins: number } | null>(null);
  const [cooldownText, setCooldownText] = useState<string>('');

  // Refs for requestAnimationFrame physics and swipe canvas
  const gameAreaRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const gameStartTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const slicedIndicesRef = useRef<Set<number>>(new Set());
  const activePositionsRef = useRef<Map<number, ActiveBottlePhysics>>(new Map());

  // Swipe trail tracking
  const isSwipingRef = useRef<boolean>(false);
  const swipePointsRef = useRef<{ x: number; y: number; time: number }[]>([]);
  const swipeSlicedCountRef = useRef<number>(0);
  const dimensionsRef = useRef<{ width: number; height: number }>({ width: 390, height: 750 });

  // Update cooldown countdown
  useEffect(() => {
    function updateCountdown() {
      const now = new Date();
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.getTime() + istOffsetMs);
      const istNextMidnightUTC = new Date(
        Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() + 1, 0, 0, 0)
      );
      const diff = Math.max(0, istNextMidnightUTC.getTime() - istOffsetMs - now.getTime());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setCooldownText(`${h}h ${m}m`);
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  // Update canvas size on resize
  useEffect(() => {
    const updateSize = () => {
      if (gameAreaRef.current && canvasRef.current) {
        const rect = gameAreaRef.current.getBoundingClientRect();
        dimensionsRef.current = { width: rect.width, height: rect.height };
        canvasRef.current.width = rect.width;
        canvasRef.current.height = rect.height;
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Init auth check & balance
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/');
        return;
      }
      fetch('/api/balance')
        .then((res) => res.json())
        .then((d) => {
          if (d.balance !== undefined) setBalance(d.balance);
        })
        .catch(() => {});
    });
  }, [router]);

  // End Game handler
  const handleEndGame = useCallback(
    async (isExpiredHit = false) => {
      if (!isPlayingRef.current) return;
      isPlayingRef.current = false;

      const elapsedMs = Date.now() - gameStartTimeRef.current;
      const slicedArray = Array.from(slicedIndicesRef.current);

      if (isExpiredHit) {
        setHitExpired(true);
        setScreenFlashRed(true);
        setExpiredBanner(true);
        playExpiredHit();
        setTimeout(() => setScreenFlashRed(false), 250);
      }

      try {
        const res = await fetch('/api/games/sip-slice/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game_id: gameId,
            sliced_indices: slicedArray,
            hit_expired: isExpiredHit,
            ended_at_ms: elapsedMs,
          }),
        });

        const data = await res.json();
        const won = data.coins_won || (isExpiredHit ? 1 : Math.max(1, score));
        setCoinsWon(won);
        setBalance((b) => b + won);

        setTimeout(
          () => {
            playGameCompleteSound();
            setGameState('game_over');
          },
          isExpiredHit ? 1100 : 400
        );
      } catch {
        setCoinsWon(1);
        setTimeout(
          () => {
            playGameCompleteSound();
            setGameState('game_over');
          },
          isExpiredHit ? 1100 : 400
        );
      }
    },
    [gameId, score]
  );

  // Start the 30s game round
  const handleStartGame = async () => {
    try {
      const res = await fetch('/api/games/sip-slice/start', { method: 'POST' });
      if (res.status === 409) {
        const data = await res.json();
        setTodayResult({
          sliced: data.bottles_sliced || 0,
          total: data.total_bottles || 20,
          coins: data.coins_won || 0,
        });
        setGameState('already_played');
        return;
      }
      if (!res.ok) {
        router.push('/play');
        return;
      }

      const data = await res.json();
      setGameId(data.game_id);
      setBottles(data.bottles);
      setScore(0);
      setTimeLeftMs(30000);
      setHitExpired(false);
      setExpiredBanner(false);
      setSlicedHalves([]);
      setDroplets([]);
      setScorePops([]);
      slicedIndicesRef.current = new Set();
      activePositionsRef.current.clear();

      isPlayingRef.current = true;
      gameStartTimeRef.current = Date.now();
      setGameState('playing');
    } catch {
      router.push('/play');
    }
  };

  // Slice Bottle Action
  const sliceBottle = useCallback(
    (bottle: ActiveBottlePhysics, angleDeg: number) => {
      if (!isPlayingRef.current) return;
      if (slicedIndicesRef.current.has(bottle.index)) return;

      slicedIndicesRef.current.add(bottle.index);
      swipeSlicedCountRef.current += 1;

      // Slice sounds
      playSliceShing();
      playJuiceSplat();
      if (bottle.type === 'gold') playGoldPling();

      // Combo check
      if (swipeSlicedCountRef.current >= 2) {
        setComboText(`COMBO x${swipeSlicedCountRef.current}!`);
        setTimeout(() => setComboText(null), 700);
      }

      // Add score
      let delta = 1;
      if (bottle.type === 'gold') delta = 3;
      else if (bottle.type === 'expired') delta = -3;
      setScore((s) => Math.max(0, s + delta));

      // Sliced Halves
      const halfId = Date.now() + Math.random();
      setSlicedHalves((prev) => [
        ...prev,
        {
          id: halfId,
          type: bottle.type,
          x: bottle.x,
          y: bottle.y,
          angle: angleDeg,
        },
      ]);
      setTimeout(() => {
        setSlicedHalves((prev) => prev.filter((h) => h.id !== halfId));
      }, 500);

      // Juice Splash Droplets
      let dropletColor = '#CDEE1C';
      if (bottle.type === 'pineapple') dropletColor = '#FFE14D';
      else if (bottle.type === 'gold') dropletColor = '#FFC93C';
      else if (bottle.type === 'expired') dropletColor = '#555555';

      const newDroplets: JuiceDroplet[] = [];
      const dropletCount = 10;
      for (let i = 0; i < dropletCount; i++) {
        const rad = Math.random() * Math.PI * 2;
        const speed = 25 + Math.random() * 55;
        newDroplets.push({
          id: Date.now() + Math.random() + i,
          x: bottle.x + 25,
          y: bottle.y + 45,
          dx: Math.cos(rad) * speed,
          dy: Math.sin(rad) * speed + 20, // gravity drift
          size: 4 + Math.floor(Math.random() * 5),
          color: dropletColor,
        });
      }
      setDroplets((prev) => [...prev, ...newDroplets]);
      setTimeout(() => {
        setDroplets((prev) => prev.filter((d) => !newDroplets.some((nd) => nd.id === d.id)));
      }, 400);

      // Score Pop
      const popText = delta > 0 ? `+${delta}` : `${delta}`;
      const popId = Date.now() + Math.random();
      setScorePops((prev) => [
        ...prev,
        {
          id: popId,
          text: popText,
          x: bottle.x + 25,
          y: bottle.y + 45,
        },
      ]);
      setTimeout(() => {
        setScorePops((prev) => prev.filter((p) => p.id !== popId));
      }, 500);

      // Expired bottle ends game immediately!
      if (bottle.type === 'expired') {
        handleEndGame(true);
      }
    },
    [handleEndGame]
  );

  // Swipe Hit Detection on Move
  const processSwipeSegment = useCallback(
    (x1: number, y1: number, x2: number, y2: number) => {
      if (!isPlayingRef.current) return;

      const angleDeg = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

      activePositionsRef.current.forEach((bottle) => {
        if (!bottle.isAlive || slicedIndicesRef.current.has(bottle.index)) return;

        // Bottle center is ~25px from left, 45px from top
        const cx = bottle.x + 25;
        const cy = bottle.y + 45;
        const dist = distToSegment(cx, cy, x1, y1, x2, y2);

        // Responsive hit radius
        if (dist <= 36) {
          sliceBottle(bottle, angleDeg);
        }
      });
    },
    [sliceBottle]
  );

  // Touch / Mouse event handlers
  const handlePointerDown = (clientX: number, clientY: number) => {
    if (!gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    isSwipingRef.current = true;
    swipeSlicedCountRef.current = 0;
    swipePointsRef.current = [{ x, y, time: Date.now() }];
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isSwipingRef.current || !gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const points = swipePointsRef.current;
    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      processSwipeSegment(lastPoint.x, lastPoint.y, x, y);
    }

    points.push({ x, y, time: Date.now() });
  };

  const handlePointerUp = () => {
    isSwipingRef.current = false;
  };

  // requestAnimationFrame Loop for Physics & Trail
  useEffect(() => {
    if (gameState !== 'playing') {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    const updatePhysicsAndRender = () => {
      if (!isPlayingRef.current) return;

      const now = Date.now();
      const elapsed = now - gameStartTimeRef.current;
      const remaining = Math.max(0, 30000 - elapsed);
      setTimeLeftMs(remaining);

      if (remaining <= 0) {
        handleEndGame(false);
        return;
      }

      const { width, height } = dimensionsRef.current;
      const startY = height + 60; // below screen

      // 1. Calculate parabolic position for each bottle
      bottles.forEach((b) => {
        if (slicedIndicesRef.current.has(b.index)) {
          activePositionsRef.current.delete(b.index);
          return;
        }

        const tElapsed = elapsed - b.appear_at_ms;
        if (tElapsed < 0 || tElapsed > b.flight_duration_ms) {
          activePositionsRef.current.delete(b.index);
          return;
        }

        const t = tElapsed / 1000;
        const T = b.flight_duration_ms / 1000;
        const tPeak = T / 2;
        const peakY = height * b.peak_height_percent;
        const deltaH = startY - peakY;
        const g = (2 * deltaH) / (tPeak * tPeak);
        const vy0 = -g * tPeak;

        // Kinematics: y = y0 + vy0*t + 0.5*g*t^2
        const y = startY + vy0 * t + 0.5 * g * t * t;
        const startX = width * b.start_x_percent;
        const x = startX + b.drift_x * (t / T);
        const rotation = b.initial_rotation + b.rotation_speed * t;

        activePositionsRef.current.set(b.index, {
          index: b.index,
          type: b.type,
          x,
          y,
          rotation,
          isAlive: true,
        });
      });

      // 2. Draw swipe trail on Canvas
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Keep points newer than 200ms
        const recentPoints = swipePointsRef.current.filter((p) => now - p.time < 200);
        swipePointsRef.current = recentPoints;

        if (recentPoints.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(recentPoints[0].x, recentPoints[0].y);
          for (let i = 1; i < recentPoints.length; i++) {
            ctx.lineTo(recentPoints[i].x, recentPoints[i].y);
          }
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
          ctx.shadowBlur = 8;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      // Force render frame
      animFrameRef.current = requestAnimationFrame(updatePhysicsAndRender);
    };

    animFrameRef.current = requestAnimationFrame(updatePhysicsAndRender);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, bottles, handleEndGame]);

  return (
    <main className="min-h-[100dvh] w-full max-w-[430px] mx-auto bg-[#B92429] text-white flex flex-col justify-between select-none relative overflow-hidden shadow-2xl">
      <style jsx global>{`
        @keyframes splitLeft {
          0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(-45px, 75px) rotate(-35deg);
            opacity: 0;
          }
        }
        @keyframes splitRight {
          0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(45px, 75px) rotate(35deg);
            opacity: 0;
          }
        }
        @keyframes dropletFly {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--dx), var(--dy)) scale(0.3);
            opacity: 0;
          }
        }
        @keyframes scoreFloat {
          0% {
            transform: translate(-50%, -50%) translateY(0);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) translateY(-40px);
            opacity: 0;
          }
        }
        @keyframes coinBounce {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          65% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>

      {/* VIEW 1: INTRO SCREEN */}
      {gameState === 'intro' && (
        <div className="flex flex-col justify-between h-full min-h-[100dvh] w-full">
          {/* Header */}
          <div className="w-full">
            <Header
              variant="red"
              rightElement={
                <div className="bg-white/15 rounded-full px-3 py-1 flex items-center gap-1.5 shadow-sm border border-white/20">
                  <CoinIcon size={18} />
                  <span className="font-anton text-[14px] text-[#FFC93C]">{balance}</span>
                </div>
              }
            />

            {/* Back link & Title */}
            <div className="px-5 pt-1">
              <Link
                href="/play"
                className="inline-flex items-center gap-1.5 text-white/90 hover:text-white font-montserrat font-bold text-[13px] tracking-wide mb-2 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M15 19l-7-7 7-7" />
                </svg>
                BACK TO PLAY
              </Link>
              <h1 className="text-[38px] font-anton text-white leading-none uppercase tracking-wide">
                SIP SLICE
              </h1>
              <p className="text-[14px] font-medium text-white/90 mt-1">
                Slice the bottles! 1 play per day
              </p>
            </div>
          </div>

          {/* Hero Illustrated Area */}
          <div className="my-auto flex flex-col items-center justify-center px-6 text-center">
            <div className="relative mb-6">
              <div className="flex items-center gap-3">
                <div className="rotate-[-15deg] animate-bounce">
                  <BottleSVG type="mango" />
                </div>
                <div className="rotate-[12deg] animate-pulse">
                  <BottleSVG type="gold" />
                </div>
                <div className="rotate-[20deg] animate-bounce">
                  <BottleSVG type="pineapple" />
                </div>
              </div>
            </div>

            <div className="bg-[#7A1418] border border-white/20 rounded-[20px] p-5 w-full max-w-[320px] shadow-lg mb-4 text-left">
              <span className="font-anton text-[16px] text-[#FFC93C] uppercase tracking-wide block mb-2">
                HOW TO PLAY
              </span>
              <ul className="text-[13px] font-bold text-white/90 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#CDEE1C]" />
                  Swipe across bottles to slice (+1 coin)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FFC93C]" />
                  Rare Gold bottles are worth +3 coins!
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#808080]" />
                  DODGE Grey Expired bottles (-3 &amp; game over)
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleStartGame}
              className="w-full max-w-[320px] h-[58px] bg-[#FFC93C] hover:bg-[#FFE14D] text-[#3D0B0E] font-anton text-[22px] uppercase rounded-[16px] shadow-xl transition-all cursor-pointer flex items-center justify-center tracking-wide"
            >
              START
            </button>
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 text-center text-[12px] font-bold text-white/70">
            Zee Sip Fast Reflex Challenge · 30 Seconds
          </div>
        </div>
      )}

      {/* VIEW 2: FULL-SCREEN GAMEPLAY AREA */}
      {gameState === 'playing' && (
        <div
          ref={gameAreaRef}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            handlePointerDown(touch.clientX, touch.clientY);
          }}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            handlePointerMove(touch.clientX, touch.clientY);
          }}
          onTouchEnd={handlePointerUp}
          onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
          onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
          onMouseUp={handlePointerUp}
          style={{ touchAction: 'none' }}
          className="fixed inset-0 w-full h-[100dvh] bg-gradient-to-b from-[#3D0B0E] via-[#85161B] to-[#B92429] overflow-hidden select-none touch-none cursor-crosshair z-40"
        >
          {/* Top Thin Gold Timer Bar */}
          <div className="absolute top-0 left-0 right-0 z-50 p-3 pointer-events-none">
            <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/20 mb-2">
              <div
                className="h-full bg-[#FFC93C] rounded-full transition-all duration-75 ease-linear"
                style={{ width: `${(timeLeftMs / 30000) * 100}%` }}
              />
            </div>

            {/* Top Bar: Score & Seconds */}
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3.5 py-1 rounded-full border border-[#FFC93C]/40">
                <span className="text-[11px] font-extrabold text-white/80">SCORE:</span>
                <span className="font-anton text-[22px] text-[#FFC93C] leading-none">
                  +{score}
                </span>
              </div>
              <div className="font-anton text-[16px] text-white/90 bg-black/30 px-3 py-1 rounded-full">
                {(timeLeftMs / 1000).toFixed(0)}s
              </div>
            </div>
          </div>

          {/* Canvas for Swipe Trail */}
          <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-30" />

          {/* Red Flash Overlay when Expired is hit */}
          {screenFlashRed && (
            <div className="absolute inset-0 bg-red-600/60 z-50 pointer-events-none animate-ping" />
          )}

          {/* Expired Banner */}
          {expiredBanner && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
              <h2 className="font-anton text-[48px] text-[#FF4D4D] leading-none drop-shadow-lg tracking-wide animate-bounce">
                EXPIRED!
              </h2>
              <span className="font-anton text-[20px] text-[#FFC93C] mt-2">
                -3 COINS
              </span>
            </div>
          )}

          {/* Combo Indicator */}
          {comboText && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-bounce font-anton text-[28px] text-[#FFC93C] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {comboText}
            </div>
          )}

          {/* Active Flying Bottles (Positioned via kinematic calculations) */}
          {bottles.map((b) => {
            if (slicedIndicesRef.current.has(b.index)) return null;
            const pos = activePositionsRef.current.get(b.index);
            if (!pos) return null;

            return (
              <div
                key={b.index}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  transform: `translate3d(${pos.x}px, ${pos.y}px, 0) rotate(${pos.rotation}deg)`,
                  width: '50px',
                  height: '90px',
                }}
                className="pointer-events-none will-change-transform"
              >
                <BottleSVG type={b.type} />
              </div>
            );
          })}

          {/* Sliced Halves separating along swipe angle */}
          {slicedHalves.map((h) => (
            <div
              key={h.id}
              style={{
                position: 'absolute',
                left: `${h.x}px`,
                top: `${h.y}px`,
                width: '50px',
                height: '90px',
              }}
              className="pointer-events-none"
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  clipPath: 'polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)',
                  animation: 'splitLeft 0.5s ease-out forwards',
                }}
              >
                <BottleSVG type={h.type} />
              </div>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)',
                  animation: 'splitRight 0.5s ease-out forwards',
                }}
              >
                <BottleSVG type={h.type} />
              </div>
            </div>
          ))}

          {/* Juice Droplets exploding outward */}
          {droplets.map((d) => (
            <div
              key={d.id}
              style={
                {
                  position: 'absolute',
                  left: `${d.x}px`,
                  top: `${d.y}px`,
                  width: `${d.size}px`,
                  height: `${d.size}px`,
                  borderRadius: '50%',
                  backgroundColor: d.color,
                  animation: 'dropletFly 0.4s ease-out forwards',
                  '--dx': `${d.dx}px`,
                  '--dy': `${d.dy}px`,
                } as React.CSSProperties
              }
              className="pointer-events-none"
            />
          ))}

          {/* Floating Score Pops */}
          {scorePops.map((sp) => (
            <div
              key={sp.id}
              style={{
                position: 'absolute',
                left: `${sp.x}px`,
                top: `${sp.y}px`,
                animation: 'scoreFloat 0.5s ease-out forwards',
              }}
              className={`font-anton text-[26px] select-none pointer-events-none drop-shadow-md ${
                sp.text.startsWith('-') ? 'text-[#FF4D4D]' : 'text-[#FFC93C]'
              }`}
            >
              {sp.text}
            </div>
          ))}
        </div>
      )}

      {/* VIEW 3: ALREADY PLAYED TODAY */}
      {gameState === 'already_played' && (
        <div className="flex flex-col justify-between h-full min-h-[100dvh] w-full p-5">
          <div className="w-full">
            <Header variant="red" />
            <Link
              href="/play"
              className="inline-flex items-center gap-1.5 text-white/90 hover:text-white font-montserrat font-bold text-[13px] tracking-wide mt-2 mb-4"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 19l-7-7 7-7" />
              </svg>
              BACK TO PLAY
            </Link>
          </div>

          <div className="my-auto w-full max-w-[340px] mx-auto bg-white rounded-[24px] p-7 shadow-2xl flex flex-col items-center text-center border-4 border-[#FFC93C]">
            <h2 className="font-anton text-[28px] text-[#B92429] uppercase leading-tight mb-2">
              DONE TODAY!
            </h2>
            <p className="text-[14px] font-bold text-[#7A4547] mb-4">
              Bottles sliced: {todayResult?.sliced ?? 0}/{todayResult?.total ?? 20} — earned +{todayResult?.coins ?? 0} coins
            </p>

            <div className="bg-[#FFF5F3] border border-[#F4D2CF] rounded-[16px] px-4 py-3 mb-5 w-full">
              <span className="text-[12px] font-bold text-[#7A4547] block mb-1">
                Next game unlocks in
              </span>
              <span className="font-anton text-[24px] text-[#B92429]">
                {cooldownText || 'Calculating...'}
              </span>
            </div>

            <button
              type="button"
              disabled
              className="w-full h-[52px] bg-gray-200 text-gray-500 font-anton text-[18px] uppercase rounded-[16px] cursor-not-allowed mb-3 tracking-wide"
            >
              COME BACK TOMORROW
            </button>

            <Link
              href="/play"
              className="text-[#B92429] font-montserrat font-bold text-[13px] underline tracking-wide"
            >
              ← BACK TO PLAY
            </Link>
          </div>

          <div className="pb-5 text-center text-[12px] font-bold text-white/70">
            Zee Sip Fast Reflex Challenge · 1 play per day
          </div>
        </div>
      )}

      {/* VIEW 4: RESULT SCREEN */}
      {gameState === 'game_over' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-5 select-none animate-fadeIn">
          <div className="w-full max-w-[340px] bg-white rounded-[24px] p-7 shadow-2xl flex flex-col items-center text-center relative border-4 border-[#FFC93C]">
            {/* Top Close X -> /home */}
            <button
              type="button"
              onClick={() => router.push('/home')}
              aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#FFF5F3] text-[#7A4547] flex items-center justify-center font-bold text-base hover:bg-[#FCE4E1] cursor-pointer"
            >
              ✕
            </button>

            <h2 className="font-anton text-[28px] text-[#B92429] leading-tight uppercase mb-1">
              {hitExpired ? 'OOPS — EXPIRED BOTTLE!' : "TIME'S UP!"}
            </h2>

            <span className="text-[13px] font-bold text-[#7A4547] mb-3">
              Bottles sliced: {slicedIndicesRef.current.size}/{bottles.length}
            </span>

            {/* Coin SVG with Bounce Animation */}
            <div
              style={{
                animation: 'coinBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
              }}
              className="my-1.5 flex items-center justify-center"
            >
              <svg width="70" height="70" viewBox="0 0 24 24" className="drop-shadow-lg">
                <circle cx="12" cy="12" r="11" fill="#FFC93C" />
                <circle cx="12" cy="12" r="7.5" fill="none" stroke="#B92429" strokeWidth="1.6" />
                <polygon
                  points="12,5 13.8,9.5 18.5,10.2 15,13.5 16,18.2 12,15.8 8,18.2 9,13.5 5.5,10.2 10.2,9.5"
                  fill="#B92429"
                />
              </svg>
            </div>

            {/* +Z SIP COINS in gold Anton 48px */}
            <div className="font-anton text-[48px] text-[#FFC93C] leading-none drop-shadow-[0_2px_4px_rgba(61,11,14,0.3)] my-1">
              +{coinsWon}
            </div>

            <span className="font-anton text-[20px] text-[#B92429] uppercase tracking-wide mb-3">
              SIP COINS
            </span>

            {/* Progress Bar below: Total X / 500 coins */}
            <div className="w-full mb-3 px-1">
              <div className="flex justify-between items-center text-[12px] font-bold text-[#3D0B0E] mb-1">
                <span>Total: {balance} / 500 coins</span>
                <span className="text-[#7A4547]">
                  {Math.max(0, 500 - balance)} needed
                </span>
              </div>
              <div className="w-full h-3 bg-[#FFF5F3] rounded-full border border-[#F4D2CF] overflow-hidden">
                <div
                  className="h-full bg-[#FFC93C] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(100, (balance / 500) * 100)}%` }}
                />
              </div>
            </div>

            <span className="text-[12px] font-bold text-[#7A4547] mb-4">
              Next game in {cooldownText}
            </span>

            {/* CONTINUE Button -> /play */}
            <button
              type="button"
              onClick={() => router.push('/play')}
              className="w-full h-[54px] bg-[#B92429] hover:bg-[#A31F24] text-white font-anton text-[20px] uppercase rounded-[16px] shadow-lg transition-all cursor-pointer flex items-center justify-center tracking-wide"
            >
              CONTINUE
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
