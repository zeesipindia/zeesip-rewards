'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CoinIcon } from '@/components/CoinIcon';
import { createClient } from '@/lib/supabase/client';
import { ItemType, ItemSpawn } from '@/lib/bottleTypes';
import {
  initAudioContext,
  playFruitSwoosh,
  playFruitSliceHit,
  playFruitJuiceSplash,
  playComboBonus,
  playBombExplosion,
  playTimerWarningTick,
} from '@/lib/sound';

interface ActiveItem {
  index: number;
  type: ItemType;
  appearAtMs: number;
  startX: number;
  startY: number;
  peakY: number;
  vx: number;
  vy0: number;
  gravity: number;
  rotSpeed: number;
  initialRot: number;
  flightDuration: number;
  x: number;
  y: number;
  rotation: number;
  isSliced: boolean;
  isRemoved: boolean;
}

interface ItemHalf {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  side: 'left' | 'right';
  sliceAngle: number;
  vx: number;
  vy: number;
  rot: number;
  rotSpeed: number;
  createdAt: number;
}

interface JuiceDroplet {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  lightColor: string;
  darkColor: string;
  vx: number;
  vy: number;
  createdAt: number;
}

interface JuiceSplat {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  borderRadius: string;
  rotation: number;
  createdAt: number;
}

interface ScorePop {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  createdAt: number;
}

interface BombExplosionEffect {
  id: string;
  x: number;
  y: number;
  createdAt: number;
}

interface TrailPoint {
  x: number;
  y: number;
  time: number;
}

type GameState =
  | 'loading'
  | 'start'
  | 'countdown'
  | 'playing'
  | 'paused'
  | 'times_up'
  | 'result'
  | 'already_played';

// -------------------------------------------------------------
// SVG RENDERING: PINEAPPLE, GREEN MANGO, CLASSIC BOMB
// -------------------------------------------------------------
function FruitGraphic({
  type,
  clipSide,
}: {
  type: ItemType;
  clipSide?: 'left' | 'right';
}) {
  if (type === 'pineapple') {
    return (
      <div
        className="relative w-[50px] h-[75px] select-none pointer-events-none"
        style={{
          clipPath:
            clipSide === 'left'
              ? 'polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)'
              : clipSide === 'right'
              ? 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)'
              : undefined,
        }}
      >
        <svg
          width="50"
          height="75"
          viewBox="0 0 50 75"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          {/* Spiky Green Crown (5-7 spikes) */}
          <g>
            <polygon points="25,2 20,18 25,15 30,18" fill="#1B5E20" />
            <polygon points="17,6 15,20 22,17" fill="#2E7D32" />
            <polygon points="33,6 28,17 35,20" fill="#2E7D32" />
            <polygon points="12,12 12,22 19,19" fill="#388E3C" />
            <polygon points="38,12 31,19 38,22" fill="#388E3C" />
            <polygon points="25,5 21,20 25,18 29,20" fill="#4CAF50" />
          </g>

          {/* Oval Golden-Yellow Body */}
          <ellipse cx="25" cy="45" rx="20" ry="26" fill="#FFD700" stroke="#E6A800" strokeWidth="1.5" />

          {/* Diamond Crosshatch Pattern */}
          <g stroke="#C68A00" strokeWidth="1.2" opacity="0.8" strokeLinecap="round">
            <line x1="14" y1="30" x2="36" y2="60" />
            <line x1="9" y1="40" x2="31" y2="68" />
            <line x1="20" y1="24" x2="41" y2="52" />
            <line x1="36" y1="30" x2="14" y2="60" />
            <line x1="41" y1="40" x2="19" y2="68" />
            <line x1="30" y1="24" x2="9" y2="52" />
          </g>

          {/* If sliced half, render inside juicy flesh */}
          {clipSide && (
            <ellipse cx="25" cy="45" rx="16" ry="21" fill="#FFF176" stroke="#FFEE58" strokeWidth="2" />
          )}
          {clipSide && (
            <ellipse cx="25" cy="45" rx="7" ry="11" fill="#FFFDE7" />
          )}
        </svg>
      </div>
    );
  }

  if (type === 'mango') {
    return (
      <div
        className="relative w-[50px] h-[60px] select-none pointer-events-none"
        style={{
          clipPath:
            clipSide === 'left'
              ? 'polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)'
              : clipSide === 'right'
              ? 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)'
              : undefined,
        }}
      >
        <svg
          width="50"
          height="60"
          viewBox="0 0 50 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          {/* Stem and Tiny Leaf */}
          <path d="M 24 10 C 23 5, 27 2, 28 0" stroke="#5D4037" strokeWidth="2" strokeLinecap="round" />
          <path d="M 26 5 C 32 4, 34 8, 32 10 C 29 11, 27 8, 26 5 Z" fill="#4CAF50" />

          {/* Curved Raw Green Mango Body */}
          <path
            d="M 25 8 C 38 8, 46 22, 44 38 C 42 50, 32 58, 22 58 C 12 58, 6 48, 8 34 C 10 20, 16 8, 25 8 Z"
            fill="url(#mangoGrad)"
            stroke="#558B2F"
            strokeWidth="1.5"
          />

          <defs>
            <linearGradient id="mangoGrad" x1="10" y1="12" x2="42" y2="52" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#9CCC65" />
              <stop offset="60%" stopColor="#8BC34A" />
              <stop offset="100%" stopColor="#689F38" />
            </linearGradient>
          </defs>

          {/* Inside flesh when sliced */}
          {clipSide && (
            <path
              d="M 25 14 C 35 14, 40 24, 38 37 C 36 46, 29 52, 22 52 C 14 52, 10 44, 12 33 C 14 22, 18 14, 25 14 Z"
              fill="#E8F5E9"
              stroke="#C8E6C9"
              strokeWidth="2"
            />
          )}
          {clipSide && (
            <ellipse cx="24" cy="34" rx="5" ry="10" fill="#FFFFFF" opacity="0.9" />
          )}
        </svg>
      </div>
    );
  }

  // Classic Round Black Bomb
  return (
    <div className="relative w-[56px] h-[66px] select-none pointer-events-none">
      <svg
        width="56"
        height="66"
        viewBox="0 0 56 66"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        {/* Animated Flickering Flame at Fuse Tip */}
        <circle cx="36" cy="6" r="4.5" className="animate-ping" fill="#FF4500" opacity="0.8" />
        <circle cx="36" cy="6" r="3" fill="#FFD700" />

        {/* Curved Fuse */}
        <path d="M 28 17 C 29 11, 33 9, 36 6" stroke="#8D6E63" strokeWidth="2.5" strokeLinecap="round" />

        {/* Bomb Cap Neck */}
        <rect x="23" y="16" width="10" height="5" rx="1.5" fill="#37474F" />

        {/* Round Metallic Charcoal Bomb Body */}
        <circle cx="28" cy="40" r="23" fill="url(#bombGrad)" stroke="#111111" strokeWidth="1.5" />

        {/* Subtle Metallic Highlight Reflection */}
        <ellipse cx="21" cy="31" rx="5" ry="3" fill="white" opacity="0.3" transform="rotate(-30 21 31)" />

        <defs>
          <radialGradient id="bombGrad" cx="35%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#455A64" />
            <stop offset="45%" stopColor="#263238" />
            <stop offset="100%" stopColor="#101416" />
          </radialGradient>
        </defs>
      </svg>

      {/* Drifting smoke wisps */}
      <div className="absolute top-0 right-2 w-2 h-2 rounded-full bg-gray-400/50 animate-pulse" />
      <div className="absolute -top-2 right-4 w-1.5 h-1.5 rounded-full bg-gray-300/40 animate-ping" />
    </div>
  );
}

export default function SipSlicePage() {
  const router = useRouter();

  // Screen & Orientation States
  const [isPortrait, setIsPortrait] = useState(false);
  const [gameState, setGameState] = useState<GameState>('loading');
  const [countdownNum, setCountdownNum] = useState<number | string>(3);
  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [isScreenRed, setIsScreenRed] = useState(false);
  const [comboBanner, setComboBanner] = useState<{ count: number; id: number } | null>(null);

  // Results State
  const [resultData, setResultData] = useState<{
    coinsWon: number;
    fruitsSliced: number;
    totalFruits: number;
    bombsHit: number;
    newBalance: number;
  }>({
    coinsWon: 0,
    fruitsSliced: 0,
    totalFruits: 24,
    bombsHit: 0,
    newBalance: 0,
  });

  const [alreadyPlayedData, setAlreadyPlayedData] = useState<{
    fruitsSliced: number;
    totalFruits: number;
    bombsHit: number;
    coinsWon: number;
    nextAvailable: string;
  } | null>(null);

  const [midnightCountdown, setMidnightCountdown] = useState('00:00:00');

  // DOM Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Engine Refs
  const gameIdRef = useRef<string | null>(null);
  const itemSpawnsRef = useRef<ItemSpawn[]>([]);
  const activeItemsRef = useRef<ActiveItem[]>([]);
  const itemHalvesRef = useRef<ItemHalf[]>([]);
  const juiceDropletsRef = useRef<JuiceDroplet[]>([]);
  const juiceSplatsRef = useRef<JuiceSplat[]>([]);
  const scorePopsRef = useRef<ScorePop[]>([]);
  const bombExplosionsRef = useRef<BombExplosionEffect[]>([]);
  const slicedIndicesRef = useRef<number[]>([]);
  const bombsHitIndicesRef = useRef<number[]>([]);

  // Input & Blade Trail Refs
  const isPointerDownRef = useRef(false);
  const trailPointsRef = useRef<TrailPoint[]>([]);
  const trailFadeStartTimeRef = useRef<number | null>(null);
  const lastPointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastSwooshTimeRef = useRef(0);
  const currentSwipeSlicedCountRef = useRef(0);
  const lastSliceTimeRef = useRef(0);

  // Time & Physics Refs
  const gameStartTimeRef = useRef(0);
  const pausedTimeElapsedRef = useRef(0);
  const pauseStartRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);
  const lastTickSecondRef = useRef(30);

  // Re-render tick for visual sync
  const [, setVisualTick] = useState(0);

  // -------------------------------------------------------------
  // 1. ORIENTATION & RESIZE HANDLING
  // -------------------------------------------------------------
  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    // Try Fullscreen API & Screen Orientation Lock if available
    if (typeof screen !== 'undefined' && 'orientation' in screen && 'lock' in screen.orientation) {
      try {
        (screen.orientation as { lock: (mode: string) => Promise<void> })
          .lock('landscape')
          .catch(() => {});
      } catch {}
    }

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // -------------------------------------------------------------
  // 2. LOCK BODY SCROLL DURING GAMEPLAY
  // -------------------------------------------------------------
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    const originalPosition = document.body.style.position;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      document.body.style.position = originalPosition;
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, []);

  // -------------------------------------------------------------
  // 3. MIDNIGHT IST COUNTDOWN FORMATTER
  // -------------------------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
      const istTime = new Date(utcTime + 5.5 * 3600000);

      const nextMidnightIst = new Date(istTime);
      nextMidnightIst.setHours(24, 0, 0, 0);

      const diffMs = nextMidnightIst.getTime() - istTime.getTime();
      if (diffMs <= 0) {
        setMidnightCountdown('00:00:00');
        return;
      }

      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);

      setMidnightCountdown(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // -------------------------------------------------------------
  // 4. CHECK USER AUTH & DAILY PLAY STATUS
  // -------------------------------------------------------------
  useEffect(() => {
    const initCheck = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      setGameState('start');
    };

    initCheck();
  }, [router]);

  // -------------------------------------------------------------
  // 5. CANVAS RESIZING
  // -------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [gameState]);

  // -------------------------------------------------------------
  // 6. START GAME SESSION (API CALL & 3-2-1 COUNTDOWN)
  // -------------------------------------------------------------
  const handleStartGame = async () => {
    initAudioContext();
    setGameState('loading');

    try {
      const res = await fetch('/api/games/sip-slice/start', {
        method: 'POST',
      });

      const data = await res.json();

      if (res.status === 409 || data.already_played) {
        setAlreadyPlayedData({
          fruitsSliced: data.today_result?.fruits_sliced ?? data.fruits_sliced ?? data.bottles_sliced ?? 0,
          totalFruits: data.today_result?.total_fruits ?? data.total_fruits ?? data.total_bottles ?? 24,
          bombsHit: data.today_result?.bombs_hit ?? data.bombs_hit ?? 0,
          coinsWon: data.today_result?.coins_won ?? data.coins_won ?? 0,
          nextAvailable: data.next_available || '',
        });
        setGameState('already_played');
        return;
      }

      if (!res.ok || !data.game_id) {
        setGameState('start');
        return;
      }

      gameIdRef.current = data.game_id;
      itemSpawnsRef.current = data.items || data.bottles || [];
      activeItemsRef.current = [];
      itemHalvesRef.current = [];
      juiceDropletsRef.current = [];
      juiceSplatsRef.current = [];
      scorePopsRef.current = [];
      bombExplosionsRef.current = [];
      slicedIndicesRef.current = [];
      bombsHitIndicesRef.current = [];
      setScore(0);
      setTimeLeft(30);

      // 3-2-1 Countdown with blip sounds
      setGameState('countdown');
      setCountdownNum(3);
      playTimerWarningTick();

      setTimeout(() => {
        setCountdownNum(2);
        playTimerWarningTick();
      }, 700);

      setTimeout(() => {
        setCountdownNum(1);
        playTimerWarningTick();
      }, 1400);

      setTimeout(() => {
        setCountdownNum('SLICE!');
        playFruitSliceHit();
      }, 2100);

      setTimeout(() => {
        startActiveGameplay();
      }, 2600);
    } catch {
      setGameState('start');
    }
  };

  // -------------------------------------------------------------
  // 7. START ACTIVE GAMEPLAY (INITIALIZE PHYSICS OBJECTS)
  // -------------------------------------------------------------
  const startActiveGameplay = () => {
    setGameState('playing');
    const now = performance.now();
    gameStartTimeRef.current = now;
    pausedTimeElapsedRef.current = 0;
    lastFrameTimeRef.current = now;
    lastTickSecondRef.current = 30;

    const width = window.innerWidth;
    const height = window.innerHeight;

    activeItemsRef.current = itemSpawnsRef.current.map((sp) => {
      const startX = (sp.start_x_percent / 100) * width;
      const startY = height + 85;
      const peakY = (sp.peak_height_percent / 100) * height; // 25% to 70% from top
      const flightDuration = 2.2;
      const tPeak = flightDuration / 2;

      const gravity = (2 * (startY - peakY)) / (tPeak * tPeak);
      const vy0 = -gravity * tPeak;
      const vx = (sp.velocity_x / 100) * width;

      return {
        index: sp.index,
        type: sp.type,
        appearAtMs: sp.appear_at_ms,
        startX,
        startY,
        peakY,
        vx,
        vy0,
        gravity,
        rotSpeed: sp.rotation_speed,
        initialRot: (Math.random() - 0.5) * 60,
        flightDuration,
        x: startX,
        y: startY,
        rotation: 0,
        isSliced: false,
        isRemoved: false,
      };
    });
  };

  // -------------------------------------------------------------
  // 8. COMPLETE GAME
  // -------------------------------------------------------------
  const completeGame = useCallback(async () => {
    if (gameState === 'result') return;

    const gameId = gameIdRef.current;
    const sliced = [...slicedIndicesRef.current];
    const bombs = [...bombsHitIndicesRef.current];

    try {
      const res = await fetch('/api/games/sip-slice/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          sliced_indices: sliced,
          bombs_hit_indices: bombs,
          ended_at_ms: Math.round(performance.now() - gameStartTimeRef.current),
        }),
      });

      const data = await res.json();
      setResultData({
        coinsWon: data.coins_won ?? Math.max(1, score),
        fruitsSliced: data.fruits_sliced ?? sliced.filter((i) => !bombs.includes(i)).length,
        totalFruits: data.total_fruits ?? itemSpawnsRef.current.filter((i) => i.type !== 'bomb').length,
        bombsHit: data.bombs_hit ?? bombs.length,
        newBalance: data.new_balance ?? 0,
      });
    } catch {
      setResultData({
        coinsWon: Math.max(1, score),
        fruitsSliced: sliced.filter((i) => !bombs.includes(i)).length,
        totalFruits: itemSpawnsRef.current.filter((i) => i.type !== 'bomb').length || 22,
        bombsHit: bombs.length,
        newBalance: 0,
      });
    }

    setGameState('result');
  }, [gameState, score]);

  // -------------------------------------------------------------
  // 9. SLICE LOGIC & VISUAL ANIMATION
  // -------------------------------------------------------------
  const sliceItem = useCallback((item: ActiveItem, sliceX: number, sliceY: number, angleRad: number) => {
    item.isSliced = true;
    slicedIndicesRef.current.push(item.index);

    if (item.type === 'bomb') {
      // BOMB SLICED: -10 coins, screen shake, red flash, explosion
      bombsHitIndicesRef.current.push(item.index);
      setScore((prev) => Math.max(0, prev - 10));

      playBombExplosion();

      // Screen shake (translateX back and forth 3 times, 50ms each)
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 300);

      // Dark red screen flash (full screen overlay, rgba(180,0,0,0.4), 300ms)
      setIsScreenRed(true);
      setTimeout(() => setIsScreenRed(false), 300);

      // Bomb explosion effect at slice point
      bombExplosionsRef.current.push({
        id: `bomb_${item.index}_${Date.now()}`,
        x: sliceX,
        y: sliceY,
        createdAt: performance.now(),
      });

      // Score pop-up: "-10" text in RED (48px Anton)
      scorePopsRef.current.push({
        id: `pop_${item.index}_${Date.now()}`,
        x: sliceX,
        y: sliceY,
        text: '-10',
        color: '#FF2222',
        fontSize: 48,
        createdAt: performance.now(),
      });

      return;
    }

    // FRUIT SLICED: Pineapple or Mango (+1 coin)
    setScore((prev) => prev + 1);

    playFruitSliceHit();
    playFruitJuiceSplash();

    // Pop-up "+1" in white bold 28px
    scorePopsRef.current.push({
      id: `pop_${item.index}_${Date.now()}`,
      x: sliceX,
      y: sliceY,
      text: '+1',
      color: '#FFFFFF',
      fontSize: 28,
      createdAt: performance.now(),
    });

    // Combo Tracking (2+ fruits in one swipe)
    const now = performance.now();
    if (now - lastSliceTimeRef.current < 250) {
      currentSwipeSlicedCountRef.current += 1;
    } else {
      currentSwipeSlicedCountRef.current = 1;
    }
    lastSliceTimeRef.current = now;

    if (currentSwipeSlicedCountRef.current >= 2) {
      playComboBonus();
      setComboBanner({
        count: currentSwipeSlicedCountRef.current,
        id: Date.now(),
      });
    }

    // A. Fruit Splits in Two Halves
    const cutAngleDeg = (angleRad * 180) / Math.PI;
    itemHalvesRef.current.push({
      id: `half_l_${item.index}_${Date.now()}`,
      type: item.type,
      x: item.x,
      y: item.y,
      side: 'left',
      sliceAngle: cutAngleDeg,
      vx: -140 - Math.random() * 50,
      vy: -80 - Math.random() * 60,
      rot: item.rotation,
      rotSpeed: -220 - Math.random() * 120,
      createdAt: performance.now(),
    });

    itemHalvesRef.current.push({
      id: `half_r_${item.index}_${Date.now()}`,
      type: item.type,
      x: item.x,
      y: item.y,
      side: 'right',
      sliceAngle: cutAngleDeg,
      vx: 140 + Math.random() * 50,
      vy: -80 - Math.random() * 60,
      rot: item.rotation,
      rotSpeed: 220 + Math.random() * 120,
      createdAt: performance.now(),
    });

    // B. Juice Splat on Background (~80-120px)
    const splatColor =
      item.type === 'mango' ? 'rgba(205, 238, 28, 0.78)' : 'rgba(255, 225, 77, 0.82)';

    const r1 = 35 + Math.floor(Math.random() * 30);
    const r2 = 35 + Math.floor(Math.random() * 30);
    const r3 = 35 + Math.floor(Math.random() * 30);
    const r4 = 35 + Math.floor(Math.random() * 30);
    const r5 = 35 + Math.floor(Math.random() * 30);
    const r6 = 35 + Math.floor(Math.random() * 30);
    const r7 = 35 + Math.floor(Math.random() * 30);
    const r8 = 35 + Math.floor(Math.random() * 30);

    juiceSplatsRef.current.push({
      id: `splat_${item.index}_${Date.now()}`,
      x: sliceX,
      y: sliceY,
      size: 85 + Math.random() * 35,
      color: splatColor,
      borderRadius: `${r1}% ${r2}% ${r3}% ${r4}% / ${r5}% ${r6}% ${r7}% ${r8}%`,
      rotation: Math.random() * 360,
      createdAt: performance.now(),
    });

    // C. 3D Juice Droplets (12-18 small spheres)
    const dropletCount = 14 + Math.floor(Math.random() * 4);
    const baseColor = item.type === 'mango' ? '#CDEE1C' : '#FFE14D';
    const lightColor = item.type === 'mango' ? '#F4FFBD' : '#FFF9C4';
    const darkColor = item.type === 'mango' ? '#8FC31F' : '#F5B800';

    for (let i = 0; i < dropletCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 160 + Math.random() * 260;
      juiceDropletsRef.current.push({
        id: `drop_${item.index}_${i}_${Date.now()}`,
        x: sliceX,
        y: sliceY,
        size: 5 + Math.random() * 6,
        color: baseColor,
        lightColor,
        darkColor,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        createdAt: performance.now(),
      });
    }
  }, []);

  // -------------------------------------------------------------
  // 10. HIT DETECTION ON POINTER MOVE (Circle-Line-Segment Math)
  // -------------------------------------------------------------
  const handlePointerMovement = useCallback(
    (clientX: number, clientY: number) => {
      if (gameState !== 'playing') return;

      const now = performance.now();
      trailPointsRef.current.push({ x: clientX, y: clientY, time: now });

      // Calculate swipe velocity to play swoosh only when moving fast enough
      if (lastPointerPosRef.current) {
        const dX = clientX - lastPointerPosRef.current.x;
        const dY = clientY - lastPointerPosRef.current.y;
        const dist = Math.sqrt(dX * dX + dY * dY);

        if (dist > 18 && now - lastSwooshTimeRef.current > 110) {
          playFruitSwoosh();
          lastSwooshTimeRef.current = now;
        }
      }
      lastPointerPosRef.current = { x: clientX, y: clientY };

      const points = trailPointsRef.current;
      if (points.length < 2) return;

      const p1 = points[points.length - 2];
      const p2 = points[points.length - 1];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const segLenSq = dx * dx + dy * dy;
      if (segLenSq === 0) return;

      const sliceAngleRad = Math.atan2(dy, dx);
      const hitRadius = 30; // Radius for circle hit check

      // Check all active unsliced items
      for (const item of activeItemsRef.current) {
        if (item.isSliced || item.isRemoved) continue;

        const ix = item.x + 25;
        const iy = item.y + 35;

        // Project center onto line segment
        const t = Math.max(0, Math.min(1, ((ix - p1.x) * dx + (iy - p1.y) * dy) / segLenSq));
        const projX = p1.x + t * dx;
        const projY = p1.y + t * dy;

        const distSq = (ix - projX) * (ix - projX) + (iy - projY) * (iy - projY);

        if (distSq <= hitRadius * hitRadius) {
          sliceItem(item, projX, projY, sliceAngleRad);
        }
      }
    },
    [gameState, sliceItem]
  );

  // -------------------------------------------------------------
  // 11. MAIN RAF GAME LOOP (PHYSICS, CANVAS BLADE, CLEANUP)
  // -------------------------------------------------------------
  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'times_up') {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    const updateLoop = (frameTime: number) => {
      const dt = Math.min((frameTime - lastFrameTimeRef.current) / 1000, 0.05);
      lastFrameTimeRef.current = frameTime;

      const gameElapsed = frameTime - gameStartTimeRef.current - pausedTimeElapsedRef.current;

      // 1. Update Game Timer & Warnings
      if (gameState === 'playing') {
        const remaining = Math.max(0, 30 - gameElapsed / 1000);
        const secCeil = Math.ceil(remaining);
        setTimeLeft(secCeil);

        // Warning tick on each of the last 5 seconds
        if (secCeil <= 5 && secCeil > 0 && secCeil !== lastTickSecondRef.current) {
          playTimerWarningTick();
          lastTickSecondRef.current = secCeil;
        }

        if (remaining <= 0) {
          setGameState('times_up');
          setTimeout(() => {
            completeGame();
          }, 1100);
        }
      }

      // 2. Update Active Items Physics
      if (gameState === 'playing') {
        const screenHeight = window.innerHeight;
        activeItemsRef.current.forEach((it) => {
          if (it.isSliced || it.isRemoved) return;

          const itemElapsed = (gameElapsed - it.appearAtMs) / 1000;
          if (itemElapsed < 0) {
            it.y = screenHeight + 90;
            return;
          }

          if (itemElapsed > it.flightDuration) {
            it.isRemoved = true;
            return;
          }

          it.x = it.startX + it.vx * itemElapsed;
          it.y = it.startY + it.vy0 * itemElapsed + 0.5 * it.gravity * itemElapsed * itemElapsed;
          it.rotation = it.initialRot + it.rotSpeed * itemElapsed;
        });
      }

      // 3. Update Item Halves
      itemHalvesRef.current = itemHalvesRef.current.filter((half) => {
        const age = (frameTime - half.createdAt) / 1000;
        if (age > 0.65) return false;

        half.x += half.vx * dt;
        half.y += half.vy * dt + 0.5 * 1100 * dt * dt;
        half.vy += 1100 * dt;
        half.rot += half.rotSpeed * dt;
        return true;
      });

      // 4. Update Juice Droplets
      juiceDropletsRef.current = juiceDropletsRef.current.filter((d) => {
        const age = (frameTime - d.createdAt) / 1000;
        if (age > 0.55) return false;

        d.x += d.vx * dt;
        d.y += d.vy * dt + 0.5 * 800 * dt * dt;
        d.vy += 800 * dt;
        return true;
      });

      // 5. Clean up Juice Splats (accumulate for 3s then fade)
      juiceSplatsRef.current = juiceSplatsRef.current.filter((s) => {
        return frameTime - s.createdAt < 3500;
      });

      // 6. Clean up Score Pops
      scorePopsRef.current = scorePopsRef.current.filter((p) => {
        return frameTime - p.createdAt < 550;
      });

      // 7. Clean up Bomb Explosions (300ms)
      bombExplosionsRef.current = bombExplosionsRef.current.filter((b) => {
        return frameTime - b.createdAt < 350;
      });

      // 8. Draw Canvas Blade Trail (Tapered 8px -> 0.5px, smooth curves, glowing shadow)
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Keep last 20 points
        if (trailPointsRef.current.length > 20) {
          trailPointsRef.current = trailPointsRef.current.slice(-20);
        }

        // Fade trail over 150ms if pointer released
        let trailOpacity = 1;
        if (trailFadeStartTimeRef.current !== null) {
          const fadeAge = frameTime - trailFadeStartTimeRef.current;
          trailOpacity = Math.max(0, 1 - fadeAge / 150);
          if (fadeAge >= 150) {
            trailPointsRef.current = [];
            trailFadeStartTimeRef.current = null;
          }
        }

        const activeTrail = trailPointsRef.current;
        if (activeTrail.length >= 2 && trailOpacity > 0) {
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          for (let i = 0; i < activeTrail.length - 1; i++) {
            const progress = i / (activeTrail.length - 1);
            const pCurrent = activeTrail[i];
            const pNext = activeTrail[i + 1];

            ctx.beginPath();
            ctx.moveTo(pCurrent.x, pCurrent.y);
            ctx.lineTo(pNext.x, pNext.y);

            // Tapered: 0.5px at tail -> 8px at finger
            ctx.lineWidth = 0.5 + progress * 7.5;

            ctx.shadowColor = 'rgba(200, 220, 255, 0.9)';
            ctx.shadowBlur = 8;
            ctx.strokeStyle = `rgba(255, 255, 255, ${(0.2 + progress * 0.8) * trailOpacity})`;
            ctx.stroke();
          }

          // Glowing tip flare
          const tip = activeTrail[activeTrail.length - 1];
          ctx.beginPath();
          ctx.arc(tip.x, tip.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${trailOpacity})`;
          ctx.shadowColor = 'rgba(215, 235, 255, 1)';
          ctx.shadowBlur = 10;
          ctx.fill();

          ctx.restore();
        }
      }

      setVisualTick(frameTime);
      animationFrameIdRef.current = requestAnimationFrame(updateLoop);
    };

    animationFrameIdRef.current = requestAnimationFrame(updateLoop);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [gameState, completeGame]);

  // -------------------------------------------------------------
  // 12. TAB BACKGROUNDING & PAUSE HANDLING
  // -------------------------------------------------------------
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && gameState === 'playing') {
        pauseStartRef.current = performance.now();
        setGameState('paused');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [gameState]);

  const handlePause = () => {
    if (gameState === 'playing') {
      pauseStartRef.current = performance.now();
      setGameState('paused');
    }
  };

  const handleResume = () => {
    if (gameState === 'paused') {
      pausedTimeElapsedRef.current += performance.now() - pauseStartRef.current;
      lastFrameTimeRef.current = performance.now();
      setGameState('playing');
    }
  };

  // -------------------------------------------------------------
  // 13. TOUCH & MOUSE INPUT BINDINGS WITH ROTATION FALLBACK
  // -------------------------------------------------------------
  // iOS Safari touch coordinate mapping if container is rotated 90deg in portrait mode
  const getMappedCoordinates = (clientX: number, clientY: number) => {
    if (!isPortrait) return { x: clientX, y: clientY };
    // Swapped coordinates for 90deg CSS rotation
    return {
      x: clientY,
      y: window.innerWidth - clientX,
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    initAudioContext();
    isPointerDownRef.current = true;
    trailFadeStartTimeRef.current = null;
    currentSwipeSlicedCountRef.current = 0;
    const touch = e.touches[0];
    if (touch) {
      const { x, y } = getMappedCoordinates(touch.clientX, touch.clientY);
      trailPointsRef.current = [{ x, y, time: performance.now() }];
      lastPointerPosRef.current = { x, y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      const { x, y } = getMappedCoordinates(touch.clientX, touch.clientY);
      handlePointerMovement(x, y);
    }
  };

  const handleTouchEnd = () => {
    isPointerDownRef.current = false;
    trailFadeStartTimeRef.current = performance.now();
    lastPointerPosRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    initAudioContext();
    isPointerDownRef.current = true;
    trailFadeStartTimeRef.current = null;
    currentSwipeSlicedCountRef.current = 0;
    const { x, y } = getMappedCoordinates(e.clientX, e.clientY);
    trailPointsRef.current = [{ x, y, time: performance.now() }];
    lastPointerPosRef.current = { x, y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPointerDownRef.current) {
      const { x, y } = getMappedCoordinates(e.clientX, e.clientY);
      handlePointerMovement(x, y);
    }
  };

  const handleMouseUp = () => {
    isPointerDownRef.current = false;
    trailFadeStartTimeRef.current = performance.now();
    lastPointerPosRef.current = null;
  };

  // -------------------------------------------------------------
  // 14. WOODEN CUTTING BOARD BACKGROUND
  // -------------------------------------------------------------
  const renderWoodenBoard = () => (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
      {/* 4 alternating vertical wood planks */}
      <div
        className="absolute inset-0"
        style={{
          background: `repeating-linear-gradient(
            to right,
            #5C3A1E 0%, #5C3A1E 24.8%,
            rgba(0,0,0,0.55) 24.8%, rgba(0,0,0,0.55) 25%,
            #6B4226 25%, #6B4226 49.8%,
            rgba(0,0,0,0.55) 49.8%, rgba(0,0,0,0.55) 50%,
            #7A4A2E 50%, #7A4A2E 74.8%,
            rgba(0,0,0,0.55) 74.8%, rgba(0,0,0,0.55) 75%,
            #4A2E14 75%, #4A2E14 99.8%,
            rgba(0,0,0,0.55) 99.8%, rgba(0,0,0,0.55) 100%
          )`,
        }}
      />

      {/* Wood grain texture */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          background: `repeating-linear-gradient(
            45deg,
            rgba(0,0,0,0.12) 0px,
            rgba(0,0,0,0.12) 2px,
            transparent 2px,
            transparent 8px
          )`,
        }}
      />

      {/* Edge Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* Decorative Pre-drawn Diagonal Slash Marks */}
      <svg className="absolute inset-0 w-full h-full opacity-40 overflow-visible">
        <line
          x1="16%"
          y1="22%"
          x2="28%"
          y2="38%"
          stroke="#1E120A"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="drop-shadow(0 1px 1px rgba(255,255,255,0.08))"
        />
        <line
          x1="68%"
          y1="16%"
          x2="82%"
          y2="34%"
          stroke="#1E120A"
          strokeWidth="2"
          strokeLinecap="round"
          filter="drop-shadow(0 1px 1px rgba(255,255,255,0.08))"
        />
        <line
          x1="46%"
          y1="54%"
          x2="34%"
          y2="72%"
          stroke="#1E120A"
          strokeWidth="2.2"
          strokeLinecap="round"
          filter="drop-shadow(0 1px 1px rgba(255,255,255,0.08))"
        />
        <line
          x1="80%"
          y1="64%"
          x2="92%"
          y2="82%"
          stroke="#1E120A"
          strokeWidth="2"
          strokeLinecap="round"
          filter="drop-shadow(0 1px 1px rgba(255,255,255,0.08))"
        />
        <line
          x1="12%"
          y1="68%"
          x2="24%"
          y2="84%"
          stroke="#1E120A"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="drop-shadow(0 1px 1px rgba(255,255,255,0.08))"
        />
        <line
          x1="52%"
          y1="18%"
          x2="64%"
          y2="36%"
          stroke="#1E120A"
          strokeWidth="2"
          strokeLinecap="round"
          filter="drop-shadow(0 1px 1px rgba(255,255,255,0.08))"
        />
        <line
          x1="28%"
          y1="42%"
          x2="42%"
          y2="58%"
          stroke="#1E120A"
          strokeWidth="2.2"
          strokeLinecap="round"
          filter="drop-shadow(0 1px 1px rgba(255,255,255,0.08))"
        />
      </svg>
    </div>
  );

  // -------------------------------------------------------------
  // RENDER: PORTRAIT ORIENTATION PROMPT OVERLAY
  // -------------------------------------------------------------
  if (isPortrait) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#2B170B] text-white p-6 text-center select-none">
        <div className="relative w-28 h-28 mb-6 flex items-center justify-center animate-bounce">
          <svg
            className="w-20 h-20 text-[#FFE14D] animate-spin"
            style={{ animationDuration: '3s' }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        </div>

        <h2 className="text-3xl font-extrabold font-anton tracking-wide text-[#FFE14D] mb-3">
          Rotate your phone 📱
        </h2>
        <p className="text-gray-300 max-w-xs text-sm mb-6 leading-relaxed">
          Sip Slice is played in landscape mode for the true Fruit Ninja experience. Turn your device sideways to play!
        </p>

        <div className="flex items-center gap-2 text-xs text-gray-400 bg-black/40 px-4 py-2 rounded-full">
          <span>🔄</span> Turn device horizontally to continue
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: ALREADY PLAYED TODAY SCREEN
  // -------------------------------------------------------------
  if (gameState === 'already_played' && alreadyPlayedData) {
    return (
      <div className="fixed inset-0 w-screen h-screen flex items-center justify-center overflow-hidden select-none">
        {renderWoodenBoard()}

        <div className="relative z-10 bg-white/95 backdrop-blur-md rounded-[24px] p-7 max-w-sm w-full mx-4 text-center shadow-2xl border border-white/40">
          <h2 className="text-2xl font-anton text-[#B92429] tracking-wide mb-1 uppercase">
            TODAY&apos;S SLICE RESULT
          </h2>
          <p className="text-xs text-gray-500 mb-4">You have already completed your daily slice!</p>

          <div className="bg-[#FFF8F0] border border-[#FFE14D]/50 rounded-2xl p-4 mb-5">
            <div className="text-sm font-semibold text-gray-700 mb-1">
              Fruits sliced: {alreadyPlayedData.fruitsSliced} / {alreadyPlayedData.totalFruits}
            </div>
            {alreadyPlayedData.bombsHit > 0 && (
              <div className="text-xs font-semibold text-red-600 mb-1">
                Bombs hit: {alreadyPlayedData.bombsHit} (−10 each)
              </div>
            )}
            <div className="text-lg font-anton text-[#B92429] flex items-center justify-center gap-1.5">
              <span>Earned +{alreadyPlayedData.coinsWon} Sip Coins today</span>
            </div>
          </div>

          <div className="mb-5">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              Next slice in:
            </div>
            <div className="text-2xl font-anton tracking-widest text-[#FFC93C] bg-black/80 py-2 rounded-xl">
              {midnightCountdown}
            </div>
          </div>

          <button
            disabled
            className="w-full bg-gray-300 text-gray-500 font-bold py-3.5 rounded-xl text-sm mb-3 cursor-not-allowed uppercase"
          >
            Come Back Tomorrow
          </button>

          <Link
            href="/play"
            className="inline-block text-xs font-semibold text-gray-600 hover:text-gray-900 underline"
          >
            ← Back to Games
          </Link>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: START SCREEN
  // -------------------------------------------------------------
  if (gameState === 'start' || gameState === 'loading') {
    return (
      <div className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center overflow-hidden select-none">
        {renderWoodenBoard()}

        <div className="relative z-10 flex flex-col items-center text-center p-6 max-w-md w-full">
          <h1
            className="text-5xl font-anton tracking-wider text-white mb-2"
            style={{ textShadow: '0 4px 14px rgba(0,0,0,0.8)' }}
          >
            SIP SLICE
          </h1>

          {/* Zee Sip Logo */}
          <div className="w-24 h-14 relative my-2 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/zeesip-logo.png"
              alt="Zee Sip"
              className="max-h-full max-w-full object-contain drop-shadow-lg"
            />
          </div>

          <p className="text-white/80 text-lg font-medium mb-8" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
            Slice the fruits!
          </p>

          <button
            onClick={handleStartGame}
            disabled={gameState === 'loading'}
            className="w-56 py-3.5 bg-[#B92429] hover:bg-[#9E1B20] active:scale-95 text-white font-anton text-2xl tracking-widest rounded-2xl shadow-xl transition-transform animate-pulse flex items-center justify-center uppercase"
          >
            {gameState === 'loading' ? 'LOADING...' : 'START'}
          </button>

          <Link
            href="/play"
            className="mt-6 text-xs text-white/60 hover:text-white underline font-semibold"
          >
            ← Back to Games
          </Link>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: 3-2-1 COUNTDOWN SCREEN
  // -------------------------------------------------------------
  if (gameState === 'countdown') {
    return (
      <div className="fixed inset-0 w-screen h-screen flex items-center justify-center overflow-hidden select-none">
        {renderWoodenBoard()}

        <div
          key={String(countdownNum)}
          className="relative z-10 text-7xl font-anton text-[#FFE14D] tracking-widest animate-ping"
          style={{
            animationDuration: '0.6s',
            animationIterationCount: '1',
            textShadow: '0 0 30px rgba(255,225,77,0.8)',
          }}
        >
          {countdownNum}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: ACTIVE GAMEPLAY / PAUSED / RESULT
  // -------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`fixed inset-0 w-screen h-screen overflow-hidden select-none touch-none cursor-crosshair ${
        isShaking ? 'animate-[shake_0.05s_ease-in-out_infinite]' : ''
      }`}
      style={{
        WebkitTouchCallout: 'none',
        userSelect: 'none',
      }}
    >
      {/* 1. Wooden Cutting Board Background */}
      {renderWoodenBoard()}

      {/* 2. Juice Splats on Board */}
      {juiceSplatsRef.current.map((splat) => {
        const ageMs = performance.now() - splat.createdAt;
        const opacity = ageMs > 2000 ? Math.max(0, 1 - (ageMs - 2000) / 1500) : 1;

        return (
          <div
            key={splat.id}
            className="absolute pointer-events-none transition-transform"
            style={{
              left: `${splat.x - splat.size / 2}px`,
              top: `${splat.y - splat.size / 2}px`,
              width: `${splat.size}px`,
              height: `${splat.size}px`,
              backgroundColor: splat.color,
              borderRadius: splat.borderRadius,
              transform: `rotate(${splat.rotation}deg)`,
              opacity,
            }}
          />
        );
      })}

      {/* 3. Flying Active Fruits & Bombs */}
      {activeItemsRef.current.map((item) => {
        if (item.isSliced || item.isRemoved) return null;

        return (
          <div
            key={item.index}
            className="absolute pointer-events-none will-change-transform"
            style={{
              left: `${item.x}px`,
              top: `${item.y}px`,
              transform: `rotate(${item.rotation}deg)`,
            }}
          >
            <FruitGraphic type={item.type} />
          </div>
        );
      })}

      {/* 4. Sliced Fruit Halves */}
      {itemHalvesRef.current.map((half) => {
        const age = (performance.now() - half.createdAt) / 1000;
        const opacity = Math.max(0, 1 - age / 0.65);

        return (
          <div
            key={half.id}
            className="absolute pointer-events-none will-change-transform"
            style={{
              left: `${half.x}px`,
              top: `${half.y}px`,
              transform: `rotate(${half.rot}deg)`,
              opacity,
            }}
          >
            <FruitGraphic type={half.type} clipSide={half.side} />
          </div>
        );
      })}

      {/* 5. Bomb Explosion Animations */}
      {bombExplosionsRef.current.map((exp) => {
        const ageMs = performance.now() - exp.createdAt;
        const scale = Math.min(1, ageMs / 120);
        const opacity = Math.max(0, 1 - ageMs / 300);

        return (
          <div
            key={exp.id}
            className="absolute pointer-events-none z-30"
            style={{
              left: `${exp.x - 100}px`,
              top: `${exp.y - 100}px`,
              width: '200px',
              height: '200px',
              opacity,
              transform: `scale(${scale * 1.5})`,
              background: 'radial-gradient(circle, #FF4500 0%, #FF8C00 45%, transparent 70%)',
            }}
          />
        );
      })}

      {/* 6. 3D Juice Droplets */}
      {juiceDropletsRef.current.map((drop) => {
        const age = (performance.now() - drop.createdAt) / 1000;
        const opacity = Math.max(0, 1 - age / 0.55);

        return (
          <div
            key={drop.id}
            className="absolute pointer-events-none rounded-full will-change-transform"
            style={{
              left: `${drop.x - drop.size / 2}px`,
              top: `${drop.y - drop.size / 2}px`,
              width: `${drop.size}px`,
              height: `${drop.size}px`,
              background: `radial-gradient(circle at 35% 35%, ${drop.lightColor}, ${drop.color} 70%, ${drop.darkColor} 100%)`,
              opacity,
            }}
          />
        );
      })}

      {/* 7. Score Pop-ups */}
      {scorePopsRef.current.map((pop) => {
        const age = (performance.now() - pop.createdAt) / 1000;
        const opacity = Math.max(0, 1 - age / 0.55);
        const floatY = age * 90;

        return (
          <div
            key={pop.id}
            className="absolute pointer-events-none font-anton tracking-wide select-none will-change-transform z-40"
            style={{
              left: `${pop.x}px`,
              top: `${pop.y - floatY}px`,
              fontSize: `${pop.fontSize}px`,
              color: pop.color,
              opacity,
              textShadow: '0 2px 8px rgba(0,0,0,0.85)',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {pop.text}
          </div>
        );
      })}

      {/* 8. Canvas Blade Trail (Overlay) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none w-full h-full z-20"
      />

      {/* 9. HUD: Score (Top-Left 🍍 XX) & Timer (Top-Right 0:XX) & Pause (Bottom-Left ⏸) */}
      <div className="absolute inset-x-0 top-0 p-4 flex justify-between items-center pointer-events-none z-30">
        {/* Score Top-Left: "🍍 XX" format */}
        <div className="flex items-center gap-2 bg-black/45 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
          <span className="text-2xl">🍍</span>
          <span
            className="text-3xl font-anton text-[#FFC93C] tracking-wide"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
          >
            {score}
          </span>
        </div>

        {/* Timer Top-Right: "0:XX", turns red in last 5 seconds */}
        <div className="bg-black/45 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
          <span
            className={`text-3xl font-anton tracking-widest ${
              timeLeft <= 5 ? 'text-[#FF3B30] animate-pulse' : 'text-[#FFC93C]'
            }`}
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
          >
            0:{timeLeft.toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Pause Button Bottom-Left */}
      <div className="absolute bottom-4 left-4 z-30 pointer-events-auto">
        <button
          onClick={handlePause}
          className="w-10 h-10 rounded-full bg-black/45 border border-white/25 flex items-center justify-center text-white hover:bg-black/60 active:scale-95 transition-transform"
          aria-label="Pause Game"
        >
          <span className="text-lg">⏸</span>
        </button>
      </div>

      {/* 10. Combo Banner */}
      {comboBanner && (
        <div
          key={comboBanner.id}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-40 animate-ping"
          style={{ animationDuration: '0.8s', animationIterationCount: '1' }}
        >
          <div
            className="text-5xl font-anton text-white tracking-widest px-6 py-2 rounded-2xl"
            style={{
              textShadow:
                '-2px -2px 0 #FFC93C, 2px -2px 0 #FFC93C, -2px 2px 0 #FFC93C, 2px 2px 0 #FFC93C, 0 4px 15px rgba(0,0,0,0.8)',
            }}
          >
            COMBO x{comboBanner.count}!
          </div>
        </div>
      )}

      {/* 11. Bomb Explosion Dark Red Screen Flash */}
      {isScreenRed && (
        <div className="absolute inset-0 z-40 bg-[rgba(180,0,0,0.4)] pointer-events-none transition-opacity duration-300" />
      )}

      {/* 12. Time's Up Banner */}
      {gameState === 'times_up' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs pointer-events-none">
          <h1
            className="text-6xl font-anton text-white tracking-wider uppercase animate-pulse"
            style={{ textShadow: '0 4px 20px rgba(0,0,0,0.9)' }}
          >
            TIME&apos;S UP!
          </h1>
        </div>
      )}

      {/* 13. PAUSE OVERLAY */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm pointer-events-auto">
          <div className="bg-white rounded-[24px] p-6 max-w-xs w-full text-center shadow-2xl">
            <h2 className="text-3xl font-anton text-[#B92429] mb-4">GAME PAUSED</h2>
            <button
              onClick={handleResume}
              className="w-full bg-[#B92429] text-white font-anton py-3 rounded-xl tracking-wider text-lg mb-3 shadow-md"
            >
              RESUME
            </button>
            <Link
              href="/play"
              className="inline-block text-xs text-gray-500 font-semibold hover:text-gray-800"
            >
              Quit to Games
            </Link>
          </div>
        </div>
      )}

      {/* 14. RESULT SCREEN OVERLAY */}
      {gameState === 'result' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 pointer-events-auto select-none">
          <div className="relative bg-white rounded-[24px] p-6 max-w-sm w-full mx-auto text-center shadow-2xl border border-white/40">
            {/* Close Cross Top-Right */}
            <Link
              href="/home"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full"
            >
              ✕
            </Link>

            {/* Header Title */}
            <h2 className="text-2xl font-anton text-[#B92429] tracking-wide mb-1 uppercase">
              {resultData.coinsWon <= 2 && resultData.bombsHit > 0 ? 'GAME OVER' : "TIME'S UP!"}
            </h2>

            <div className="w-12 h-0.5 bg-gray-200 mx-auto my-2.5" />

            {/* Fruits sliced */}
            <p className="text-xs text-gray-500 font-semibold mb-1">
              Fruits sliced: {resultData.fruitsSliced} / {resultData.totalFruits}
            </p>

            {/* Bombs hit */}
            {resultData.bombsHit > 0 && (
              <p className="text-xs text-red-600 font-bold mb-2">
                Bombs hit: {resultData.bombsHit} (−10 each)
              </p>
            )}

            {/* Animated Coin Bounce */}
            <div className="my-2 flex justify-center animate-bounce">
              <CoinIcon size={46} />
            </div>

            {/* Coins Won */}
            <div
              className="text-4xl font-anton text-[#FFC93C] tracking-wide mb-3"
              style={{ textShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
            >
              +{resultData.coinsWon} SIP COINS
            </div>

            {/* Progress to 500 Coins */}
            <div className="bg-[#FFF8F0] border border-[#FFE14D]/40 rounded-xl p-3 mb-4">
              <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1.5">
                <span>Total: {resultData.newBalance} / 500 coins</span>
                <span>{Math.min(100, Math.round((resultData.newBalance / 500) * 100))}%</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#FFC93C] h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.max(3, (resultData.newBalance / 500) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={() => router.push('/play')}
              className="w-full bg-[#B92429] hover:bg-[#9E1B20] text-white font-anton py-3.5 rounded-xl tracking-wider text-base shadow-lg transition-transform active:scale-95 mb-3 uppercase"
            >
              CONTINUE
            </button>

            {/* Next play countdown */}
            <p className="text-[11px] text-gray-400 font-medium">
              Next play in: {midnightCountdown}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
