'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CoinIcon } from '@/components/CoinIcon';
import { createClient } from '@/lib/supabase/client';
import { BottleType, BottleSpawn } from '@/lib/bottleTypes';
import {
  initAudioContext,
  playBladeSwoosh,
  playSliceHit,
  playJuiceSplash,
  playGoldBonus,
  playExpiredThud,
  playComboChime,
} from '@/lib/sound';

interface ActiveBottle {
  index: number;
  type: BottleType;
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

interface BottleHalf {
  id: string;
  type: BottleType;
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
  | 'expired_hit'
  | 'times_up'
  | 'result'
  | 'already_played';

// -------------------------------------------------------------
// BOTTLE SVG DRAWING (Zee Sip Authentic Design)
// -------------------------------------------------------------
function BottleGraphic({
  type,
  clipSide,
}: {
  type: BottleType;
  clipSide?: 'left' | 'right';
}) {
  const liquidColor =
    type === 'mango'
      ? '#CDEE1C'
      : type === 'pineapple'
      ? '#FFE14D'
      : type === 'gold'
      ? '#FFC93C'
      : '#555555';

  const capColor =
    type === 'mango'
      ? '#8FC31F'
      : type === 'pineapple'
      ? '#F5B800'
      : type === 'gold'
      ? '#B8860B'
      : '#333333';

  const labelBg =
    type === 'mango'
      ? '#8FC31F'
      : type === 'pineapple'
      ? '#F5B800'
      : type === 'gold'
      ? '#B8860B'
      : '#333333';

  const labelText =
    type === 'mango' ? 'M' : type === 'pineapple' ? 'P' : type === 'gold' ? '★' : 'X';

  const labelTextColor =
    type === 'mango'
      ? '#2D4404'
      : type === 'pineapple'
      ? '#594300'
      : type === 'gold'
      ? '#FFF'
      : '#B92429';

  return (
    <div
      className={`relative w-[46px] h-[82px] select-none pointer-events-none transition-transform ${
        type === 'gold' ? 'animate-pulse' : ''
      }`}
      style={{
        filter:
          type === 'gold'
            ? 'drop-shadow(0 0 16px rgba(255,201,60,0.9))'
            : type === 'expired'
            ? 'drop-shadow(0 0 14px rgba(0,0,0,0.85))'
            : undefined,
        clipPath:
          clipSide === 'left'
            ? 'polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)'
            : clipSide === 'right'
            ? 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)'
            : undefined,
      }}
    >
      <svg
        width="46"
        height="82"
        viewBox="0 0 46 82"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <defs>
          <clipPath id="bottleBodyClip">
            <path d="M 15 16 C 15 14, 17 12, 19 12 L 27 12 C 29 12, 31 14, 31 16 L 33 26 C 36 29, 39 33, 39 38 L 39 68 C 39 74, 35 78, 29 78 L 17 78 C 11 78, 7 74, 7 68 L 7 38 C 7 33, 10 29, 13 26 Z" />
          </clipPath>
        </defs>

        {/* Clear Glass Body Outline */}
        <path
          d="M 15 16 C 15 14, 17 12, 19 12 L 27 12 C 29 12, 31 14, 31 16 L 33 26 C 36 29, 39 33, 39 38 L 39 68 C 39 74, 35 78, 29 78 L 17 78 C 11 78, 7 74, 7 68 L 7 38 C 7 33, 10 29, 13 26 Z"
          fill="rgba(255, 255, 255, 0.12)"
          stroke="rgba(255, 255, 255, 0.55)"
          strokeWidth="1.2"
        />

        {/* Colored Liquid (bottom ~75% of body) */}
        <g clipPath="url(#bottleBodyClip)">
          <rect x="0" y="28" width="46" height="54" fill={liquidColor} />
          {/* Surface liquid shimmer */}
          <ellipse cx="23" cy="28" rx="14" ry="2.5" fill="rgba(255,255,255,0.3)" />
        </g>

        {/* Crack lines on expired bottle */}
        {type === 'expired' && (
          <g stroke="#1F1F1F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 12 34 L 20 44 L 14 56 M 34 46 L 24 60 L 30 72" />
          </g>
        )}

        {/* Label Badge */}
        <g>
          <circle cx="23" cy="48" r="11" fill={labelBg} stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
          <text
            x="23"
            y={type === 'gold' ? '52' : '53'}
            fill={labelTextColor}
            fontSize={type === 'gold' ? '12' : '13'}
            fontWeight="900"
            fontFamily="Arial, sans-serif"
            textAnchor="middle"
          >
            {labelText}
          </text>
        </g>

        {/* Left Side Glass Highlight / Reflection */}
        <rect
          x="10"
          y="26"
          width="3"
          height="44"
          rx="1.5"
          fill="white"
          fillOpacity="0.28"
          pointerEvents="none"
        />

        {/* Neck & Cap */}
        <rect x="19" y="8" width="8" height="6" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.5)" />
        <rect x="17" y="3" width="12" height="6" rx="2" fill={capColor} stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />
      </svg>
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
  const [comboBanner, setComboBanner] = useState<{ count: number; id: number } | null>(null);

  // Results State
  const [resultData, setResultData] = useState<{
    coinsWon: number;
    bottlesSliced: number;
    totalBottles: number;
    hitExpired: boolean;
    newBalance: number;
  }>({
    coinsWon: 0,
    bottlesSliced: 0,
    totalBottles: 22,
    hitExpired: false,
    newBalance: 0,
  });

  const [alreadyPlayedData, setAlreadyPlayedData] = useState<{
    bottlesSliced: number;
    totalBottles: number;
    coinsWon: number;
    nextAvailable: string;
  } | null>(null);

  const [midnightCountdown, setMidnightCountdown] = useState('00:00:00');

  // DOM Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Game Engine Refs
  const gameIdRef = useRef<string | null>(null);
  const bottleSpawnsRef = useRef<BottleSpawn[]>([]);
  const activeBottlesRef = useRef<ActiveBottle[]>([]);
  const bottleHalvesRef = useRef<BottleHalf[]>([]);
  const juiceDropletsRef = useRef<JuiceDroplet[]>([]);
  const juiceSplatsRef = useRef<JuiceSplat[]>([]);
  const scorePopsRef = useRef<ScorePop[]>([]);
  const slicedIndicesRef = useRef<number[]>([]);
  const hitExpiredRef = useRef(false);

  // Input & Blade Trail Refs
  const isPointerDownRef = useRef(false);
  const trailPointsRef = useRef<TrailPoint[]>([]);
  const lastSwooshTimeRef = useRef(0);
  const currentSwipeSlicedCountRef = useRef(0);
  const lastSliceTimeRef = useRef(0);

  // Time & Physics Refs
  const gameStartTimeRef = useRef(0);
  const pausedTimeElapsedRef = useRef(0);
  const pauseStartRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);

  // Re-render triggers for visual elements
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

    // Try orientation lock if supported
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
      // IST offset: UTC+5:30
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
  // 6. START GAME SESSION (API CALL & COUNTDOWN)
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
          bottlesSliced: data.today_result?.bottles_sliced ?? data.bottles_sliced ?? 0,
          totalBottles: data.today_result?.total_bottles ?? data.total_bottles ?? 22,
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
      bottleSpawnsRef.current = data.bottles || [];
      activeBottlesRef.current = [];
      bottleHalvesRef.current = [];
      juiceDropletsRef.current = [];
      juiceSplatsRef.current = [];
      scorePopsRef.current = [];
      slicedIndicesRef.current = [];
      hitExpiredRef.current = false;
      setScore(0);
      setTimeLeft(30);

      // Start 3-2-1 Countdown
      setGameState('countdown');
      setCountdownNum(3);
      playBladeSwoosh();

      setTimeout(() => {
        setCountdownNum(2);
        playBladeSwoosh();
      }, 700);

      setTimeout(() => {
        setCountdownNum(1);
        playBladeSwoosh();
      }, 1400);

      setTimeout(() => {
        setCountdownNum('SLICE!');
        playSliceHit();
      }, 2100);

      setTimeout(() => {
        startActiveGameplay();
      }, 2600);
    } catch {
      setGameState('start');
    }
  };

  // -------------------------------------------------------------
  // 7. START ACTIVE GAMEPLAY
  // -------------------------------------------------------------
  const startActiveGameplay = () => {
    setGameState('playing');
    const now = performance.now();
    gameStartTimeRef.current = now;
    pausedTimeElapsedRef.current = 0;
    lastFrameTimeRef.current = now;

    // Convert spawned data into active bottles physics metadata
    const width = window.innerWidth;
    const height = window.innerHeight;

    activeBottlesRef.current = bottleSpawnsRef.current.map((sp) => {
      const startX = (sp.start_x_percent / 100) * width;
      const startY = height + 90; // Start off-screen at bottom
      const peakY = (sp.peak_height_percent / 100) * height; // 30% to 70% from top
      const flightDuration = 2.2; // ~2.2s flight
      const tPeak = flightDuration / 2;

      // Physics: peakY = startY - 0.5 * gravity * tPeak^2
      // gravity = 2 * (startY - peakY) / (tPeak^2)
      const gravity = (2 * (startY - peakY)) / (tPeak * tPeak);
      const vy0 = -gravity * tPeak;
      const vx = (sp.velocity_x / 100) * width; // horizontal drift

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
        initialRot: (Math.random() - 0.5) * 40,
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
  // 8. COMPLETE GAME (FINISH OR EXPIRED HIT)
  // -------------------------------------------------------------
  const completeGame = useCallback(
    async (isExpired: boolean) => {
      if (gameState === 'result') return;

      const gameId = gameIdRef.current;
      const sliced = [...slicedIndicesRef.current];

      try {
        const res = await fetch('/api/games/sip-slice/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game_id: gameId,
            sliced_indices: sliced,
            hit_expired: isExpired,
            ended_at_ms: Math.round(performance.now() - gameStartTimeRef.current),
          }),
        });

        const data = await res.json();
        setResultData({
          coinsWon: data.coins_won ?? Math.max(1, score),
          bottlesSliced: data.bottles_sliced ?? sliced.length,
          totalBottles: data.total_bottles ?? bottleSpawnsRef.current.length ?? 22,
          hitExpired: isExpired,
          newBalance: data.new_balance ?? 0,
        });
      } catch {
        setResultData({
          coinsWon: Math.max(1, score),
          bottlesSliced: sliced.length,
          totalBottles: bottleSpawnsRef.current.length || 22,
          hitExpired: isExpired,
          newBalance: 0,
        });
      }

      setGameState('result');
    },
    [gameState, score]
  );

  // -------------------------------------------------------------
  // 9. SLICE LOGIC & VISUAL GENERATION
  // -------------------------------------------------------------
  const sliceBottle = useCallback(
    (bottle: ActiveBottle, sliceX: number, sliceY: number, angleRad: number) => {
      bottle.isSliced = true;
      slicedIndicesRef.current.push(bottle.index);

      // Score points
      let points = 1;
      let scoreColor = '#FFFFFF';
      let fontSize = 28;

      if (bottle.type === 'gold') {
        points = 3;
        scoreColor = '#FFC93C';
        fontSize = 34;
      } else if (bottle.type === 'expired') {
        points = -3;
        scoreColor = '#B92429';
      }

      setScore((prev) => Math.max(0, prev + points));

      // Pop-up text
      scorePopsRef.current.push({
        id: `pop_${bottle.index}_${Date.now()}`,
        x: sliceX,
        y: sliceY,
        text: points > 0 ? `+${points}` : `${points}`,
        color: scoreColor,
        fontSize,
        createdAt: performance.now(),
      });

      // Sound Effects & Expired Logic
      if (bottle.type === 'expired') {
        hitExpiredRef.current = true;
        playExpiredThud();

        // Expired Sequence: freeze bottles, flash red, show EXPIRED! text, 1s pause
        setGameState('expired_hit');
        setTimeout(() => {
          completeGame(true);
        }, 1100);
      } else if (bottle.type === 'gold') {
        playSliceHit();
        playJuiceSplash();
        playGoldBonus();
      } else {
        playSliceHit();
        playJuiceSplash();
      }

      // Combo Tracking
      const now = performance.now();
      if (now - lastSliceTimeRef.current < 250) {
        currentSwipeSlicedCountRef.current += 1;
      } else {
        currentSwipeSlicedCountRef.current = 1;
      }
      lastSliceTimeRef.current = now;

      if (currentSwipeSlicedCountRef.current >= 2) {
        playComboChime();
        setComboBanner({
          count: currentSwipeSlicedCountRef.current,
          id: Date.now(),
        });
      }

      // Slice Visuals:
      // A. Bottle Halves
      const cutAngleDeg = (angleRad * 180) / Math.PI;
      bottleHalvesRef.current.push({
        id: `half_l_${bottle.index}_${Date.now()}`,
        type: bottle.type,
        x: bottle.x,
        y: bottle.y,
        side: 'left',
        sliceAngle: cutAngleDeg,
        vx: -130 - Math.random() * 40,
        vy: -80 - Math.random() * 60,
        rot: bottle.rotation,
        rotSpeed: -200 - Math.random() * 100,
        createdAt: performance.now(),
      });

      bottleHalvesRef.current.push({
        id: `half_r_${bottle.index}_${Date.now()}`,
        type: bottle.type,
        x: bottle.x,
        y: bottle.y,
        side: 'right',
        sliceAngle: cutAngleDeg,
        vx: 130 + Math.random() * 40,
        vy: -80 - Math.random() * 60,
        rot: bottle.rotation,
        rotSpeed: 200 + Math.random() * 100,
        createdAt: performance.now(),
      });

      // B. Juice Splat on Board
      const splatColor =
        bottle.type === 'mango'
          ? 'rgba(205, 238, 28, 0.75)'
          : bottle.type === 'pineapple'
          ? 'rgba(255, 225, 77, 0.75)'
          : bottle.type === 'gold'
          ? 'rgba(255, 201, 60, 0.85)'
          : 'rgba(50, 42, 38, 0.85)';

      const r1 = 35 + Math.floor(Math.random() * 30);
      const r2 = 35 + Math.floor(Math.random() * 30);
      const r3 = 35 + Math.floor(Math.random() * 30);
      const r4 = 35 + Math.floor(Math.random() * 30);
      const r5 = 35 + Math.floor(Math.random() * 30);
      const r6 = 35 + Math.floor(Math.random() * 30);
      const r7 = 35 + Math.floor(Math.random() * 30);
      const r8 = 35 + Math.floor(Math.random() * 30);

      juiceSplatsRef.current.push({
        id: `splat_${bottle.index}_${Date.now()}`,
        x: sliceX,
        y: sliceY,
        size: 75 + Math.random() * 35,
        color: splatColor,
        borderRadius: `${r1}% ${r2}% ${r3}% ${r4}% / ${r5}% ${r6}% ${r7}% ${r8}%`,
        rotation: Math.random() * 360,
        createdAt: performance.now(),
      });

      // C. Juice Droplets (14-18 droplets with 3D spherical radial gradient)
      const dropletCount = 14 + Math.floor(Math.random() * 5);
      const baseColor =
        bottle.type === 'mango'
          ? '#CDEE1C'
          : bottle.type === 'pineapple'
          ? '#FFE14D'
          : bottle.type === 'gold'
          ? '#FFC93C'
          : '#4A3E39';
      const lightColor =
        bottle.type === 'mango'
          ? '#E9FFA8'
          : bottle.type === 'pineapple'
          ? '#FFF4B8'
          : bottle.type === 'gold'
          ? '#FFF4AA'
          : '#887B75';
      const darkColor =
        bottle.type === 'mango'
          ? '#8FC31F'
          : bottle.type === 'pineapple'
          ? '#E5A500'
          : bottle.type === 'gold'
          ? '#C48800'
          : '#261F1B';

      for (let i = 0; i < dropletCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 160 + Math.random() * 260;
        juiceDropletsRef.current.push({
          id: `drop_${bottle.index}_${i}_${Date.now()}`,
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
    },
    [completeGame]
  );

  // -------------------------------------------------------------
  // 10. HIT DETECTION ON POINTER MOVE (Circle-Line Intersection)
  // -------------------------------------------------------------
  const handlePointerMovement = useCallback(
    (clientX: number, clientY: number) => {
      if (gameState !== 'playing') return;

      const now = performance.now();
      trailPointsRef.current.push({ x: clientX, y: clientY, time: now });

      // Throttle blade swoosh sound on swipes
      if (now - lastSwooshTimeRef.current > 130) {
        playBladeSwoosh();
        lastSwooshTimeRef.current = now;
      }

      const points = trailPointsRef.current;
      if (points.length < 2) return;

      const p1 = points[points.length - 2];
      const p2 = points[points.length - 1];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const segLenSq = dx * dx + dy * dy;
      if (segLenSq === 0) return;

      const sliceAngleRad = Math.atan2(dy, dx);
      const hitRadius = 32; // ~70% of 46px/82px bottle

      // Check all active unsliced bottles
      for (const bottle of activeBottlesRef.current) {
        if (bottle.isSliced || bottle.isRemoved) continue;

        // Bottle center
        const bx = bottle.x + 23;
        const by = bottle.y + 41;

        // Project bottle center onto line segment p1 -> p2
        const t = Math.max(0, Math.min(1, ((bx - p1.x) * dx + (by - p1.y) * dy) / segLenSq));
        const projX = p1.x + t * dx;
        const projY = p1.y + t * dy;

        const distSq = (bx - projX) * (bx - projX) + (by - projY) * (by - projY);

        if (distSq <= hitRadius * hitRadius) {
          sliceBottle(bottle, projX, projY, sliceAngleRad);
        }
      }
    },
    [gameState, sliceBottle]
  );

  // -------------------------------------------------------------
  // 11. MAIN RAF GAME LOOP (PHYSICS, CANVAS BLADE, DOM PARTICLES)
  // -------------------------------------------------------------
  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'expired_hit' && gameState !== 'times_up') {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    const updateLoop = (frameTime: number) => {
      const dt = Math.min((frameTime - lastFrameTimeRef.current) / 1000, 0.05);
      lastFrameTimeRef.current = frameTime;

      const gameElapsed = frameTime - gameStartTimeRef.current - pausedTimeElapsedRef.current;

      // 1. Update Game Timer
      if (gameState === 'playing') {
        const remaining = Math.max(0, 30 - gameElapsed / 1000);
        setTimeLeft(Math.ceil(remaining));

        if (remaining <= 0) {
          setGameState('times_up');
          setTimeout(() => {
            completeGame(false);
          }, 1100);
        }
      }

      // 2. Update Active Bottles Physics
      if (gameState === 'playing') {
        const screenHeight = window.innerHeight;
        activeBottlesRef.current.forEach((b) => {
          if (b.isSliced || b.isRemoved) return;

          const bottleElapsed = (gameElapsed - b.appearAtMs) / 1000;
          if (bottleElapsed < 0) {
            // Not appeared yet
            b.y = screenHeight + 100;
            return;
          }

          if (bottleElapsed > b.flightDuration) {
            // Fallen off bottom of screen
            b.isRemoved = true;
            return;
          }

          // Parabolic trajectory: y = startY + vy0 * t + 0.5 * gravity * t^2
          b.x = b.startX + b.vx * bottleElapsed;
          b.y = b.startY + b.vy0 * bottleElapsed + 0.5 * b.gravity * bottleElapsed * bottleElapsed;
          b.rotation = b.initialRot + b.rotSpeed * bottleElapsed;
        });
      }

      // 3. Update Bottle Halves
      bottleHalvesRef.current = bottleHalvesRef.current.filter((half) => {
        const age = (frameTime - half.createdAt) / 1000;
        if (age > 0.65) return false;

        half.x += half.vx * dt;
        half.y += half.vy * dt + 0.5 * 1100 * dt * dt;
        half.vy += 1100 * dt; // Gravity
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

      // 5. Clean up old splats (keep for 3.5s then fade)
      juiceSplatsRef.current = juiceSplatsRef.current.filter((s) => {
        return frameTime - s.createdAt < 4000;
      });

      // 6. Clean up score popups (fade after 550ms)
      scorePopsRef.current = scorePopsRef.current.filter((p) => {
        return frameTime - p.createdAt < 550;
      });

      // 7. Draw Canvas Blade Trail (Smooth Tapered Quadratic Curve)
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Filter out points older than 180ms
        const activeTrail = trailPointsRef.current.filter(
          (p) => frameTime - p.time < 180
        );
        trailPointsRef.current = activeTrail;

        if (activeTrail.length >= 2) {
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          // Draw segmented tapered blade with glowing core
          for (let i = 0; i < activeTrail.length - 1; i++) {
            const progress = i / (activeTrail.length - 1); // 0 (tail) to 1 (finger)
            const pCurrent = activeTrail[i];
            const pNext = activeTrail[i + 1];

            ctx.beginPath();
            ctx.moveTo(pCurrent.x, pCurrent.y);
            ctx.lineTo(pNext.x, pNext.y);

            // Width: 1px at tail -> 8.5px at finger tip
            ctx.lineWidth = 1 + progress * 7.5;

            // White core with blue-white neon glow
            ctx.shadowColor = 'rgba(195, 225, 255, 0.9)';
            ctx.shadowBlur = 8;
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 + progress * 0.75})`;
            ctx.stroke();
          }

          // Tip glow flare
          const tip = activeTrail[activeTrail.length - 1];
          ctx.beginPath();
          ctx.arc(tip.x, tip.y, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = 'rgba(215, 235, 255, 1)';
          ctx.shadowBlur = 12;
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
  // 13. TOUCH & MOUSE INPUT BINDINGS ON CONTAINER
  // -------------------------------------------------------------
  const handleTouchStart = (e: React.TouchEvent) => {
    initAudioContext();
    isPointerDownRef.current = true;
    currentSwipeSlicedCountRef.current = 0;
    const touch = e.touches[0];
    if (touch) {
      trailPointsRef.current = [{ x: touch.clientX, y: touch.clientY, time: performance.now() }];
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      handlePointerMovement(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = () => {
    isPointerDownRef.current = false;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    initAudioContext();
    isPointerDownRef.current = true;
    currentSwipeSlicedCountRef.current = 0;
    trailPointsRef.current = [{ x: e.clientX, y: e.clientY, time: performance.now() }];
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPointerDownRef.current) {
      handlePointerMovement(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    isPointerDownRef.current = false;
  };

  // -------------------------------------------------------------
  // 14. WOODEN CUTTING BOARD BACKGROUND COMPONENT
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

      {/* Subtle Wood Grain Overlay */}
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
            'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.45) 80%, rgba(0,0,0,0.75) 100%)',
        }}
      />

      {/* Decorative Pre-drawn Diagonal Slash Marks */}
      <svg className="absolute inset-0 w-full h-full opacity-40 overflow-visible">
        <line
          x1="18%"
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
          y1="15%"
          x2="82%"
          y2="32%"
          stroke="#1E120A"
          strokeWidth="2"
          strokeLinecap="round"
          filter="drop-shadow(0 1px 1px rgba(255,255,255,0.08))"
        />
        <line
          x1="45%"
          y1="55%"
          x2="35%"
          y2="72%"
          stroke="#1E120A"
          strokeWidth="2.2"
          strokeLinecap="round"
          filter="drop-shadow(0 1px 1px rgba(255,255,255,0.08))"
        />
        <line
          x1="82%"
          y1="65%"
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
          x1="50%"
          y1="18%"
          x2="62%"
          y2="36%"
          stroke="#1E120A"
          strokeWidth="2"
          strokeLinecap="round"
          filter="drop-shadow(0 1px 1px rgba(255,255,255,0.08))"
        />
        <line
          x1="30%"
          y1="42%"
          x2="44%"
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
        {/* Animated Phone Rotate Icon */}
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
          ROTATE TO LANDSCAPE
        </h2>
        <p className="text-gray-300 max-w-xs text-sm mb-6 leading-relaxed">
          Sip Slice is built for landscape mode. Rotate your phone sideways to unlock the full Fruit
          Ninja slicing action!
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
            TODAY&apos;S SLICE
          </h2>
          <p className="text-xs text-gray-500 mb-4">You have already completed your daily slice!</p>

          <div className="bg-[#FFF8F0] border border-[#FFE14D]/50 rounded-2xl p-4 mb-5">
            <div className="text-sm font-semibold text-gray-700 mb-1">
              Bottles Sliced: {alreadyPlayedData.bottlesSliced} / {alreadyPlayedData.totalBottles}
            </div>
            <div className="text-lg font-anton text-[#B92429] flex items-center justify-center gap-1.5">
              <span>Earned +{alreadyPlayedData.coinsWon} Sip Coins</span>
            </div>
          </div>

          <div className="mb-5">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              Next slice available in
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
          {/* Title */}
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

          <p className="text-white/80 text-sm font-medium mb-8" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
            Swipe across flying bottles to slice them for coins!
          </p>

          {/* START Button */}
          <button
            onClick={handleStartGame}
            disabled={gameState === 'loading'}
            className="w-56 py-3.5 bg-[#B92429] hover:bg-[#9E1B20] active:scale-95 text-white font-anton text-2xl tracking-widest rounded-2xl shadow-xl transition-transform animate-pulse flex items-center justify-center"
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
  // RENDER: ACTIVE GAMEPLAY / PAUSED / RESULT / TIMES UP
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
      className="fixed inset-0 w-screen h-screen overflow-hidden select-none touch-none cursor-crosshair"
      style={{
        WebkitTouchCallout: 'none',
        userSelect: 'none',
      }}
    >
      {/* 1. Wooden Cutting Board Background */}
      {renderWoodenBoard()}

      {/* 2. Juice Splats on Background */}
      {juiceSplatsRef.current.map((splat) => {
        const ageMs = performance.now() - splat.createdAt;
        const opacity = ageMs > 2500 ? Math.max(0, 1 - (ageMs - 2500) / 1500) : 1;

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

      {/* 3. Flying Active Bottles (DOM Elements with requestAnimationFrame transforms) */}
      {activeBottlesRef.current.map((bottle) => {
        if (bottle.isSliced || bottle.isRemoved) return null;

        return (
          <div
            key={bottle.index}
            className="absolute pointer-events-none will-change-transform"
            style={{
              left: `${bottle.x}px`,
              top: `${bottle.y}px`,
              transform: `rotate(${bottle.rotation}deg)`,
            }}
          >
            <BottleGraphic type={bottle.type} />
          </div>
        );
      })}

      {/* 4. Sliced Bottle Halves (Falling apart outward with gravity) */}
      {bottleHalvesRef.current.map((half) => {
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
            <BottleGraphic type={half.type} clipSide={half.side} />
          </div>
        );
      })}

      {/* 5. 3D Juice Droplets */}
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

      {/* 6. Score Pop-ups */}
      {scorePopsRef.current.map((pop) => {
        const age = (performance.now() - pop.createdAt) / 1000;
        const opacity = Math.max(0, 1 - age / 0.55);
        const floatY = age * 90; // Float up 50px

        return (
          <div
            key={pop.id}
            className="absolute pointer-events-none font-anton tracking-wide select-none will-change-transform"
            style={{
              left: `${pop.x}px`,
              top: `${pop.y - floatY}px`,
              fontSize: `${pop.fontSize}px`,
              color: pop.color,
              opacity,
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {pop.text}
          </div>
        );
      })}

      {/* 7. Canvas Blade Trail (Overlay for drawing smooth blade line) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none w-full h-full z-20"
      />

      {/* 8. HUD: Score (Top-Left) & Timer (Top-Right) & Pause Button (Bottom-Left) */}
      <div className="absolute inset-x-0 top-0 p-4 flex justify-between items-center pointer-events-none z-30">
        {/* Score Top-Left */}
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
          <CoinIcon size={24} />
          <span
            className="text-3xl font-anton text-[#FFC93C] tracking-wide"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
          >
            {score}
          </span>
        </div>

        {/* Timer Top-Right */}
        <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
          <span
            className="text-3xl font-anton text-[#FFC93C] tracking-widest"
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
          className="w-10 h-10 rounded-full bg-black/40 border border-white/25 flex items-center justify-center text-white hover:bg-black/60 active:scale-95 transition-transform"
          aria-label="Pause Game"
        >
          <span className="font-mono font-black text-sm tracking-tighter">II</span>
        </button>
      </div>

      {/* 9. Combo Banner */}
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

      {/* 10. Expired Hit Red Overlay & Slang Text */}
      {gameState === 'expired_hit' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#B92429]/40 backdrop-blur-xs animate-fade-in pointer-events-none">
          <h1
            className="text-6xl font-anton text-[#B92429] tracking-wider uppercase animate-bounce"
            style={{
              textShadow:
                '-2px -2px 0 #FFF, 2px -2px 0 #FFF, -2px 2px 0 #FFF, 2px 2px 0 #FFF, 0 6px 20px rgba(0,0,0,0.9)',
            }}
          >
            EXPIRED!
          </h1>
        </div>
      )}

      {/* 11. Time&apos;s Up Text Banner */}
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

      {/* 12. PAUSE OVERLAY */}
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

      {/* 13. RESULT SCREEN OVERLAY */}
      {gameState === 'result' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 pointer-events-auto select-none">
          <div className="relative bg-white rounded-[24px] p-6 max-w-sm w-full mx-auto text-center shadow-2xl border border-white/40">
            {/* Close Cross Top-Right */}
            <Link
              href="/home"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full"
            >
              ×
            </Link>

            {/* Header Title */}
            <h2 className="text-2xl font-anton text-[#B92429] tracking-wide mb-1 uppercase">
              {resultData.hitExpired ? 'OOPS — EXPIRED BOTTLE!' : "TIME'S UP!"}
            </h2>

            <div className="w-12 h-0.5 bg-gray-200 mx-auto my-2.5" />

            {/* Bottles sliced */}
            <p className="text-xs text-gray-500 font-semibold mb-3">
              Bottles sliced: {resultData.bottlesSliced} / {resultData.totalBottles}
            </p>

            {/* Animated Coin Bounce */}
            <div className="my-2 flex justify-center animate-bounce">
              <CoinIcon size={48} />
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
              <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
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
