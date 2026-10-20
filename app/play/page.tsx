'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { CoinIcon } from '@/components/CoinIcon';
import { BottomNav } from '@/components/BottomNav';
import { createClient } from '@/lib/supabase/client';

export default function PlayPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number>(0);
  const [target] = useState<number>(500);

  // Game statuses
  const [isMatchDoneToday, setIsMatchDoneToday] = useState<boolean>(false);
  const [matchCoinsWon, setMatchCoinsWon] = useState<number>(0);

  const [countdown, setCountdown] = useState<string>('');

  // Expiry state
  const [daysSinceLastPlay, setDaysSinceLastPlay] = useState<number>(0);
  const [daysUntilExpiry, setDaysUntilExpiry] = useState<number>(14);
  const [showExpiredModal, setShowExpiredModal] = useState<boolean>(false);

  const fetchBalanceAndExpiry = useCallback(() => {
    fetch('/api/balance')
      .then((res) => res.json())
      .then((data) => {
        if (data.balance !== undefined) setBalance(data.balance);
        if (data.days_since_last_play !== undefined) setDaysSinceLastPlay(data.days_since_last_play);
        if (data.days_until_expiry !== undefined) setDaysUntilExpiry(data.days_until_expiry);
        if (data.expired_just_now) setShowExpiredModal(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/');
        return;
      }

      // Prefetch game routes
      router.prefetch('/play/sip-match');
      router.prefetch('/home');
      router.prefetch('/rewards');

      fetchBalanceAndExpiry();

      // Calculate midnight IST
      const now = new Date();
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.getTime() + istOffsetMs);
      const istMidnightUTC = new Date(
        Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 0, 0, 0)
      );
      const midnightIST = new Date(istMidnightUTC.getTime() - istOffsetMs);

      // Check sip_match played today
      supabase
        .from('game_plays')
        .select('*')
        .eq('user_id', user.id)
        .eq('game_type', 'sip_match')
        .gte('played_at', midnightIST.toISOString())
        .order('played_at', { ascending: false })
        .limit(1)
        .then(({ data: plays }) => {
          if (plays && plays.length > 0) {
            setIsMatchDoneToday(true);
            setMatchCoinsWon(plays[0].coins_won);
          }
        });
    });

    // Countdown to next midnight IST
    const updateCountdown = () => {
      const now = new Date();
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.getTime() + istOffsetMs);
      const nextMidnightUTC = new Date(
        Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() + 1, 0, 0, 0)
      );
      const nextMidnight = new Date(nextMidnightUTC.getTime() - istOffsetMs);
      const diff = nextMidnight.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown('00:00:00');
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [router, fetchBalanceAndExpiry]);

  return (
    <main className="min-h-[100dvh] w-full bg-[#FFF5F3] text-[#3D0B0E] flex flex-col justify-between pb-24 select-none relative">
      <div>
        {/* Header with Coin Balance */}
        <div className="w-full bg-[#FFC93C] text-[#3D0B0E] pb-4 border-b-4 border-[#3D0B0E]">
          <Header
            variant="yellow"
            rightElement={
              <div className="bg-white rounded-full px-3 py-1 flex items-center gap-1.5 shadow-sm border border-[#3D0B0E]/10">
                <CoinIcon size={18} />
                <span className="font-anton text-[14px] text-[#3D0B0E]">{balance}</span>
              </div>
            }
          />
          <div className="px-5 pt-1">
            <h1 className="text-[40px] font-anton text-[#B92429] leading-none uppercase tracking-tight">
              PLAY
            </h1>
          </div>
        </div>

        {/* Content Container */}
        <div className="px-5 py-5 flex flex-col gap-4">
          {/* COIN EXPIRY WARNING BANNER (Top of Play Page) */}
          {daysSinceLastPlay >= 11 && daysSinceLastPlay <= 13 && (
            <div className="w-full bg-[#B92429] text-white rounded-[16px] p-3.5 flex items-center gap-2.5 shadow-md border border-[#7A1418]">
              {/* Yellow Warning Triangle */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                <path d="M12 2L1 21H23L12 2Z" fill="#FFC93C" />
                <path d="M12 9V14" stroke="#B92429" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="17" r="1.25" fill="#B92429" />
              </svg>
              <span className="font-['Montserrat',sans-serif] font-extrabold text-[14px] leading-tight">
                Your coins expire in {daysUntilExpiry} days! Play now to save them
              </span>
            </div>
          )}

          {daysSinceLastPlay >= 8 && daysSinceLastPlay <= 10 && (
            <div className="w-full bg-[#FFE14D] text-[#3D0B0E] rounded-[16px] p-3 flex items-center gap-2.5 border border-[#FFC93C]">
              <span className="font-['Montserrat',sans-serif] font-semibold text-[13px] leading-tight">
                Play a game this week to keep your coins active
              </span>
            </div>
          )}

          {/* TWO MAIN GAME CARDS */}
          {/* 1. SIP MATCH CARD */}
          <div className="w-full bg-white rounded-[22px] p-5 shadow-sm border border-[#F4D2CF] flex flex-col gap-3 relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {/* Brain / Memory Icon */}
                <div className="w-12 h-12 rounded-[16px] bg-[#FFF5F3] border border-[#F4D2CF] flex items-center justify-center text-[#B92429]">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z" />
                    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-[24px] font-anton text-[#B92429] leading-tight uppercase">
                    SIP MATCH
                  </h2>
                  <p className="text-[12px] font-bold text-[#7A4547]">
                    Find the pairs from memory
                  </p>
                </div>
              </div>

              {/* Up to +12 Badge */}
              <span className="px-2.5 py-1 rounded-full bg-[#FFC93C]/30 text-[#3D0B0E] font-anton text-[13px] border border-[#FFC93C]/60">
                up to +12
              </span>
            </div>

            {/* Action / Status */}
            {isMatchDoneToday ? (
              <div className="w-full bg-[#FFF5F3] rounded-[16px] p-3 flex items-center justify-between border border-[#F4D2CF]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#8FC31F] flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-[12px] font-extrabold text-[#7A4547]">
                    Done (+{matchCoinsWon})
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#7A4547]/80">
                  Resets in {countdown}
                </span>
              </div>
            ) : (
              <Link
                href="/play/sip-match"
                className="w-full h-[48px] bg-[#B92429] hover:bg-[#A31D22] text-[#FFC93C] font-anton text-[18px] uppercase rounded-[16px] shadow-md flex items-center justify-center transition-all cursor-pointer"
              >
                PLAY NOW
              </Link>
            )}
          </div>

          {/* 2. SIP SLICE CARD (COMING SOON) */}
          <div className="w-full bg-[#FAF8F7] rounded-[22px] p-5 shadow-xs border border-[#EBE3E1] flex flex-col gap-3 relative overflow-hidden opacity-85">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {/* Fruit Slice Icon */}
                <div className="w-12 h-12 rounded-[16px] bg-[#F2ECE9] border border-[#E5DDD9] flex items-center justify-center text-gray-500">
                  <span className="text-2xl select-none">🍍</span>
                </div>
                <div>
                  <h2 className="text-[24px] font-anton text-gray-700 leading-tight uppercase">
                    SIP SLICE
                  </h2>
                  <p className="text-[12px] font-bold text-gray-500">
                    Get ready to slice &amp; win Sip Coins!
                  </p>
                </div>
              </div>

              {/* COMING SOON Badge */}
              <span className="px-2.5 py-1 rounded-full bg-gray-200 text-gray-600 font-anton text-[11px] tracking-wider border border-gray-300 uppercase">
                COMING SOON
              </span>
            </div>

            {/* Action / Status: Disabled non-clickable button */}
            <button
              type="button"
              disabled
              className="w-full h-[48px] bg-gray-200 text-gray-400 font-anton text-[16px] uppercase rounded-[16px] flex items-center justify-center cursor-not-allowed select-none"
            >
              COMING SOON
            </button>
          </div>

          {/* PROGRESS INFO CARD */}
          <div className="w-full bg-white rounded-[20px] p-4 shadow-sm border border-[#F4D2CF] flex flex-col gap-2 mt-2">
            <div className="flex justify-between items-center text-[12px] font-extrabold text-[#7A4547]">
              <span>FREE ZEE SIP GOAL</span>
              <span>{balance} / {target}</span>
            </div>
            <div className="w-full h-3 bg-[#FFF5F3] rounded-full overflow-hidden border border-[#F4D2CF]">
              <div
                className="h-full bg-[#B92429] rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.round((balance / target) * 100))}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-[#7A4547]">
              {Math.max(0, target - balance)} more coins to unlock your free Zee Sip
            </span>
          </div>
        </div>
      </div>

      {/* COIN EXPIRY TRIGGERED MODAL */}
      {showExpiredModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-5 select-none animate-fadeIn">
          <div className="w-full max-w-[340px] bg-white rounded-[28px] p-7 shadow-2xl flex flex-col items-center text-center border-4 border-[#B92429]">
            <div className="w-16 h-16 rounded-full bg-[#FFF5F3] border-2 border-[#B92429] flex items-center justify-center mb-3">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L1 21H23L12 2Z" fill="#B92429" />
                <path d="M12 9V14" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="17" r="1.25" fill="white" />
              </svg>
            </div>

            <h2 className="font-anton text-[26px] text-[#B92429] leading-tight uppercase mb-2">
              COINS EXPIRED
            </h2>
            <p className="text-[13px] font-bold text-[#7A4547] mb-5 leading-normal">
              Your Sip Coins expired because you haven&apos;t played in over 2 weeks. Start collecting again!
            </p>

            <button
              type="button"
              onClick={() => {
                setShowExpiredModal(false);
                fetchBalanceAndExpiry();
              }}
              className="w-full h-[52px] bg-[#B92429] text-[#FFC93C] font-anton text-[20px] uppercase rounded-[16px] shadow-lg cursor-pointer"
            >
              START PLAYING
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </main>
  );
}
