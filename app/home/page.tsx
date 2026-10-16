/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { CoinIcon } from '@/components/CoinIcon';
import { BottomNav } from '@/components/BottomNav';
import { CheckIcon } from '@/components/Icons';
import { ComingSoonModal } from '@/components/ComingSoonModal';
import { createClient } from '@/lib/supabase/client';
import { getCachedBalance, fetchAndCacheBalance } from '@/lib/balanceCache';

interface HistoryEntry {
  id: string;
  amount: number;
  source: string;
  description: string | null;
  created_at: string;
}

export default function HomePage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('Sipper');
  const [balance, setBalance] = useState<number | null>(() => getCachedBalance());
  const [target] = useState<number>(500);
  const [progressPercent, setProgressPercent] = useState<number>(() => {
    const cached = getCachedBalance();
    return cached !== null ? Math.min(100, Math.round((cached / 500) * 100)) : 0;
  });
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [coinsEarnedToday, setCoinsEarnedToday] = useState<number>(0);

  // Two New Games Statuses
  const [isMatchDoneToday, setIsMatchDoneToday] = useState<boolean>(false);
  const [isSliceDoneToday, setIsSliceDoneToday] = useState<boolean>(false);

  // Scan Bottle Coming Soon Modal
  const [isComingSoonOpen, setIsComingSoonOpen] = useState<boolean>(false);

  // Expiry states
  const [daysSinceLastPlay, setDaysSinceLastPlay] = useState<number>(0);
  const [daysUntilExpiry, setDaysUntilExpiry] = useState<number>(14);
  const [showExpiredModal, setShowExpiredModal] = useState<boolean>(false);

  const fetchBalanceAndExpiry = useCallback(() => {
    fetchAndCacheBalance();
    fetch('/api/balance')
      .then((res) => res.json())
      .then((data) => {
        if (data.balance !== undefined) {
          setBalance(data.balance);
          setProgressPercent(data.progress_percent || 0);
        }
        if (data.days_since_last_play !== undefined) {
          setDaysSinceLastPlay(data.days_since_last_play);
        }
        if (data.days_until_expiry !== undefined) {
          setDaysUntilExpiry(data.days_until_expiry);
        }
        if (data.expired_just_now) {
          setShowExpiredModal(true);
        }
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

      setUserName(user.user_metadata?.full_name?.split(' ')[0] || 'Sipper');

      // Check for pending guest session coins and claim them
      const pendingGuestId = typeof window !== 'undefined' ? localStorage.getItem('guest_session_id') : null;

      if (pendingGuestId) {
        fetch('/api/claim-guest-coins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guest_session_id: pendingGuestId,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            try {
              localStorage.removeItem('guest_session_id');
            } catch {}
            if (data.claimedCoins) {
              fetchBalanceAndExpiry();
            }
          })
          .catch(() => {});
      }

      // Prefetch routes for instant navigation
      router.prefetch('/profile');
      router.prefetch('/play');
      router.prefetch('/play/sip-match');
      router.prefetch('/play/sip-slice');
      router.prefetch('/rewards');

      // Fetch profile display name
      supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile?.display_name) {
            setUserName(profile.display_name.split(' ')[0]);
          }
        });

      fetchBalanceAndExpiry();

      // Calculate midnight IST
      const now = new Date();
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.getTime() + istOffsetMs);
      const istMidnightUTC = new Date(
        Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 0, 0, 0)
      );
      const midnightIST = new Date(istMidnightUTC.getTime() - istOffsetMs);

      // Fetch ledger history & coins earned today
      supabase
        .from('coin_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data: ledger }) => {
          if (ledger) {
            setHistoryEntries(ledger as HistoryEntry[]);
            const todayEntries = ledger.filter(
              (item) => new Date(item.created_at) >= midnightIST && item.amount > 0
            );
            const todaySum = todayEntries.reduce((sum, item) => sum + item.amount, 0);
            setCoinsEarnedToday(todaySum);
          }
        });

      // Fetch today's plays for Sip Match and Sip Slice
      supabase
        .from('game_plays')
        .select('*')
        .eq('user_id', user.id)
        .gte('played_at', midnightIST.toISOString())
        .order('played_at', { ascending: false })
        .then(({ data: plays }) => {
          if (plays) {
            const matchPlay = plays.find((p) => p.game_type === 'sip_match');
            if (matchPlay) {
              setIsMatchDoneToday(true);
            }

            const slicePlay = plays.find((p) => p.game_type === 'sip_slice');
            if (slicePlay) {
              setIsSliceDoneToday(true);
            }
          }
        });
    });

    window.addEventListener('focus', fetchBalanceAndExpiry);
    return () => {
      window.removeEventListener('focus', fetchBalanceAndExpiry);
    };
  }, [router, fetchBalanceAndExpiry]);

  const currentBalance = balance ?? 30;
  const remainingCoins = Math.max(0, target - currentBalance);

  // Activity summary last played label
  const lastPlayedText =
    daysSinceLastPlay === 0
      ? 'today'
      : daysSinceLastPlay === 1
      ? 'yesterday'
      : `${daysSinceLastPlay} days ago`;

  return (
    <main className="min-h-[100dvh] w-full max-w-[430px] mx-auto bg-[#FFF5F3] text-[#3D0B0E] flex flex-col justify-between pb-24 select-none relative overflow-x-hidden shadow-2xl">
      <div>
        {/* Top Yellow Band */}
        <div className="w-full bg-[#FFC93C] text-[#3D0B0E] pb-5 border-b-4 border-[#3D0B0E]">
          <Header variant="yellow" />

          {/* Greeting */}
          <div className="px-5 pt-1">
            <h1 className="text-[36px] font-anton text-[#B92429] leading-tight uppercase tracking-tight">
              HEY {userName}!
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-5 -mt-6 flex flex-col gap-4 relative z-10">
          {/* RED "YOUR SIP COINS" CARD */}
          <div className="w-full bg-[#B92429] text-white rounded-[24px] p-5 shadow-xl relative overflow-hidden">
            {/* Logo Watermark */}
            <img
              src="/zeesip-logo.png"
              alt="Zee Sip Logo Watermark"
              width={160}
              height={160}
              style={{ opacity: 0.15, borderRadius: '50%', objectFit: 'cover' }}
              className="absolute -right-[20px] -bottom-[20px] pointer-events-none"
            />

            {/* Header: Label + HISTORY Link */}
            <div className="flex items-center justify-between z-10 relative">
              <span className="text-[11px] font-extrabold text-white/80 tracking-widest uppercase">
                YOUR SIP COINS
              </span>
              <button
                onClick={() => setShowHistoryModal(true)}
                className="text-[11px] font-extrabold text-[#FFC93C] underline underline-offset-2 hover:text-white cursor-pointer uppercase"
              >
                HISTORY
              </button>
            </div>

            {/* Balance Hero: Left gold coin SVG (~44px) + balance number */}
            <div className="flex items-center gap-3 my-3 z-10 relative">
              <CoinIcon size={44} />
              {balance === null ? (
                <div className="h-16 w-32 bg-white/20 rounded-lg animate-pulse" />
              ) : (
                <span className="text-[72px] font-anton text-[#FFC93C] leading-none tracking-tight">
                  {balance}
                </span>
              )}
            </div>

            {/* Progress Bar (against 500) */}
            <div className="w-full z-10 relative">
              <div className="w-full h-3 bg-black/25 rounded-full overflow-hidden border border-white/20">
                <div
                  className="h-full bg-[#FFC93C] rounded-full transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] font-bold text-white/90 mt-1.5">
                {remainingCoins > 0
                  ? `${remainingCoins} more coins to a free Zee Sip`
                  : 'Reward unlocked! Ready to claim.'}
              </p>
            </div>
          </div>

          {/* COIN EXPIRY WARNING BANNERS BELOW COIN CARD */}
          {daysSinceLastPlay >= 11 && daysSinceLastPlay <= 13 && (
            <div className="w-full bg-[#B92429] text-white rounded-[16px] p-3.5 flex items-center gap-2.5 shadow-md border border-[#7A1418]">
              {/* Yellow Warning Triangle SVG */}
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

          {/* THINGS TO DO SECTION - ONLY THE TWO NEW GAMES + SCAN BOTTLE */}
          <div className="flex flex-col gap-3 mt-1">
            <h2 className="text-[26px] font-anton text-[#B92429] uppercase tracking-wide">
              THINGS TO DO
            </h2>

            <div className="flex flex-col gap-2.5">
              {/* 1. Sip Match */}
              <Link
                href="/play/sip-match"
                className={`w-full bg-white rounded-[18px] p-3.5 shadow-sm border-l-4 flex items-center justify-between transition-transform active:scale-[0.99] ${
                  isMatchDoneToday ? 'border-l-[#8FC31F]' : 'border-l-[#B92429]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                      isMatchDoneToday
                        ? 'bg-[#8FC31F] border-[#8FC31F] text-white'
                        : 'border-[#3D0B0E]/30 bg-transparent'
                    }`}
                  >
                    {isMatchDoneToday && <CheckIcon size={14} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-extrabold text-[#3D0B0E]">
                      Sip Match
                    </span>
                    <span className="text-[11px] font-bold text-[#7A4547]">
                      {isMatchDoneToday ? 'Done today' : 'Play now'}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#FFC93C]/30 text-[#3D0B0E] font-anton text-[12px] border border-[#FFC93C]/60">
                  {isMatchDoneToday ? 'DONE' : 'up to +12'}
                </span>
              </Link>

              {/* 2. Sip Slice */}
              <Link
                href="/play/sip-slice"
                className={`w-full bg-white rounded-[18px] p-3.5 shadow-sm border-l-4 flex items-center justify-between transition-transform active:scale-[0.99] ${
                  isSliceDoneToday ? 'border-l-[#8FC31F]' : 'border-l-[#B92429]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                      isSliceDoneToday
                        ? 'bg-[#8FC31F] border-[#8FC31F] text-white'
                        : 'border-[#3D0B0E]/30 bg-transparent'
                    }`}
                  >
                    {isSliceDoneToday && <CheckIcon size={14} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-extrabold text-[#3D0B0E]">
                      Sip Slice
                    </span>
                    <span className="text-[11px] font-bold text-[#7A4547]">
                      {isSliceDoneToday ? 'Done today' : 'Play now'}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#FFC93C]/30 text-[#3D0B0E] font-anton text-[12px] border border-[#FFC93C]/60">
                  {isSliceDoneToday ? 'DONE' : 'up to +10'}
                </span>
              </Link>

              {/* 3. Scan a Zee Sip bottle (Coming Soon) */}
              <button
                type="button"
                onClick={() => setIsComingSoonOpen(true)}
                className="w-full bg-gray-50/90 rounded-[18px] p-3.5 shadow-sm border-l-4 border-l-gray-400 flex items-center justify-between transition-transform active:scale-[0.99] cursor-pointer text-left opacity-80"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-400 bg-transparent" />
                  <div className="flex flex-col">
                    <span className="text-[14px] font-extrabold text-gray-700">
                      Scan a Zee Sip bottle
                    </span>
                    <span className="text-[11px] font-bold text-gray-500">
                      Scan QR code on bottle
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-gray-200 text-gray-700 font-anton text-[10px] uppercase">
                  COMING SOON
                </span>
              </button>
            </div>
          </div>

          {/* ACTIVITY SUMMARY AT THE BOTTOM */}
          <div className="w-full bg-white/80 rounded-[16px] p-3.5 border border-[#F4D2CF] flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <CoinIcon size={20} />
              <span className="text-[12px] font-extrabold text-[#3D0B0E]">
                {coinsEarnedToday} coins earned today
              </span>
            </div>
            <div className="text-[11.5px] font-extrabold text-[#7A4547]">
              Last played: {lastPlayedText}
            </div>
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
                router.push('/play');
              }}
              className="w-full h-[52px] bg-[#B92429] text-[#FFC93C] font-anton text-[20px] uppercase rounded-[16px] shadow-lg cursor-pointer"
            >
              START PLAYING
            </button>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-[24px] p-5 shadow-2xl flex flex-col gap-4 animate-slideUp">
            <div className="flex items-center justify-between border-b border-[#F4D2CF] pb-3">
              <h3 className="font-anton text-[22px] text-[#B92429] uppercase">
                COIN HISTORY
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-[#FFF5F3] text-[#3D0B0E] font-bold flex items-center justify-center hover:bg-[#FCE4E1]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto flex flex-col gap-2.5 pr-1">
              {historyEntries.length === 0 ? (
                <p className="text-xs text-[#7A4547] text-center py-4 font-bold">
                  No coin transaction history yet.
                </p>
              ) : (
                historyEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-[14px] bg-[#FFF5F3] border border-[#F4D2CF]"
                  >
                    <div className="flex flex-col">
                      <span className="text-[12px] font-extrabold text-[#3D0B0E]">
                        {entry.source.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] font-bold text-[#7A4547]">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span
                      className={`font-anton text-[18px] ${
                        entry.amount >= 0 ? 'text-[#8FC31F]' : 'text-[#B92429]'
                      }`}
                    >
                      {entry.amount >= 0 ? `+${entry.amount}` : entry.amount}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Coming Soon Modal */}
      <ComingSoonModal
        isOpen={isComingSoonOpen}
        onClose={() => setIsComingSoonOpen(false)}
      />

      {/* Bottom Navigation */}
      <BottomNav />
    </main>
  );
}
