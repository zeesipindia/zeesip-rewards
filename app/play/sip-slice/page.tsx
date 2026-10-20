'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CoinIcon } from '@/components/CoinIcon';
import { createClient } from '@/lib/supabase/client';
import { ItemType, ItemSpawn } from '@/lib/bottleTypes';
import {
  getAudioContext,
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
  isActive: boolean;
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
  active: boolean;
  opacity: number;
}

interface JuiceDroplet {
  id: number;
  active: boolean;
  x: number;
  y: number;
  size: number;
  color: string;
  lightColor: string;
  darkColor: string;
  vx: number;
  vy: number;
  createdAt: number;
  opacity: number;
}

interface JuiceSplat {
  id: number;
  active: boolean;
  x: number;
  y: number;
  size: number;
  color: string;
  borderRadius: string;
  rotation: number;
  createdAt: number;
  opacity: number;
}

interface ScorePop {
  id: number;
  active: boolean;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  createdAt: number;
  opacity: number;
}

interface BombExplosionEffect {
  id: number;
  active: boolean;
  x: number;
  y: number;
  createdAt: number;
  scale: number;
  opacity: number;
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
          {/* Spiky Green Crown */}
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

          {/* Kidney Kidney Bean / Mango Silhouette */}
          <path
            d="M 25 10 C 14 10, 8 20, 8 34 C 8 48, 16 58, 26 58 C 36 58, 42 48, 42 36 C 42 22, 36 10, 25 10 Z"
            fill="#8BC34A"
            stroke="#689F38"
            strokeWidth="1.5"
          />

          {/* Golden Yellow Sun Blush */}
          <path
            d="M 25 12 C 18 12, 12 21, 12 32 C 12 42, 17 50, 23 52 C 20 42, 20 25, 25 12 Z"
            fill="#FFEB3B"
            opacity="0.65"
          />

          {/* Subtle curved highlight */}
          <path
            d="M 34 22 C 37 28, 37 38, 34 44"
            stroke="#DCEDC8"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* If sliced, show juicy yellow-orange interior and seed outline */}
          {clipSide && (
            <path
              d="M 25 14 C 17 14, 12 22, 12 34 C 12 45, 18 53, 26 53 C 33 53, 38 45, 38 35 C 38 24, 33 14, 25 14 Z"
              fill="#FFD54F"
              stroke="#FFCA28"
              strokeWidth="2"
            />
          )}
          {clipSide && (
            <ellipse cx="25" cy="35" rx="5" ry="10" fill="#FFF8E1" stroke="#FFE082" strokeWidth="1" />
          )}
        </svg>
      </div>
    );
  }

  // Classic Cartoon Bomb
  return (
    <div
      className="relative w-[50px] h-[50px] select-none pointer-events-none"
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
        height="50"
        viewBox="0 0 50 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        {/* Burning Fuse */}
        <path d="M 25 12 Q 33 8, 38 3" stroke="#8D6E63" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        {/* Animated Golden Spark on Fuse */}
        <circle cx="38" cy="3" r="4.5" fill="#FFEB3B" className="animate-ping" />
        <circle cx="38" cy="3" r="2.5" fill="#FF5722" />
        <circle cx="38" cy="3" r="1.2" fill="#FFFFFF" />

        {/* Cylindrical Fuse Cap Neck */}
        <rect x="21" y="9" width="8" height="4" rx="1.5" fill="#424242" stroke="#212121" strokeWidth="1" />

        {/* Spherical Black Bomb Body with 3D Radial Highlight */}
        <circle cx="25" cy="28" r="18" fill="#1A1A1A" stroke="#000000" strokeWidth="1.5" />

        {/* Glossy White Specular Highlight */}
        <ellipse cx="21" cy="21" rx="5" ry="3" fill="white" opacity="0.4" transform="rotate(-30 21 21)" />

        {/* Danger Skull & Bones Icon or Warning Glyph */}
        <circle cx="25" cy="29" r="6" fill="#D32F2F" opacity="0.8" />
        <path d="M 23 27 L 27 31 M 27 27 L 23 31" stroke="white" strokeWidth="1.5" strokeLinecap="round" />

        {/* If sliced bomb half, interior is dark glowing coal */}
        {clipSide && (
          <circle cx="25" cy="28" r="14" fill="#3E2723" stroke="#D84315" strokeWidth="1.5" />
        )}
      </svg>
    </div>
  );
}

// Fixed Pool Sizes to Prevent Garbage Collection
const MAX_DROPLETS = 35;
const MAX_SPLATS = 20;
const MAX_SCORE_POPS = 10;
const MAX_EXPLOSIONS = 3;

export default function SipSlicePage() {
  const router = useRouter();

  // Screen & Game States
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
  const itemHalvesPoolRef = useRef<ItemHalf[]>([]);
  const juiceDropletsPoolRef = useRef<JuiceDroplet[]>([]);
  const juiceSplatsPoolRef = useRef<JuiceSplat[]>([]);
  const scorePopsPoolRef = useRef<ScorePop[]>([]);
  const bombExplosionsPoolRef = useRef<BombExplosionEffect[]>([]);
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

  // Visual Sync Tick
  const [, setVisualTick] = useState(0);

  // -------------------------------------------------------------
  // 1. INITIALIZE PRE-ALLOCATED POOLS
  // -------------------------------------------------------------
  useEffect(() => {
    // Droplets Pool
    const droplets: JuiceDroplet[] = [];
    for (let i = 0; i < MAX_DROPLETS; i++) {
      droplets.push({
        id: i,
        active: false,
        x: 0,
        y: 0,
        size: 8,
        color: '#FFD700',
        lightColor: '#FFF176',
        darkColor: '#F57F17',
        vx: 0,
        vy: 0,
        createdAt: 0,
        opacity: 1,
      });
    }
    juiceDropletsPoolRef.current = droplets;

    // Splats Pool
    const splats: JuiceSplat[] = [];
    for (let i = 0; i < MAX_SPLATS; i++) {
      splats.push({
        id: i,
        active: false,
        x: 0,
        y: 0,
        size: 55,
        color: '#FFD700',
        borderRadius: '50%',
        rotation: 0,
        createdAt: 0,
        opacity: 1,
      });
    }
    juiceSplatsPoolRef.current = splats;

    // Score Pops Pool
    const pops: ScorePop[] = [];
    for (let i = 0; i < MAX_SCORE_POPS; i++) {
      pops.push({
        id: i,
        active: false,
        x: 0,
        y: 0,
        text: '+1',
        color: '#FFD700',
        fontSize: 32,
        createdAt: 0,
        opacity: 1,
      });
    }
    scorePopsPoolRef.current = pops;

    // Bomb Explosions Pool
    const explosions: BombExplosionEffect[] = [];
    for (let i = 0; i < MAX_EXPLOSIONS; i++) {
      explosions.push({
        id: i,
        active: false,
        x: 0,
        y: 0,
        createdAt: 0,
        scale: 0.1,
        opacity: 1,
      });
    }
    bombExplosionsPoolRef.current = explosions;
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
  // 5. CANVAS RESIZING & RETINA DPR SCALING
  // -------------------------------------------------------------
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    ctx?.scale(dpr, dpr);
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize, gameState]);

  // -------------------------------------------------------------
  // 6. COMPLETE GAME
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
        totalFruits: itemSpawnsRef.current.filter((i) => i.type !== 'bomb').length || 24,
        bombsHit: bombs.length,
        newBalance: 0,
      });
    }

    setGameState('result');
  }, [gameState, score]);

  // -------------------------------------------------------------
  // 7. START ACTIVE GAMEPLAY (INITIALIZE PHYSICS OBJECTS & POOLS)
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

    // Pre-create pooled active items from sequence
    activeItemsRef.current = itemSpawnsRef.current.map((sp) => {
      const startX = (sp.start_x_percent / 100) * width;
      const startY = height + 90; // Below bottom edge
      const peakY = (sp.peak_height_percent / 100) * height; // 30% to 70% from top
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
        initialRot: (Math.random() - 0.5) * 50,
        flightDuration,
        x: startX,
        y: startY,
        rotation: 0,
        isSliced: false,
        isRemoved: false,
        isActive: false,
      };
    });

    // Pre-create halves pool (2 halves per item index)
    const halves: ItemHalf[] = [];
    itemSpawnsRef.current.forEach((sp) => {
      halves.push({
        id: `half-${sp.index}-left`,
        type: sp.type,
        x: 0,
        y: 0,
        side: 'left',
        sliceAngle: 0,
        vx: 0,
        vy: 0,
        rot: 0,
        rotSpeed: 0,
        createdAt: 0,
        active: false,
        opacity: 1,
      });
      halves.push({
        id: `half-${sp.index}-right`,
        type: sp.type,
        x: 0,
        y: 0,
        side: 'right',
        sliceAngle: 0,
        vx: 0,
        vy: 0,
        rot: 0,
        rotSpeed: 0,
        createdAt: 0,
        active: false,
        opacity: 1,
      });
    });
    itemHalvesPoolRef.current = halves;

    // Reset droplet and splat pools
    juiceDropletsPoolRef.current.forEach((d) => (d.active = false));
    juiceSplatsPoolRef.current.forEach((s) => (s.active = false));
    scorePopsPoolRef.current.forEach((p) => (p.active = false));
    bombExplosionsPoolRef.current.forEach((b) => (b.active = false));
  };

  // -------------------------------------------------------------
  // 8. START GAME SESSION (API CALL & 3-2-1 COUNTDOWN)
  // -------------------------------------------------------------
  const handleStartGame = async () => {
    // 1. Safari Web Audio unlock: MUST be awaited inside user gesture onClick!
    try {
      await initAudioContext();
    } catch {}

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
  // 9. SLICE LOGIC & VISUAL ANIMATIONS
  // -------------------------------------------------------------
  const sliceItem = useCallback((item: ActiveItem, sliceX: number, sliceY: number, angleRad: number) => {
    item.isSliced = true;
    item.isActive = false;
    slicedIndicesRef.current.push(item.index);

    const now = performance.now();

    if (item.type === 'bomb') {
      // BOMB SLICED: -10 coins, screen shake, red flash, explosion
      bombsHitIndicesRef.current.push(item.index);
      setScore((prev) => Math.max(0, prev - 10));

      playBombExplosion();

      // Screen shake (300ms)
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 300);

      // Dark red screen flash (300ms)
      setIsScreenRed(true);
      setTimeout(() => setIsScreenRed(false), 300);

      // Spawn bomb explosion effect from pool
      const explosion = bombExplosionsPoolRef.current.find((b) => !b.active);
      if (explosion) {
        explosion.active = true;
        explosion.x = sliceX;
        explosion.y = sliceY;
        explosion.createdAt = now;
        explosion.scale = 0.2;
        explosion.opacity = 1;
      }

      // Score pop: "-10"
      const scorePop = scorePopsPoolRef.current.find((p) => !p.active);
      if (scorePop) {
        scorePop.active = true;
        scorePop.x = sliceX;
        scorePop.y = sliceY - 15;
        scorePop.text = '−10';
        scorePop.color = '#FF3B30';
        scorePop.fontSize = 34;
        scorePop.createdAt = now;
        scorePop.opacity = 1;
      }
      return;
    }

    // FRUIT SLICED (Pineapple or Mango)
    playFruitSliceHit();
    setTimeout(() => {
      playFruitJuiceSplash();
    }, 25);

    // Track combo in swipe
    currentSwipeSlicedCountRef.current += 1;
    const currentCombo = currentSwipeSlicedCountRef.current;
    lastSliceTimeRef.current = now;

    let pointsToAdd = 1;
    if (currentCombo >= 2) {
      pointsToAdd = currentCombo; // +2 for double, +3 for triple
      playComboBonus();
      setComboBanner({ count: currentCombo, id: now });
      setTimeout(() => {
        setComboBanner((prev) => (prev?.id === now ? null : prev));
      }, 750);
    }

    setScore((prev) => prev + pointsToAdd);

    // Fruit Colors
    const isPineapple = item.type === 'pineapple';
    const mainColor = isPineapple ? '#FFD700' : '#8BC34A';
    const lightColor = isPineapple ? '#FFF176' : '#CDEE1C';
    const darkColor = isPineapple ? '#F57F17' : '#558B2F';

    // 1. Activate Two Halves from Pool
    const leftHalf = itemHalvesPoolRef.current.find(
      (h) => h.id === `half-${item.index}-left`
    );
    const rightHalf = itemHalvesPoolRef.current.find(
      (h) => h.id === `half-${item.index}-right`
    );

    const normalAngle = angleRad + Math.PI / 2;
    const separationSpeed = 220;
    const nx = Math.cos(normalAngle);
    const ny = Math.sin(normalAngle);

    if (leftHalf) {
      leftHalf.active = true;
      leftHalf.x = item.x;
      leftHalf.y = item.y;
      leftHalf.vx = item.vx - nx * separationSpeed;
      leftHalf.vy = item.vy0 * 0.3 - ny * separationSpeed;
      leftHalf.rot = item.rotation;
      leftHalf.rotSpeed = item.rotSpeed - 240;
      leftHalf.sliceAngle = angleRad;
      leftHalf.createdAt = now;
      leftHalf.opacity = 1;
    }

    if (rightHalf) {
      rightHalf.active = true;
      rightHalf.x = item.x;
      rightHalf.y = item.y;
      rightHalf.vx = item.vx + nx * separationSpeed;
      rightHalf.vy = item.vy0 * 0.3 + ny * separationSpeed;
      rightHalf.rot = item.rotation;
      rightHalf.rotSpeed = item.rotSpeed + 240;
      rightHalf.sliceAngle = angleRad;
      rightHalf.createdAt = now;
      rightHalf.opacity = 1;
    }

    // 2. Activate Juice Droplets from Pool (6 droplets)
    const availableDroplets = juiceDropletsPoolRef.current.filter((d) => !d.active);
    for (let i = 0; i < Math.min(6, availableDroplets.length); i++) {
      const drop = availableDroplets[i];
      const dropAngle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 260;

      drop.active = true;
      drop.x = sliceX;
      drop.y = sliceY;
      drop.size = 6 + Math.random() * 8;
      drop.color = mainColor;
      drop.lightColor = lightColor;
      drop.darkColor = darkColor;
      drop.vx = Math.cos(dropAngle) * speed;
      drop.vy = Math.sin(dropAngle) * speed - 60;
      drop.createdAt = now;
      drop.opacity = 1;
    }

    // 3. Activate Juice Splat on Board from Pool
    const splat = juiceSplatsPoolRef.current.find((s) => !s.active);
    if (splat) {
      splat.active = true;
      splat.x = sliceX;
      splat.y = sliceY;
      splat.size = 50 + Math.random() * 25;
      splat.color = mainColor;
      splat.rotation = Math.random() * 360;
      splat.borderRadius = `${40 + Math.random() * 20}% ${35 + Math.random() * 25}% ${
        45 + Math.random() * 20
      }% ${35 + Math.random() * 25}%`;
      splat.createdAt = now;
      splat.opacity = 1;
    }

    // 4. Activate Score Pop-up from Pool
    const scorePop = scorePopsPoolRef.current.find((p) => !p.active);
    if (scorePop) {
      scorePop.active = true;
      scorePop.x = sliceX;
      scorePop.y = sliceY - 10;
      scorePop.text = pointsToAdd > 1 ? `+${pointsToAdd} COMBO!` : '+1';
      scorePop.color = pointsToAdd > 1 ? '#FFE14D' : '#FFFFFF';
      scorePop.fontSize = pointsToAdd > 1 ? 32 : 26;
      scorePop.createdAt = now;
      scorePop.opacity = 1;
    }
  }, []);

  // -------------------------------------------------------------
  // 10. POINTER MOVEMENT & SWIPE DETECTION
  // -------------------------------------------------------------
  const handlePointerMovement = useCallback(
    (x: number, y: number) => {
      if (gameState !== 'playing') return;

      const now = performance.now();
      trailPointsRef.current.push({ x, y, time: now });

      const lastPos = lastPointerPosRef.current;
      if (lastPos) {
        const dx = x - lastPos.x;
        const dy = y - lastPos.y;
        const dist = Math.hypot(dx, dy);

        // Blade swoosh sound throttle (every 140ms when fast swipe)
        if (dist > 28 && now - lastSwooshTimeRef.current > 140) {
          playFruitSwoosh();
          lastSwooshTimeRef.current = now;
        }

        const angle = Math.atan2(dy, dx);

        // Check intersection with all active flying items
        activeItemsRef.current.forEach((item) => {
          if (item.isSliced || item.isRemoved || !item.isActive) return;

          // Item center (pineapple: 25, 37.5; mango: 25, 30; bomb: 25, 25)
          const cx = item.x + 25;
          const cy = item.y + (item.type === 'pineapple' ? 38 : item.type === 'mango' ? 30 : 25);
          const hitRadius = item.type === 'bomb' ? 30 : 38;

          // Line segment to point distance
          const l2 = dist * dist;
          let t = l2 === 0 ? 0 : ((cx - lastPos.x) * dx + (cy - lastPos.y) * dy) / l2;
          t = Math.max(0, Math.min(1, t));

          const projX = lastPos.x + t * dx;
          const projY = lastPos.y + t * dy;
          const dToSegment = Math.hypot(cx - projX, cy - projY);

          if (dToSegment < hitRadius) {
            sliceItem(item, projX, projY, angle);
          }
        });
      }

      lastPointerPosRef.current = { x, y };
    },
    [gameState, sliceItem]
  );

  const handlePointerStart = useCallback((x: number, y: number) => {
    isPointerDownRef.current = true;
    trailFadeStartTimeRef.current = null;
    currentSwipeSlicedCountRef.current = 0;
    trailPointsRef.current = [{ x, y, time: performance.now() }];
    lastPointerPosRef.current = { x, y };
  }, []);

  const handlePointerMove = useCallback(
    (x: number, y: number) => {
      if (isPointerDownRef.current) {
        handlePointerMovement(x, y);
      }
    },
    [handlePointerMovement]
  );

  const handlePointerEnd = useCallback(() => {
    isPointerDownRef.current = false;
    trailFadeStartTimeRef.current = performance.now();
    lastPointerPosRef.current = null;
  }, []);

  // -------------------------------------------------------------
  // 11. ATTACH NON-PASSIVE TOUCH LISTENERS TO KILL SAFARI SCROLL
  // -------------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = container.getBoundingClientRect();
        handlePointerStart(touch.clientX - rect.left, touch.clientY - rect.top);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // Prevents Safari bounce, scroll, pull-to-refresh
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = container.getBoundingClientRect();
        handlePointerMove(touch.clientX - rect.left, touch.clientY - rect.top);
      }
    };

    const onTouchEnd = () => {
      handlePointerEnd();
    };

    const onTouchCancel = () => {
      handlePointerEnd();
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: false });
    container.addEventListener('touchcancel', onTouchCancel, { passive: false });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [handlePointerStart, handlePointerMove, handlePointerEnd]);

  // Desktop Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    handlePointerStart(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    handlePointerMove(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleMouseUp = () => {
    handlePointerEnd();
  };

  // -------------------------------------------------------------
  // 12. GAME LOOP (PHYSICS, CANVAS, HUD) VIA requestAnimationFrame
  // -------------------------------------------------------------
  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'times_up') {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: false });

    const updateLoop = (frameTime: number) => {
      const dt = Math.min((frameTime - lastFrameTimeRef.current) / 1000, 0.05);
      lastFrameTimeRef.current = frameTime;

      const gameElapsed = frameTime - gameStartTimeRef.current - pausedTimeElapsedRef.current;

      // 1. Timer Countdown
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

      // 2. Update Active Items Physics in Portrait
      if (gameState === 'playing') {
        const screenHeight = window.innerHeight;
        activeItemsRef.current.forEach((it) => {
          if (it.isSliced || it.isRemoved) {
            it.isActive = false;
            return;
          }

          const itemElapsed = (gameElapsed - it.appearAtMs) / 1000;
          if (itemElapsed < 0) {
            it.isActive = false;
            it.y = screenHeight + 90;
            return;
          }

          if (itemElapsed > it.flightDuration) {
            it.isRemoved = true;
            it.isActive = false;
            return;
          }

          it.isActive = true;
          it.x = it.startX + it.vx * itemElapsed;
          it.y = it.startY + it.vy0 * itemElapsed + 0.5 * it.gravity * itemElapsed * itemElapsed;
          it.rotation = it.initialRot + it.rotSpeed * itemElapsed;
        });
      }

      // 3. Update Item Halves from Pool
      itemHalvesPoolRef.current.forEach((half) => {
        if (!half.active) return;
        const age = (frameTime - half.createdAt) / 1000;
        if (age > 0.65) {
          half.active = false;
          return;
        }

        half.x += half.vx * dt;
        half.y += half.vy * dt + 0.5 * 1100 * dt * dt;
        half.vy += 1100 * dt;
        half.rot += half.rotSpeed * dt;
        half.opacity = Math.max(0, 1 - age / 0.65);
      });

      // 4. Update Juice Droplets from Pool
      juiceDropletsPoolRef.current.forEach((d) => {
        if (!d.active) return;
        const age = (frameTime - d.createdAt) / 1000;
        if (age > 0.55) {
          d.active = false;
          return;
        }

        d.x += d.vx * dt;
        d.y += d.vy * dt + 0.5 * 850 * dt * dt;
        d.vy += 850 * dt;
        d.opacity = Math.max(0, 1 - age / 0.55);
      });

      // 5. Update Juice Splats from Pool (fade after 2.5s)
      juiceSplatsPoolRef.current.forEach((s) => {
        if (!s.active) return;
        const ageMs = frameTime - s.createdAt;
        if (ageMs > 3500) {
          s.active = false;
          return;
        }
        s.opacity = ageMs > 2000 ? Math.max(0, 1 - (ageMs - 2000) / 1500) : 1;
      });

      // 6. Update Score Pops from Pool
      scorePopsPoolRef.current.forEach((p) => {
        if (!p.active) return;
        const age = (frameTime - p.createdAt) / 1000;
        if (age > 0.55) {
          p.active = false;
          return;
        }
        p.opacity = Math.max(0, 1 - age / 0.55);
      });

      // 7. Update Bomb Explosions from Pool (300ms)
      bombExplosionsPoolRef.current.forEach((b) => {
        if (!b.active) return;
        const ageMs = frameTime - b.createdAt;
        if (ageMs > 300) {
          b.active = false;
          return;
        }
        b.scale = Math.min(1.5, (ageMs / 100) * 1.5);
        b.opacity = Math.max(0, 1 - ageMs / 300);
      });

      // 8. Draw Canvas Blade Trail (Full Screen Overlay)
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

        if (trailPointsRef.current.length > 20) {
          trailPointsRef.current = trailPointsRef.current.slice(-20);
        }

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
            ctx.shadowColor = 'rgba(200, 225, 255, 0.9)';
            ctx.shadowBlur = 8;
            ctx.strokeStyle = `rgba(255, 255, 255, ${(0.2 + progress * 0.8) * trailOpacity})`;
            ctx.stroke();
          }

          // Glowing tip flare
          const tip = activeTrail[activeTrail.length - 1];
          ctx.beginPath();
          ctx.arc(tip.x, tip.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${trailOpacity})`;
          ctx.shadowColor = 'rgba(220, 240, 255, 1)';
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
  // 13. TAB BACKGROUNDING & PAUSE HANDLING
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
  // 14. WOODEN CUTTING BOARD BACKGROUND
  // -------------------------------------------------------------
  const renderWoodenBoard = () => (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
      {/* Alternating vertical wood planks */}
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

      {/* Decorative Pre-drawn Slash Marks on Board */}
      <svg className="absolute inset-0 w-full h-full opacity-40 overflow-visible">
        <line
          x1="18%"
          y1="22%"
          x2="32%"
          y2="38%"
          stroke="#1E120A"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="drop-shadow(0 1px 1px rgba(255,255,255,0.08))"
        />
        <line
          x1="65%"
          y1="16%"
          x2="80%"
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
          x1="78%"
          y1="64%"
          x2="90%"
          y2="82%"
          stroke="#1E120A"
          strokeWidth="2"
          strokeLinecap="round"
          filter="drop-shadow(0 1px 1px rgba(255,255,255,0.08))"
        />
        <line
          x1="12%"
          y1="68%"
          x2="26%"
          y2="84%"
          stroke="#1E120A"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="drop-shadow(0 1px 1px rgba(255,255,255,0.08))"
        />
      </svg>
    </div>
  );

  // -------------------------------------------------------------
  // RENDER: ALREADY PLAYED TODAY SCREEN
  // -------------------------------------------------------------
  if (gameState === 'already_played' && alreadyPlayedData) {
    return (
      <div className="game-container flex items-center justify-center overflow-hidden select-none">
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
      <div className="game-container flex flex-col items-center justify-center overflow-hidden select-none">
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
            {gameState === 'loading' ? 'LOADING...' : 'PLAY'}
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
      <div className="game-container flex items-center justify-center overflow-hidden select-none">
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
  // RENDER: ACTIVE GAMEPLAY / PAUSED / RESULT (PORTRAIT)
  // -------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`game-container cursor-crosshair ${
        isShaking ? 'animate-[shake_0.05s_ease-in-out_infinite]' : ''
      }`}
    >
      {/* 1. Wooden Cutting Board Background */}
      {renderWoodenBoard()}

      {/* 2. Juice Splats on Board (Pooled, translate3d GPU accelerated) */}
      {juiceSplatsPoolRef.current.map((splat) => {
        if (!splat.active) return null;

        return (
          <div
            key={splat.id}
            className="absolute top-0 left-0 pointer-events-none transition-transform"
            style={{
              transform: `translate3d(${splat.x - splat.size / 2}px, ${splat.y - splat.size / 2}px, 0) rotate(${splat.rotation}deg)`,
              width: `${splat.size}px`,
              height: `${splat.size}px`,
              backgroundColor: splat.color,
              borderRadius: splat.borderRadius,
              opacity: splat.opacity,
            }}
          />
        );
      })}

      {/* 3. Flying Active Fruits & Bombs (Pre-allocated pool, translate3d, will-change: transform) */}
      {activeItemsRef.current.map((item) => {
        if (!item.isActive) return null;

        return (
          <div
            key={item.index}
            className="absolute top-0 left-0 pointer-events-none"
            style={{
              transform: `translate3d(${item.x}px, ${item.y}px, 0) rotate(${item.rotation}deg)`,
              willChange: 'transform',
            }}
          >
            <FruitGraphic type={item.type} />
          </div>
        );
      })}

      {/* 4. Sliced Fruit Halves (Pre-allocated pool, translate3d) */}
      {itemHalvesPoolRef.current.map((half) => {
        if (!half.active) return null;

        return (
          <div
            key={half.id}
            className="absolute top-0 left-0 pointer-events-none"
            style={{
              transform: `translate3d(${half.x}px, ${half.y}px, 0) rotate(${half.rot}deg)`,
              opacity: half.opacity,
              willChange: 'transform',
            }}
          >
            <FruitGraphic type={half.type} clipSide={half.side} />
          </div>
        );
      })}

      {/* 5. Bomb Explosion Animations (Pre-allocated pool) */}
      {bombExplosionsPoolRef.current.map((exp) => {
        if (!exp.active) return null;

        return (
          <div
            key={exp.id}
            className="absolute top-0 left-0 pointer-events-none z-30"
            style={{
              transform: `translate3d(${exp.x - 100}px, ${exp.y - 100}px, 0) scale(${exp.scale})`,
              width: '200px',
              height: '200px',
              opacity: exp.opacity,
              background: 'radial-gradient(circle, #FF4500 0%, #FF8C00 45%, transparent 70%)',
              willChange: 'transform, opacity',
            }}
          />
        );
      })}

      {/* 6. Juice Droplets (Pre-allocated pool, translate3d) */}
      {juiceDropletsPoolRef.current.map((drop) => {
        if (!drop.active) return null;

        return (
          <div
            key={drop.id}
            className="absolute top-0 left-0 pointer-events-none rounded-full"
            style={{
              transform: `translate3d(${drop.x - drop.size / 2}px, ${drop.y - drop.size / 2}px, 0)`,
              width: `${drop.size}px`,
              height: `${drop.size}px`,
              background: `radial-gradient(circle at 35% 35%, ${drop.lightColor}, ${drop.color} 70%, ${drop.darkColor} 100%)`,
              opacity: drop.opacity,
              willChange: 'transform',
            }}
          />
        );
      })}

      {/* 7. Score Pop-ups (Pre-allocated pool, translate3d) */}
      {scorePopsPoolRef.current.map((pop) => {
        if (!pop.active) return null;

        return (
          <div
            key={pop.id}
            className="absolute top-0 left-0 pointer-events-none font-anton tracking-wide select-none z-40"
            style={{
              transform: `translate3d(${pop.x}px, ${pop.y}px, 0) translate(-50%, -50%)`,
              fontSize: `${pop.fontSize}px`,
              color: pop.color,
              opacity: pop.opacity,
              textShadow: '0 2px 8px rgba(0,0,0,0.85)',
              willChange: 'transform, opacity',
            }}
          >
            {pop.text}
          </div>
        );
      })}

      {/* 8. Canvas Blade Trail (Full Screen Overlay) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none w-full h-full z-20"
      />

      {/* 9. PORTRAIT HUD: Score Top-Left, Pause Top-Center, Timer Top-Right */}
      <div className="absolute inset-x-0 top-0 pt-4 px-4 flex justify-between items-center pointer-events-none z-30">
        {/* Score Top-Left: "🍍 XX" in gold Anton, 28px */}
        <div className="flex items-center gap-2 bg-black/45 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20">
          <span className="text-xl">🍍</span>
          <span
            className="text-[28px] font-anton text-[#FFC93C] tracking-wide leading-none"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
          >
            {score}
          </span>
        </div>

        {/* Pause Button Top-Center */}
        <div className="pointer-events-auto">
          <button
            onClick={handlePause}
            className="w-10 h-10 rounded-full bg-black/45 border border-white/25 flex items-center justify-center text-white hover:bg-black/60 active:scale-95 transition-transform"
            aria-label="Pause Game"
          >
            <span className="text-sm">⏸</span>
          </button>
        </div>

        {/* Timer Top-Right: "0:XX" in gold Anton, 28px, red in last 5 seconds */}
        <div className="bg-black/45 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20">
          <span
            className={`text-[28px] font-anton tracking-widest leading-none ${
              timeLeft <= 5 ? 'text-[#FF3B30] animate-pulse' : 'text-[#FFC93C]'
            }`}
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
          >
            0:{timeLeft.toString().padStart(2, '0')}
          </span>
        </div>
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
