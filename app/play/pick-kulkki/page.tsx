/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { CoinIcon } from '@/components/CoinIcon';
import { BottomNav } from '@/components/BottomNav';
import { Sparkle } from '@/components/Sparkles';
import { createClient } from '@/lib/supabase/client';
import { playPopSound, playWinSound, playLoseSound } from '@/lib/sound';

// Bottle Component SVG
const KulkkiBottle: React.FC<{ isPicked?: boolean; isRevealed?: boolean; isWinner?: boolean }> = ({
  isPicked = false,
  isRevealed = false,
  isWinner = false,
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center transition-all duration-300 ${
        isPicked ? '-translate-y-4 scale-105' : 'translate-y-0'
      } ${isRevealed && !isWinner ? 'opacity-50 grayscale' : 'opacity-100'}`}
    >
      <svg width="76" height="130" viewBox="0 0 76 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
        {/* Yellow Cap */}
        <rect x="26" y="2" width="24" height="10" rx="3" fill="#FFE14D" stroke="#3D0B0E" strokeWidth="2.5" />
        <rect x="24" y="12" width="28" height="6" fill="#F5B800" stroke="#3D0B0E" strokeWidth="2" />

        {/* Bottle Neck */}
        <path d="M26 18 L24 36 L52 36 L50 18 Z" fill="#CDEE1C" stroke="#3D0B0E" strokeWidth="2.5" />

        {/* Bottle Body */}
        <path
          d="M14 36 C10 36 6 44 6 56 L6 112 C6 122 14 128 26 128 L50 128 C62 128 70 122 70 112 L70 56 C70 44 66 36 62 36 Z"
          fill="#CDEE1C"
          stroke="#3D0B0E"
          strokeWidth="3"
        />

        {/* Brand Red Label */}
        <rect x="10" y="58" width="56" height="42" rx="6" fill="#B92429" stroke="#3D0B0E" strokeWidth="2" />

        {/* Label Logo */}
        <circle cx="38" cy="79" r="14" fill="#FFFFFF" />
      </svg>
      {/* Logo Image in Label Circle */}
      <img
        src="/zeesip-logo.png"
        alt="Zee Sip"
        width="24"
        height="24"
        style={{ borderRadius: '50%', objectFit: 'cover' }}
        className="-mt-[51px] z-10"
      />

      {/* Platform Shadow */}
      <div className="w-16 h-3 rounded-full bg-[#3D0B0E]/20 mt-6" />
    </div>
  );
};

export default function PickKulkkiPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [gameId, setGameId] = useState<string | null>(null);
  const [isShuffling, setIsShuffling] = useState<boolean>(true);
  const [pickedPos, setPickedPos] = useState<number | null>(null);
  const [winningPos, setWinningPos] = useState<number | null>(null);
  const [coinsWon, setCoinsWon] = useState<number | null>(null);
  const [isPlayedToday, setIsPlayedToday] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        .eq('game_type', 'pick_kulkki')
        .gte('played_at', `${todayStr}T00:00:00.000Z`)
        .order('played_at', { ascending: false })
        .limit(1)
        .then(({ data: plays }) => {
          if (plays && plays.length > 0) {
            setIsPlayedToday(true);
            setIsShuffling(false);
            const play = plays[0];
            setPickedPos(play.result?.picked ?? 0);
            setWinningPos(play.result?.winning_position ?? 0);
            setCoinsWon(play.coins_won);
            setIsLoading(false);
          } else {
            // Start game session
            fetch('/api/games/pick-kulkki/start', { method: 'POST' })
              .then((res) => res.json())
              .then((data) => {
                if (data.game_id) {
                  setGameId(data.game_id);
                  setTimeout(() => {
                    setIsShuffling(false);
                  }, 2500);
                } else if (data.error) {
                  setIsPlayedToday(true);
                  setIsShuffling(false);
                }
                setIsLoading(false);
              })
              .catch(() => setIsLoading(false));
          }
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

  const handlePickBottle = async (pos: number) => {
    if (isShuffling || isPlayedToday || pickedPos !== null || !gameId) return;

    playPopSound();
    setPickedPos(pos);

    try {
      const res = await fetch('/api/games/pick-kulkki/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, picked_position: pos }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Pick failed');
        return;
      }

      setWinningPos(data.winning_position);
      setCoinsWon(data.coins_won);
      setIsPlayedToday(true);

      if (data.coins_won > 0) {
        setBalance((prev) => prev + data.coins_won);
        playWinSound();
      } else {
        playLoseSound();
      }
    } catch {
      setErrorMsg('Connection error. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] w-full bg-[#B92429] flex flex-col justify-between p-6 text-white">
        <Header variant="red" />
        <div className="my-auto flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="font-anton text-lg uppercase tracking-wide">
            Loading Pick the Kulkki...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-[100dvh] w-full bg-[#B92429] text-white flex flex-col justify-between pb-24 select-none relative overflow-hidden">
      <div>
        {/* Header */}
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
            PICK THE KULKKI
          </h1>
          <p className="text-[13px] font-bold text-white/90">
            One bottle hides your coins. Choose wisely!
          </p>
        </div>

        {/* Main Content Area */}
        <div className="px-5 pt-4 flex flex-col gap-5 relative z-10">
          {/* RESULT BANNER */}
          {pickedPos !== null && coinsWon !== null && (
            <div
              className={`w-full rounded-[18px] p-3.5 text-center flex flex-col items-center gap-0.5 border-2 shadow-lg transition-all animate-fadeIn ${
                coinsWon > 0
                  ? 'bg-[#CDEE1C] border-[#3D0B0E] text-[#3D0B0E]'
                  : 'bg-black/40 border-white/20 text-white/90'
              }`}
            >
              {coinsWon > 0 ? (
                <div className="flex items-center gap-2">
                  <Sparkle color="gold" size={20} />
                  <span className="font-anton text-[24px] uppercase tracking-wide">
                    YOU FOUND IT! +{coinsWon} COINS
                  </span>
                  <Sparkle color="gold" size={20} />
                </div>
              ) : (
                <span className="font-anton text-[20px] uppercase tracking-wide text-white/90">
                  BETTER LUCK NEXT TIME!
                </span>
              )}
            </div>
          )}

          {/* GAME CARD WITH BOTTLES */}
          <div className="w-full bg-white rounded-[24px] p-5 shadow-2xl flex flex-col items-center gap-5 border-4 border-[#3D0B0E] relative">
            <div className="text-center">
              <span className="font-anton text-[20px] text-[#B92429] uppercase tracking-wider">
                {isShuffling
                  ? 'SHUFFLING BOTTLES...'
                  : pickedPos === null
                  ? 'TAP A BOTTLE!'
                  : 'BOTTLE REVEALED'}
              </span>
            </div>

            {/* 3 Bottles Row */}
            <div className="w-full flex items-center justify-around gap-2 my-2 min-h-[190px]">
              {[0, 1, 2].map((pos) => {
                const isPicked = pickedPos === pos;
                const isWinner = winningPos === pos && coinsWon !== null && coinsWon > 0;
                const isRevealed = pickedPos !== null;
                const isPickedWinner = isPicked && isWinner;

                return (
                  <div
                    key={pos}
                    onClick={() => handlePickBottle(pos)}
                    className={`flex flex-col items-center cursor-pointer p-2 transition-all rounded-[20px] ${
                      isShuffling ? 'animate-bounce' : 'hover:scale-105'
                    } ${
                      isRevealed && isPickedWinner
                        ? 'border-4 border-[#8FC31F] shadow-[0_0_25px_#8FC31F] bg-[#8FC31F]/10'
                        : isRevealed && isWinner
                        ? 'border-2 border-[#FFC93C] shadow-[0_0_20px_#FFC93C] bg-[#FFC93C]/10'
                        : ''
                    }`}
                  >
                    <KulkkiBottle isPicked={isPicked} isRevealed={isRevealed} isWinner={isWinner} />

                    {/* Prize Reveal Display (Fix 2) */}
                    {isRevealed && (
                      <div className="mt-2 flex flex-col items-center min-h-[50px] justify-center">
                        {isWinner ? (
                          <div className={`flex flex-col items-center gap-1 ${isPickedWinner ? 'animate-bounce' : ''}`}>
                            {/* Gold Coin SVG ~40px */}
                            <CoinIcon size={40} />
                            {/* +X in gold Anton font 24px */}
                            <span
                              className={`font-anton text-[24px] text-[#FFC93C] leading-none drop-shadow-sm ${
                                isPickedWinner ? 'animate-pulse' : ''
                              }`}
                            >
                              +{coinsWon}
                            </span>
                          </div>
                        ) : (
                          /* Losing bottles show "Empty" in muted text #7A4547, 14px */
                          <span className="text-[14px] font-bold text-[#7A4547] uppercase tracking-wider">
                            Empty
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {errorMsg && (
              <p className="text-xs font-bold text-[#B92429] bg-[#FFF5F3] px-3 py-1.5 rounded-lg text-center border border-[#B92429]/30">
                {errorMsg}
              </p>
            )}

            {/* COUNTDOWN / STATUS */}
            {isPlayedToday && (
              <div className="w-full flex flex-col items-center gap-2 pt-2 border-t border-[#F4D2CF]">
                <button
                  disabled
                  className="w-full h-[54px] bg-[#3D0B0E]/10 text-[#3D0B0E]/50 font-anton text-[20px] uppercase rounded-[16px] border-2 border-[#3D0B0E]/20 cursor-not-allowed"
                >
                  COME BACK TOMORROW
                </button>
                <span className="text-[12px] font-extrabold text-[#7A4547] uppercase tracking-wider">
                  Next play in: {countdown}
                </span>
              </div>
            )}
          </div>

          {/* PAYOUT REFERENCE CARD */}
          <div className="w-full bg-[#3D0B0E] text-white rounded-[20px] p-4 shadow-md flex flex-col gap-2 border border-[#FFC93C]/30">
            <h3 className="font-anton text-[16px] text-[#FFC93C] uppercase tracking-wider">
              PRIZES
            </h3>
            <p className="text-[12px] font-extrabold text-white/90">
              One bottle contains up to +25 Sip Coins. Play daily!
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </main>
  );
}
