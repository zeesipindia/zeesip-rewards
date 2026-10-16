'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { CoinIcon } from '@/components/CoinIcon';
import { createClient } from '@/lib/supabase/client';
import {
  playCardFlipSound,
  playMatchFoundSound,
  playNoMatchSound,
  playGameCompleteSound,
} from '@/lib/sound';

// 8 Pure SVG Icons for Symbols
function SymbolIcon({ symbolId }: { symbolId: number }) {
  switch (symbolId) {
    case 0:
      // 1. Mango bottle — green (#CDEE1C) bottle shape with leaf
      return (
        <svg width="42" height="42" viewBox="0 0 32 32" fill="none">
          <rect x="13" y="2" width="6" height="3" rx="1.5" fill="#B92429" />
          <path d="M17 5C19 3 22 3.5 22.5 5C22 7 19.5 7 17.5 5.5" fill="#8FC31F" />
          <path
            d="M13 5H19V8C20 9.5 22.5 11 23 15C23.8 21 21.5 28 16 28C10.5 28 8.2 21 9 15C9.5 11 12 9.5 13 8V5Z"
            fill="#CDEE1C"
          />
          <ellipse cx="16" cy="18" rx="4" ry="5.5" fill="#B2D807" />
          <circle cx="14.5" cy="16" r="1.5" fill="#E4F772" />
        </svg>
      );
    case 1:
      // 2. Pineapple bottle — yellow (#FFE14D) bottle shape with crown
      return (
        <svg width="42" height="42" viewBox="0 0 32 32" fill="none">
          <path d="M13 2L16 4.5L19 2L18 5H14L13 2Z" fill="#8FC31F" />
          <path d="M11 4L16 6.5L21 4L19 7H13L11 4Z" fill="#4CAF50" />
          <rect x="13.5" y="6" width="5" height="2" rx="1" fill="#D89D10" />
          <path
            d="M13 8H19V10C20.5 11.5 23 13.5 23 17C23 22.5 20.5 28 16 28C11.5 28 9 22.5 9 17C9 13.5 11.5 11.5 13 10V8Z"
            fill="#FFE14D"
          />
          <path
            d="M12 15L20 22M20 15L12 22M16 13V24"
            stroke="#D89D10"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 2:
      // 3. Sip Coin — gold (#FFC93C) circle with star
      return (
        <svg width="42" height="42" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" fill="#FFC93C" stroke="#D89D10" strokeWidth="1.5" />
          <circle cx="16" cy="16" r="10" fill="none" stroke="#B92429" strokeWidth="1.5" strokeDasharray="2 1.5" />
          <polygon
            points="16,8 18.5,13.2 24,14 20,17.8 21,23.5 16,20.8 11,23.5 12,17.8 8,14 13.5,13.2"
            fill="#B92429"
          />
        </svg>
      );
    case 3:
      // 4. Water drop — blue (#4AADE5) teardrop
      return (
        <svg width="42" height="42" viewBox="0 0 32 32" fill="none">
          <path
            d="M16 3C16 3 7 14.5 7 20C7 25 11 29 16 29C21 29 25 25 25 20C25 14.5 16 3 16 3Z"
            fill="#4AADE5"
          />
          <path
            d="M12.5 18C12.5 15 14 11.5 16 9"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 4:
      // 5. Bottle cap — red (#B92429) circle with ridged edge
      return (
        <svg width="42" height="42" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14.5" fill="#7A1418" />
          <path
            d="M16 2L17.5 4.5L20.5 3.5L21.5 6.5L24.5 6L25 9L28 9.5L27.5 12.5L30 14L28.5 16.5L30 19L27.5 20.5L28 23.5L25 24L24.5 27L21.5 26.5L20.5 29.5L17.5 28.5L16 31L14.5 28.5L11.5 29.5L10.5 26.5L7.5 27L7 24L4 23.5L4.5 20.5L2 19L3.5 16.5L2 14L4.5 12.5L4 9.5L7 9L7.5 6L10.5 6.5L11.5 3.5L14.5 4.5Z"
            fill="#B92429"
          />
          <circle cx="16" cy="16" r="8" fill="#B92429" stroke="#FFC93C" strokeWidth="1.5" />
          <text
            x="16"
            y="20"
            fill="#FFC93C"
            fontFamily="Arial, sans-serif"
            fontWeight="900"
            fontSize="12"
            textAnchor="middle"
          >
            Z
          </text>
        </svg>
      );
    case 5:
      // 6. Straw — red and white striped diagonal line
      return (
        <svg width="42" height="42" viewBox="0 0 32 32" fill="none">
          <g transform="rotate(45 16 16)">
            <rect x="13.5" y="2" width="5" height="28" rx="2.5" fill="white" stroke="#B92429" strokeWidth="1.2" />
            <path d="M13.5 6L18.5 10M13.5 12L18.5 16M13.5 18L18.5 22M13.5 24L18.5 28" stroke="#B92429" strokeWidth="2.5" strokeLinecap="square" />
          </g>
        </svg>
      );
    case 6:
      // 7. Leaf — green (#8FC31F) simple leaf shape
      return (
        <svg width="42" height="42" viewBox="0 0 32 32" fill="none">
          <path
            d="M8 24C8 24 10 9 25 7C25 7 23 22 9 25L6 28"
            fill="#8FC31F"
            stroke="#689A08"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M10 22C14 19 20 14 24 8" stroke="#527D05" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M14 18L18 19M17 15L21 15M20 12L23 11" stroke="#527D05" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case 7:
      // 8. Ice cube — light blue (#B8E4F9) diamond/cube shape
      return (
        <svg width="42" height="42" viewBox="0 0 32 32" fill="none">
          <polygon points="16,5 26,11 16,17 6,11" fill="#E6F6FE" stroke="#87D0F5" strokeWidth="1.2" strokeLinejoin="round" />
          <polygon points="6,11 16,17 16,28 6,22" fill="#B8E4F9" stroke="#87D0F5" strokeWidth="1.2" strokeLinejoin="round" />
          <polygon points="16,17 26,11 26,22 16,28" fill="#87D0F5" stroke="#5BBCEF" strokeWidth="1.2" strokeLinejoin="round" />
          <line x1="9" y1="14" x2="13" y2="21" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
        </svg>
      );
    default:
      return null;
  }
}

// Sparkle Star SVG for background floating effect
function SparkleStar({ size = 20, color = '#FFC93C' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
    </svg>
  );
}

// 10 Staggered Sparkle positions for Celebration
const CELEBRATION_SPARKLES = [
  { left: '8%', top: '75%', delay: '0s', size: 16, color: '#FFC93C' },
  { left: '20%', top: '85%', delay: '0.3s', size: 14, color: '#FFFFFF' },
  { left: '35%', top: '70%', delay: '0.7s', size: 20, color: '#FFC93C' },
  { left: '50%', top: '88%', delay: '0.1s', size: 16, color: '#FFFFFF' },
  { left: '65%', top: '78%', delay: '0.5s', size: 22, color: '#FFC93C' },
  { left: '80%', top: '82%', delay: '0.9s', size: 14, color: '#FFFFFF' },
  { left: '92%', top: '72%', delay: '0.4s', size: 18, color: '#FFC93C' },
  { left: '15%', top: '92%', delay: '1.1s', size: 15, color: '#FFC93C' },
  { left: '45%', top: '94%', delay: '1.3s', size: 18, color: '#FFFFFF' },
  { left: '72%', top: '90%', delay: '0.6s', size: 15, color: '#FFC93C' },
];

export default function SipMatchPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number>(0);
  const [gameId, setGameId] = useState<string | null>(null);
  const [grid, setGrid] = useState<number[]>([]);

  // Game States
  const [gameState, setGameState] = useState<'loading' | 'already_played' | 'playing' | 'game_over'>('loading');
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedIndices, setMatchedIndices] = useState<number[]>([]);

  // Animation States
  const [popIndices, setPopIndices] = useState<number[]>([]);
  const [shakeIndices, setShakeIndices] = useState<number[]>([]);
  const [isWaveAnimating, setIsWaveAnimating] = useState<boolean>(false);
  const [pairsFlash, setPairsFlash] = useState<boolean>(false);
  const [floatingPlusOne, setFloatingPlusOne] = useState<{ x: number; y: number; id: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Stats
  const [tapCount, setTapCount] = useState<number>(0);
  const [coinsWon, setCoinsWon] = useState<number>(0);
  const [todayPlayedScore, setTodayPlayedScore] = useState<{ coins: number; taps: number } | null>(null);
  const [cooldownText, setCooldownText] = useState<string>('');

  // Compute countdown to midnight IST
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

  // Init: Check Auth, Balance & Start Game Session
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

      // Call start API
      fetch('/api/games/sip-match/start', { method: 'POST' })
        .then(async (res) => {
          if (res.status === 409) {
            const data = await res.json();
            setTodayPlayedScore({
              coins: data.coins_won || 0,
              taps: data.total_taps || 16,
            });
            if (Array.isArray(data.grid) && data.grid.length === 16) {
              setGrid(data.grid);
            } else {
              setGrid([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7]);
            }
            // All cards revealed static
            setMatchedIndices(Array.from({ length: 16 }, (_, i) => i));
            setGameState('already_played');
            return;
          }

          if (!res.ok) {
            router.push('/play');
            return;
          }

          const data = await res.json();
          setGameId(data.game_id);
          setGrid(data.grid);
          setGameState('playing');
        })
        .catch(() => {
          router.push('/play');
        });
    });
  }, [router]);

  // Handle Card Tap
  const handleCardTap = (index: number) => {
    if (gameState !== 'playing' || isProcessing) return;
    if (matchedIndices.includes(index) || flippedIndices.includes(index)) return;

    playCardFlipSound();
    const newTaps = tapCount + 1;
    setTapCount(newTaps);

    if (flippedIndices.length === 0) {
      // First card of pair
      setFlippedIndices([index]);
    } else if (flippedIndices.length === 1) {
      // Second card of pair
      const firstIndex = flippedIndices[0];
      const newFlipped = [firstIndex, index];
      setFlippedIndices(newFlipped);

      // Check match
      if (grid[firstIndex] === grid[index]) {
        // MATCH FOUND!
        playMatchFoundSound();
        const newMatched = [...matchedIndices, firstIndex, index];
        setMatchedIndices(newMatched);
        setFlippedIndices([]);

        // 1. Pop animation on both cards
        setPopIndices([firstIndex, index]);
        setTimeout(() => setPopIndices([]), 220);

        // 2. Pairs counter flash (white -> gold -> white)
        setPairsFlash(true);
        setTimeout(() => setPairsFlash(false), 400);

        // 3. Floating "+1" from between the two cards
        const col1 = firstIndex % 4;
        const row1 = Math.floor(firstIndex / 4);
        const col2 = index % 4;
        const row2 = Math.floor(index / 4);
        const midX = ((col1 + col2) / 2 + 0.5) * 25;
        const midY = ((row1 + row2) / 2 + 0.5) * 25;
        setFloatingPlusOne({ x: midX, y: midY, id: Date.now() });
        setTimeout(() => setFloatingPlusOne(null), 550);

        // Check if ALL 8 pairs (16 cards) found!
        if (newMatched.length === 16) {
          setIsProcessing(true);

          // STEP 1: WAVE ANIMATION across all 16 cards (takes ~1 second)
          setIsWaveAnimating(true);

          // Submit complete API in the background
          submitGameComplete(newTaps);

          // STEP 2: SCORE REVEAL — wait ~1s wave + 500ms pause = 1500ms
          setTimeout(() => {
            setIsWaveAnimating(false);
            playGameCompleteSound();
            setGameState('game_over');
          }, 1600);
        }
      } else {
        // NO MATCH!
        setIsProcessing(true);
        setShakeIndices([firstIndex, index]);
        playNoMatchSound();

        // Clear shake after 220ms
        setTimeout(() => setShakeIndices([]), 220);

        // Cards stay visible for 1.2 seconds, then both flip back face-down
        setTimeout(() => {
          setFlippedIndices([]);
          setIsProcessing(false);
        }, 1200);
      }
    }
  };

  // Complete Game API Submission
  const submitGameComplete = async (finalTaps: number) => {
    if (!gameId) return;

    try {
      const res = await fetch('/api/games/sip-match/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          total_taps: finalTaps,
        }),
      });

      const data = await res.json();
      const won = data.coins_won ?? 1;
      setCoinsWon(won);
      setBalance((b) => b + won);
    } catch {
      setCoinsWon(1);
      setBalance((b) => b + 1);
    }
  };

  const pairsFound = Math.floor(matchedIndices.length / 2);

  // Performance-based content helper
  const getPerformanceDetails = () => {
    if (tapCount === 16) {
      return {
        title: 'PERFECT GAME!',
        titleColor: 'text-[#FFC93C]',
        titleSize: 'text-[32px]',
        glow: true,
        coinSize: 80,
        coinsText: '+12 SIP COINS',
        coinsSize: 'text-[54px]',
        subtitle: '16 taps — flawless memory!',
        extraSparkles: true,
      };
    }
    if (tapCount <= 20) {
      return {
        title: 'AMAZING!',
        titleColor: 'text-[#FFC93C]',
        titleSize: 'text-[32px]',
        glow: false,
        coinSize: 70,
        coinsText: `+${coinsWon || 10} SIP COINS`,
        coinsSize: 'text-[48px]',
        subtitle: `${tapCount} taps — incredible memory!`,
        extraSparkles: false,
      };
    }
    if (tapCount <= 24) {
      return {
        title: 'WELL DONE!',
        titleColor: 'text-white',
        titleSize: 'text-[28px]',
        glow: false,
        coinSize: 60,
        coinsText: `+${coinsWon || 8} SIP COINS`,
        coinsSize: 'text-[44px]',
        subtitle: `${tapCount} taps — sharp memory!`,
        extraSparkles: false,
      };
    }
    if (tapCount <= 28) {
      return {
        title: 'NICE!',
        titleColor: 'text-white',
        titleSize: 'text-[28px]',
        glow: false,
        coinSize: 50,
        coinsText: `+${coinsWon || 5} SIP COINS`,
        coinsSize: 'text-[40px]',
        subtitle: `${tapCount} taps — keep practicing!`,
        extraSparkles: false,
      };
    }
    if (tapCount <= 32) {
      return {
        title: 'COMPLETED!',
        titleColor: 'text-white',
        titleSize: 'text-[24px]',
        glow: false,
        coinSize: 44,
        coinsText: `+${coinsWon || 3} SIP COINS`,
        coinsSize: 'text-[36px]',
        subtitle: `${tapCount} taps — you'll do better tomorrow!`,
        extraSparkles: false,
      };
    }
    return {
      title: 'DONE!',
      titleColor: 'text-white',
      titleSize: 'text-[24px]',
      glow: false,
      coinSize: 36,
      coinsText: `+${coinsWon || 1} ${coinsWon === 1 ? 'SIP COIN' : 'SIP COINS'}`,
      coinsSize: 'text-[32px]',
      subtitle: `${tapCount} taps — tomorrow's your day!`,
      extraSparkles: false,
    };
  };

  const perf = getPerformanceDetails();

  return (
    <main className="min-h-[100dvh] w-full max-w-[430px] mx-auto bg-[#B92429] text-white flex flex-col justify-between select-none relative overflow-x-hidden shadow-2xl">
      <style jsx global>{`
        @keyframes floatSparkle {
          0% {
            transform: translateY(0) scale(0.6) rotate(0deg);
            opacity: 0;
          }
          40% {
            opacity: 0.95;
          }
          80% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(-80px) scale(1.1) rotate(45deg);
            opacity: 0;
          }
        }
        @keyframes floatPlusOne {
          0% {
            transform: translate(-50%, -50%) translateY(0);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) translateY(-30px);
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
        @keyframes wavePulse {
          0% {
            transform: rotateY(180deg) scale(1);
          }
          50% {
            transform: rotateY(180deg) scale(1.15);
            box-shadow: 0 0 16px #ffc93c;
            border-color: #ffc93c;
          }
          100% {
            transform: rotateY(180deg) scale(1);
          }
        }
        @keyframes cardShake {
          0%,
          100% {
            transform: rotateY(180deg) translateX(0);
          }
          25% {
            transform: rotateY(180deg) translateX(-4px);
          }
          50% {
            transform: rotateY(180deg) translateX(4px);
          }
          75% {
            transform: rotateY(180deg) translateX(-4px);
          }
        }
        @keyframes cardPop {
          0% {
            transform: rotateY(180deg) scale(1);
          }
          50% {
            transform: rotateY(180deg) scale(1.1);
          }
          100% {
            transform: rotateY(180deg) scale(1);
          }
        }
      `}</style>

      {/* HEADER */}
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

        {/* TOP BAR / BACK LINK */}
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

          <div>
            <h1 className="text-[36px] font-anton text-white leading-none uppercase tracking-wide">
              SIP MATCH
            </h1>
            <p className="text-[14px] font-medium text-white/90 mt-1">
              Find all matching pairs!
            </p>
          </div>
        </div>
      </div>

      {/* GAMEPLAY GRID AREA */}
      <div className="my-auto px-4 py-3 flex flex-col items-center justify-center w-full">
        {gameState === 'loading' ? (
          <div className="w-full aspect-square max-w-[330px] flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-white/20 border-t-[#FFC93C] rounded-full animate-spin" />
            <span className="font-montserrat font-bold text-[13px] text-white/80">
              Loading cards...
            </span>
          </div>
        ) : (
          <>
            {/* 4x4 CARD GRID */}
            <div
              className="grid grid-cols-4 gap-2 w-full max-w-[330px] sm:max-w-[340px] aspect-square mx-auto relative"
              style={{ perspective: '600px' }}
            >
              {/* Floating +1 between matched cards */}
              {floatingPlusOne && (
                <div
                  key={floatingPlusOne.id}
                  style={{
                    left: `${floatingPlusOne.x}%`,
                    top: `${floatingPlusOne.y}%`,
                    animation: 'floatPlusOne 0.5s ease-out forwards',
                  }}
                  className="absolute z-40 -translate-x-1/2 -translate-y-1/2 pointer-events-none font-anton text-[#FFC93C] text-[20px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
                >
                  +1
                </div>
              )}

              {grid.map((symbolId, idx) => {
                const isMatched = matchedIndices.includes(idx);
                const isFlipped = flippedIndices.includes(idx);
                const isFaceUp = isMatched || isFlipped;
                const isPopping = popIndices.includes(idx);
                const isShaking = shakeIndices.includes(idx);

                // Wave animation style with staggered 70ms delay
                const waveStyle = isWaveAnimating
                  ? {
                      animation: `wavePulse 0.4s ease-in-out forwards`,
                      animationDelay: `${idx * 70}ms`,
                    }
                  : {};

                // Pop / Shake dynamic styles
                const extraAnimStyle = isPopping
                  ? { animation: 'cardPop 0.2s ease-out forwards' }
                  : isShaking
                  ? { animation: 'cardShake 0.2s ease-in-out forwards' }
                  : {};

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleCardTap(idx)}
                    disabled={gameState !== 'playing' || isProcessing || isMatched || isFlipped}
                    aria-label={`Card ${idx + 1}`}
                    className={`relative w-full h-full cursor-pointer outline-none will-change-transform ${
                      gameState !== 'playing' || isProcessing ? 'cursor-default' : ''
                    }`}
                  >
                    <div
                      style={{
                        transformStyle: 'preserve-3d',
                        ...waveStyle,
                        ...extraAnimStyle,
                      }}
                      className={`w-full h-full rounded-[12px] transition-transform duration-300 motion-reduce:transition-none motion-reduce:duration-0 relative flex items-center justify-center will-change-transform ${
                        isFaceUp ? '[transform:rotateY(180deg)]' : ''
                      }`}
                    >
                      {/* CARD FACE-DOWN */}
                      <div
                        className="absolute inset-0 w-full h-full rounded-[12px] bg-[#B92429] border-2 border-[#7A1418] shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] flex items-center justify-center [backface-visibility:hidden]"
                      >
                        <span className="font-montserrat font-extrabold text-[24px] text-white select-none">
                          ?
                        </span>
                      </div>

                      {/* CARD FACE-UP */}
                      <div
                        className={`absolute inset-0 w-full h-full rounded-[12px] bg-white border-2 flex items-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)] transition-all duration-300 ${
                          isShaking
                            ? 'border-[#B92429] ring-4 ring-[#B92429]/60 shadow-[0_0_12px_rgba(185,36,41,0.6)]'
                            : isPopping
                            ? 'border-[#4CAF50] ring-4 ring-[#4CAF50]/60 shadow-[0_0_14px_rgba(76,175,80,0.7)]'
                            : isMatched
                            ? 'border-[#4CAF50]/60 shadow-md bg-[#F9FFF8]'
                            : 'border-[#F4D2CF] shadow-sm'
                        }`}
                      >
                        <SymbolIcon symbolId={symbolId} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* STATS DISPLAY */}
            {gameState === 'playing' && (
              <div className="flex justify-between items-center w-full max-w-[330px] sm:max-w-[340px] px-1 mt-4">
                <span className="font-montserrat font-bold text-[16px] text-white tracking-wide">
                  TAPS: {tapCount}
                </span>
                <span
                  className={`font-montserrat font-bold text-[16px] tracking-wide transition-all duration-200 ${
                    pairsFlash ? 'text-[#FFC93C] scale-110' : 'text-white'
                  }`}
                >
                  PAIRS: {pairsFound}/8
                </span>
              </div>
            )}
          </>
        )}

        {/* ALREADY PLAYED TODAY IN-PAGE VIEW */}
        {gameState === 'already_played' && (
          <div className="w-full max-w-[330px] sm:max-w-[340px] mt-4 flex flex-col items-center text-center">
            <div className="bg-[#7A1418] border border-white/20 rounded-[16px] p-4 w-full mb-3 shadow-md">
              <span className="font-anton text-[20px] text-[#FFC93C] tracking-wide block uppercase">
                Today: +{todayPlayedScore?.coins || 0} coins ({todayPlayedScore?.taps || 16} taps)
              </span>
              <span className="text-[12px] font-bold text-white/80 mt-1 block">
                Next game unlocks in {cooldownText}
              </span>
            </div>

            <button
              type="button"
              disabled
              className="w-full h-[52px] bg-white/20 text-white/60 font-anton text-[18px] uppercase rounded-[16px] border border-white/10 cursor-not-allowed mb-3 tracking-wide"
            >
              COME BACK TOMORROW
            </button>

            <Link
              href="/play"
              className="text-white/80 hover:text-white font-montserrat font-bold text-[13px] underline tracking-wide"
            >
              ← BACK TO PLAY
            </Link>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="px-5 pb-5 text-center text-[12px] font-bold text-white/70">
        Zee Sip Memory Challenge · 1 play per day
      </div>

      {/* STEP 2: SCORE REVEAL OVERLAY (after wave) */}
      {gameState === 'game_over' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fadeIn">
          {/* Floating Sparkle SVGs in background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {CELEBRATION_SPARKLES.map((s, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: s.left,
                  top: s.top,
                  animation: `floatSparkle ${perf.extraSparkles ? '1.5s' : '2.2s'} ease-in-out infinite ${s.delay}`,
                }}
              >
                <SparkleStar size={s.size} color={s.color} />
              </div>
            ))}
          </div>

          {/* Centered White Card */}
          <div className="w-full max-w-[340px] bg-white rounded-[24px] p-6 sm:p-7 shadow-2xl flex flex-col items-center text-center relative border-4 border-[#FFC93C] z-10">
            {/* Top Close X -> /home */}
            <button
              type="button"
              onClick={() => router.push('/home')}
              aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#FFF5F3] text-[#7A4547] flex items-center justify-center font-bold text-base hover:bg-[#FCE4E1] cursor-pointer"
            >
              ✕
            </button>

            {/* Dark Red Inner Banner for White & Gold Typography */}
            <div className="w-full bg-[#7A1418] rounded-[20px] p-5 shadow-inner border border-[#B92429] flex flex-col items-center text-center mb-4">
              {/* Performance Title */}
              <h2
                className={`font-anton ${perf.titleSize} ${perf.titleColor} leading-tight uppercase mb-2 ${
                  perf.glow ? 'drop-shadow-[0_0_20px_rgba(255,201,60,0.6)]' : ''
                }`}
                style={perf.glow ? { textShadow: '0 0 20px rgba(255, 201, 60, 0.5)' } : {}}
              >
                {perf.title}
              </h2>

              {/* Coin SVG with Bounce Animation */}
              <div
                style={{
                  animation: 'coinBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                }}
                className="my-1.5 flex items-center justify-center"
              >
                <svg
                  width={perf.coinSize}
                  height={perf.coinSize}
                  viewBox="0 0 24 24"
                  className="drop-shadow-lg"
                >
                  <circle cx="12" cy="12" r="11" fill="#FFC93C" />
                  <circle cx="12" cy="12" r="7.5" fill="none" stroke="#B92429" strokeWidth="1.6" />
                  <polygon
                    points="12,5 13.8,9.5 18.5,10.2 15,13.5 16,18.2 12,15.8 8,18.2 9,13.5 5.5,10.2 10.2,9.5"
                    fill="#B92429"
                  />
                </svg>
              </div>

              {/* Coins Won text in gold Anton font */}
              <div
                className={`font-anton ${perf.coinsSize} text-[#FFC93C] leading-none drop-shadow-[0_2px_4px_rgba(61,11,14,0.4)] my-1`}
              >
                {perf.coinsText}
              </div>

              {/* Subtitle in white, 14px */}
              <p className="text-[14px] font-medium text-white/95 mt-1">
                {perf.subtitle}
              </p>
            </div>

            {/* Total Balance Progress Bar below */}
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

            {/* Countdown to next game */}
            <span className="text-[12px] font-bold text-[#7A4547] mb-3">
              Next game in {cooldownText}
            </span>

            {/* CONTINUE Button (brand-red bg, white text, h-56px) -> /play */}
            <button
              type="button"
              onClick={() => router.push('/play')}
              className="w-full h-[56px] bg-[#B92429] hover:bg-[#A31F24] text-white font-anton text-[20px] uppercase rounded-[16px] shadow-lg transition-all cursor-pointer flex items-center justify-center tracking-wide"
            >
              CONTINUE
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
