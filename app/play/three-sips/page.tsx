/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { CoinIcon } from '@/components/CoinIcon';
import { BottomNav } from '@/components/BottomNav';
import { Sparkle } from '@/components/Sparkles';
import { MangoIcon, PineappleIcon } from '@/components/Icons';
import { createClient } from '@/lib/supabase/client';
import {
  playReelStopSound,
  playTickSound,
  playWinSound,
  playJackpotSound,
  playLoseSound,
} from '@/lib/sound';

// Symbol Component Render Helper
const SymbolIcon: React.FC<{ type: number; size?: number }> = ({ type, size = 50 }) => {
  switch (type) {
    case 0: // Mango bottle
      return <MangoIcon size={size} />;
    case 1: // Pineapple bottle
      return <PineappleIcon size={size} />;
    case 2: // Sip Coin
      return <CoinIcon size={size} />;
    case 3: // Zee Sip logo
      return (
        <img
          src="/zeesip-logo.png"
          alt="Zee Sip Logo"
          width={size}
          height={size}
          style={{ borderRadius: '50%', objectFit: 'cover' }}
          className="inline-block shrink-0 shadow-md"
        />
      );
    case 4: // Water drop
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#4AADE5" stroke="#3D0B0E" strokeWidth="1.5">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      );
    default:
      return <CoinIcon size={size} />;
  }
};

// Full vertical strip of 5 symbols repeated for smooth continuous loop
const REEL_STRIP = [0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4];

export default function ThreeSipsPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPlayedToday, setIsPlayedToday] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<string>('');

  // Game state
  const [reelSymbols, setReelSymbols] = useState<[number, number, number]>([0, 1, 2]);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [stoppedReels, setStoppedReels] = useState<[boolean, boolean, boolean]>([true, true, true]);
  const [poppedReels, setPoppedReels] = useState<[boolean, boolean, boolean]>([false, false, false]);

  const [gameResult, setGameResult] = useState<{
    coins_won: number;
    payout_type: string;
    symbols: [number, number, number];
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/');
        return;
      }

      // Fetch balance
      fetch('/api/balance')
        .then((res) => res.json())
        .then((data) => {
          if (data.balance !== undefined) setBalance(data.balance);
        });

      // Check if played today
      const todayStr = new Date().toISOString().split('T')[0];

      supabase
        .from('game_plays')
        .select('*')
        .eq('user_id', user.id)
        .eq('game_type', 'three_sips')
        .gte('played_at', `${todayStr}T00:00:00.000Z`)
        .order('played_at', { ascending: false })
        .limit(1)
        .then(({ data: plays }) => {
          if (plays && plays.length > 0) {
            setIsPlayedToday(true);
            const play = plays[0];
            const syms = (play.result?.symbols || [0, 1, 2]) as [number, number, number];
            setReelSymbols(syms);
            setGameResult({
              coins_won: play.coins_won,
              payout_type: play.result?.payout_type || 'none',
              symbols: syms,
            });
          }
          setIsLoading(false);
        });
    });

    // Countdown to midnight IST
    const updateCountdown = () => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const istDate = new Date(utc + 3600000 * 5.5);

      const midnightIST = new Date(istDate);
      midnightIST.setHours(24, 0, 0, 0);

      const diffMs = midnightIST.getTime() - istDate.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setCountdown(
        `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [router]);

  // Handle PULL click
  const handlePull = async () => {
    if (isSpinning || isPlayedToday) return;

    setErrorMsg(null);
    setIsSpinning(true);
    setStoppedReels([false, false, false]);
    setPoppedReels([false, false, false]);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Start tick sound interval while spinning
    if (!prefersReducedMotion) {
      tickIntervalRef.current = setInterval(() => {
        playTickSound();
      }, 70);
    }

    try {
      const res = await fetch('/api/games/three-sips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
        setErrorMsg(data.error || 'Game play failed');
        setIsSpinning(false);
        setStoppedReels([true, true, true]);
        return;
      }

      const finalSymbols: [number, number, number] = data.symbols;
      const coinsWon: number = data.coins_won;
      const payoutType: string = data.payout_type;

      if (prefersReducedMotion) {
        if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
        setReelSymbols(finalSymbols);
        setStoppedReels([true, true, true]);
        setIsSpinning(false);
        setIsPlayedToday(true);
        setGameResult({ coins_won: coinsWon, payout_type: payoutType, symbols: finalSymbols });
        if (coinsWon > 0) setBalance((prev) => prev + coinsWon);
        return;
      }

      // Reel 1 stops at 1.2s
      setTimeout(() => {
        playReelStopSound();
        setReelSymbols((prev) => [finalSymbols[0], prev[1], prev[2]]);
        setStoppedReels((prev) => [true, prev[1], prev[2]]);
        setPoppedReels((prev) => [true, prev[1], prev[2]]);
      }, 1200);

      // Reel 2 stops at 2.0s
      setTimeout(() => {
        playReelStopSound();
        setReelSymbols((prev) => [finalSymbols[0], finalSymbols[1], prev[2]]);
        setStoppedReels((prev) => [true, true, prev[2]]);
        setPoppedReels((prev) => [true, true, prev[2]]);
      }, 2000);

      // Reel 3 stops at 2.8s
      setTimeout(() => {
        if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
        playReelStopSound();
        setReelSymbols(finalSymbols);
        setStoppedReels([true, true, true]);
        setPoppedReels([true, true, true]);
        setIsSpinning(false);
        setIsPlayedToday(true);
        setGameResult({ coins_won: coinsWon, payout_type: payoutType, symbols: finalSymbols });

        if (coinsWon > 0) {
          setBalance((prev) => prev + coinsWon);
          if (payoutType === 'jackpot') {
            playJackpotSound();
          } else {
            playWinSound();
          }
        } else {
          playLoseSound();
        }
      }, 2800);
    } catch {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      setErrorMsg('Connection error. Please try again.');
      setIsSpinning(false);
      setStoppedReels([true, true, true]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] w-full bg-[#B92429] flex flex-col justify-between p-6 text-white">
        <Header variant="red" />
        <div className="my-auto flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="font-anton text-lg uppercase tracking-wide">
            Loading Three Sips...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-[100dvh] w-full bg-[#B92429] text-white flex flex-col justify-between pb-24 select-none relative overflow-hidden">
      <div>
        {/* Top Header */}
        <Header
          variant="red"
          rightElement={
            <div className="bg-white rounded-full px-3 py-1 flex items-center gap-1.5 shadow-sm">
              <CoinIcon size={18} />
              <span className="font-anton text-[14px] text-[#3D0B0E]">{balance}</span>
            </div>
          }
        />

        {/* Back Link & Title */}
        <div className="px-5 pt-1 flex flex-col gap-1 z-10 relative">
          <Link
            href="/play"
            className="inline-flex items-center gap-1 text-[12px] font-extrabold text-white/80 hover:text-white uppercase tracking-wider mb-1"
          >
            ← Back to Play
          </Link>
          <h1 className="text-[44px] font-anton text-[#FFC93C] leading-none uppercase tracking-tight drop-shadow-md">
            THREE SIPS
          </h1>
          <p className="text-[13px] font-bold text-white/90">
            Match three symbols to win Sip Coins!
          </p>
        </div>

        {/* Main Content Area */}
        <div className="px-5 pt-4 flex flex-col gap-5 relative z-10">
          {/* RESULT BANNER (No emojis) */}
          {gameResult && (
            <div
              className={`w-full rounded-[18px] p-3.5 text-center flex flex-col items-center gap-0.5 border-2 shadow-lg transition-all animate-fadeIn ${
                gameResult.payout_type === 'jackpot'
                  ? 'bg-[#3D0B0E] border-[#FFC93C] text-[#FFC93C]'
                  : gameResult.coins_won > 0
                  ? 'bg-[#CDEE1C] border-[#3D0B0E] text-[#3D0B0E]'
                  : 'bg-black/40 border-white/20 text-white/90'
              }`}
            >
              {gameResult.payout_type === 'jackpot' && (
                <div className="flex items-center gap-2">
                  <Sparkle color="gold" size={20} />
                  <span className="font-anton text-[26px] tracking-wide uppercase">
                    JACKPOT! +50 COINS
                  </span>
                  <Sparkle color="gold" size={20} />
                </div>
              )}
              {gameResult.payout_type === 'triple' && (
                <div className="flex items-center gap-2">
                  <Sparkle color="gold" size={18} />
                  <span className="font-anton text-[24px] uppercase tracking-wide">
                    MATCH! +{gameResult.coins_won} COINS
                  </span>
                  <Sparkle color="gold" size={18} />
                </div>
              )}
              {gameResult.payout_type === 'double' && (
                <span className="font-anton text-[22px] uppercase tracking-wide">
                  CLOSE! +5 COINS
                </span>
              )}
              {gameResult.payout_type === 'none' && (
                <span className="font-anton text-[20px] uppercase tracking-wide text-white/90">
                  SO CLOSE! TRY AGAIN TOMORROW
                </span>
              )}
            </div>
          )}

          {/* SLOT MACHINE CABINET FRAME */}
          <div className="w-full bg-[#2A0709] rounded-[26px] p-4 shadow-2xl border-4 border-[#3D0B0E] flex flex-col items-center gap-4 relative overflow-hidden">
            {/* Reel Container with Machine Slot Window Styling */}
            <div className="w-full bg-[#1A0405] rounded-[20px] p-2 border-2 border-[#FFC93C]/40 shadow-[inset_0_4px_12px_rgba(0,0,0,0.8)] relative flex items-center justify-between gap-2 overflow-hidden h-[150px]">
              
              {/* Horizontal Gold Payline Indicator */}
              <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[54px] border-y-2 border-[#FFC93C] bg-[#FFC93C]/10 shadow-[0_0_12px_rgba(255,201,60,0.4)] pointer-events-none z-20" />

              {/* Top & Bottom Shadow Gradients for Slot Window Depth */}
              <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-30" />
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-30" />

              {/* 3 Reel Columns */}
              {[0, 1, 2].map((idx) => {
                const isReelSpinning = isSpinning && !stoppedReels[idx];
                const activeSym = reelSymbols[idx];
                const isPopped = poppedReels[idx];
                const isTripleWin = gameResult && gameResult.payout_type !== 'none' && gameResult.payout_type !== 'double';

                return (
                  <div
                    key={idx}
                    className={`flex-1 h-full rounded-[14px] bg-[#FFF5F3] border-2 border-[#3D0B0E] flex items-center justify-center relative overflow-hidden shadow-inner z-10 transition-transform ${
                      isPopped ? 'scale-105 transition-transform duration-150' : 'scale-100'
                    } ${isTripleWin ? 'ring-4 ring-[#FFC93C] animate-pulse' : ''}`}
                  >
                    {isReelSpinning ? (
                      <div className="w-full flex flex-col items-center animate-reel-spin">
                        {REEL_STRIP.map((sym, sIdx) => (
                          <div key={sIdx} className="h-[54px] flex items-center justify-center shrink-0">
                            <SymbolIcon type={sym} size={42} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full w-full">
                        <SymbolIcon type={activeSym} size={48} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ERROR MSG */}
            {errorMsg && (
              <p className="text-xs font-bold text-[#FFC93C] bg-black/50 px-3 py-1.5 rounded-lg text-center border border-[#FFC93C]/40">
                {errorMsg}
              </p>
            )}

            {/* PULL BUTTON / COUNTDOWN */}
            {isPlayedToday ? (
              <div className="w-full flex flex-col items-center gap-2">
                <button
                  disabled
                  className="w-full h-[62px] bg-white/10 text-white/50 font-anton text-[22px] uppercase rounded-[18px] border-2 border-white/10 cursor-not-allowed"
                >
                  COME BACK TOMORROW
                </button>
                <span className="text-[12px] font-extrabold text-[#FFC93C] uppercase tracking-wider">
                  Next play in: {countdown}
                </span>
              </div>
            ) : (
              <button
                onClick={handlePull}
                disabled={isSpinning}
                className="w-full h-[62px] bg-[#FFC93C] hover:bg-[#FFE14D] active:scale-[0.98] text-[#3D0B0E] font-anton text-[25px] uppercase rounded-[18px] shadow-lg transition-all flex items-center justify-center cursor-pointer disabled:opacity-75"
              >
                {isSpinning ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 border-3 border-[#3D0B0E] border-t-transparent rounded-full animate-spin" />
                    <span>SPINNING...</span>
                  </div>
                ) : (
                  'PULL'
                )}
              </button>
            )}
          </div>

          {/* PAYOUT TABLE CARD */}
          <div className="w-full bg-[#3D0B0E] text-white rounded-[20px] p-4 shadow-md flex flex-col gap-2.5 border border-[#FFC93C]/30">
            <h3 className="font-anton text-[16px] text-[#FFC93C] uppercase tracking-wider">
              PAYOUTS
            </h3>
            <div className="grid grid-cols-2 gap-2 text-[11.5px] font-extrabold">
              <div className="flex items-center gap-2 bg-white/10 p-2 rounded-lg">
                <span>3x Logo</span>
                <span className="text-[#FFC93C] ml-auto">+50 (JACKPOT)</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 p-2 rounded-lg">
                <span>3x Coin</span>
                <span className="text-[#FFC93C] ml-auto">+35</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 p-2 rounded-lg">
                <span>3x Mango</span>
                <span className="text-[#FFC93C] ml-auto">+25</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 p-2 rounded-lg">
                <span>3x Pineapple</span>
                <span className="text-[#FFC93C] ml-auto">+25</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 p-2 rounded-lg">
                <span>3x Water</span>
                <span className="text-[#FFC93C] ml-auto">+10</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 p-2 rounded-lg">
                <span>2x Match</span>
                <span className="text-[#FFC93C] ml-auto">+5</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </main>
  );
}
