'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { CoinIcon } from '@/components/CoinIcon';
import { BottomNav } from '@/components/BottomNav';
import { SpinWheel } from '@/components/SpinWheel';
import { MiniWheelIcon, CameraIcon, TicketIcon, SlotsIcon, CheckIcon } from '@/components/Icons';
import { ComingSoonModal } from '@/components/ComingSoonModal';
import { createClient } from '@/lib/supabase/client';
import { addOptimisticCoins } from '@/lib/balanceCache';

export default function PlayPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number>(0);
  const [isComingSoonOpen, setIsComingSoonOpen] = useState<boolean>(false);
  const [isSpunToday, setIsSpunToday] = useState<boolean>(false);
  const [dailySpinCoinsWon, setDailySpinCoinsWon] = useState<number>(0);

  const [isThreeSipsDoneToday, setIsThreeSipsDoneToday] = useState<boolean>(false);
  const [threeSipsCoinsWon, setThreeSipsCoinsWon] = useState<number>(0);
  const [isKulkkiDoneToday, setIsKulkkiDoneToday] = useState<boolean>(false);
  const [kulkkiCoinsWon, setKulkkiCoinsWon] = useState<number>(0);
  const [isScratchDoneToday, setIsScratchDoneToday] = useState<boolean>(false);
  const [scratchCoinsWon, setScratchCoinsWon] = useState<number>(0);

  const [countdown, setCountdown] = useState<string>('');
  const [isSpinModalOpen, setIsSpinModalOpen] = useState<boolean>(false);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [spinResult, setSpinResult] = useState<{ value: number; label: string } | null>(null);
  const [showResultOverlay, setShowResultOverlay] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Profile task completion states
  const [isProfileDone, setIsProfileDone] = useState<boolean>(false);
  const [isAddressDone, setIsAddressDone] = useState<boolean>(false);
  const [isTeamDone, setIsTeamDone] = useState<boolean>(false);

  const fetchBalance = useCallback(() => {
    fetch('/api/balance')
      .then((res) => res.json())
      .then((data) => {
        if (data.balance !== undefined) setBalance(data.balance);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      // Prefetch routes for instant navigation
      router.prefetch('/home');
      router.prefetch('/profile');
      router.prefetch('/play/three-sips');
      router.prefetch('/play/pick-kulkki');
      router.prefetch('/play/scratch');
      router.prefetch('/rewards');

      // Fetch balance
      fetchBalance();

      const todayStr = new Date().toISOString().split('T')[0];

      // Check if daily spin done today & fetch amount won
      supabase
        .from('coin_ledger')
        .select('amount, created_at')
        .eq('user_id', user.id)
        .eq('source', 'DAILY_SPIN')
        .gte('created_at', `${todayStr}T00:00:00.000Z`)
        .then(({ data: spins }) => {
          if (spins && spins.length > 0) {
            setIsSpunToday(true);
            setDailySpinCoinsWon(spins[0].amount);
          } else {
            // Also check events for OOPS spins today
            supabase
              .from('events')
              .select('metadata, created_at')
              .eq('user_id', user.id)
              .eq('event_type', 'DAILY_SPIN_COMPLETED')
              .gte('created_at', `${todayStr}T00:00:00.000Z`)
              .then(({ data: events }) => {
                if (events && events.length > 0) {
                  setIsSpunToday(true);
                  setDailySpinCoinsWon(events[0].metadata?.value ?? 0);
                }
              });
          }
        });

      // Check Three Sips played today
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
            setIsThreeSipsDoneToday(true);
            setThreeSipsCoinsWon(plays[0].coins_won);
          }
        });

      // Check Pick the Kulkki played today
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
            setIsKulkkiDoneToday(true);
            setKulkkiCoinsWon(plays[0].coins_won);
          }
        });

      // Check Scratch Your Sip played today
      supabase
        .from('game_plays')
        .select('*')
        .eq('user_id', user.id)
        .eq('game_type', 'scratch')
        .gte('played_at', `${todayStr}T00:00:00.000Z`)
        .order('played_at', { ascending: false })
        .limit(1)
        .then(({ data: plays }) => {
          if (plays && plays.length > 0) {
            setIsScratchDoneToday(true);
            setScratchCoinsWon(plays[0].coins_won);
          }
        });

      // Check profile tasks completion
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile) {
            setIsProfileDone(Boolean(profile.display_name && profile.phone_number && profile.pincode));
            setIsAddressDone(Boolean(profile.address_line1 && profile.city && profile.state && profile.pincode));
            setIsTeamDone(Boolean(profile.team));
          }
        });
    });

    // Re-fetch balance on window focus
    window.addEventListener('focus', fetchBalance);

    // Countdown timer to midnight IST
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

    return () => {
      window.removeEventListener('focus', fetchBalance);
      clearInterval(interval);
    };
  }, [router, fetchBalance]);

  // Handle browser back button navigation for modals/overlays
  useEffect(() => {
    if (isSpinModalOpen || showResultOverlay) {
      window.history.pushState({ spinModal: true }, '');
      const handlePopState = () => {
        setShowResultOverlay(false);
        setIsSpinModalOpen(false);
      };
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isSpinModalOpen, showResultOverlay]);

  const handleStartSpin = async () => {
    if (isSpinning || isSpunToday) return;

    setErrorMsg(null);
    setIsSpinning(true);

    try {
      const res = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Spin failed');
        setIsSpinning(false);
        return;
      }

      setTargetIndex(data.segment_index);
      setSpinResult({ value: data.value, label: data.value === 0 ? 'OOPS' : `+${data.value}` });
    } catch {
      setErrorMsg('Connection error. Please try again.');
      setIsSpinning(false);
    }
  };

  const handleSpinComplete = () => {
    setIsSpinning(false);
    setIsSpunToday(true);
    if (spinResult) {
      setDailySpinCoinsWon(spinResult.value);
      if (spinResult.value > 0) {
        setBalance((prev) => prev + spinResult.value);
        addOptimisticCoins(spinResult.value);
      }
    }
    // Show exciting result overlay popup
    setShowResultOverlay(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  };

  return (
    <main className="min-h-[100dvh] w-full max-w-[430px] mx-auto bg-[#FFF5F3] text-[#3D0B0E] flex flex-col justify-between pb-24 select-none relative overflow-x-hidden shadow-2xl">
      {/* Coming Soon Modal */}
      <ComingSoonModal isOpen={isComingSoonOpen} onClose={() => setIsComingSoonOpen(false)} />

      {/* Toast Notification Popup */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#3D0B0E] text-[#FFC93C] font-['Montserrat',sans-serif] font-bold text-xs px-5 py-3 rounded-full shadow-2xl border border-[#FFC93C]/40 animate-bounce text-center max-w-[340px]">
          {toastMsg}
        </div>
      )}

      <div>
        {/* Top Header */}
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
              PLAY & WIN
            </h1>
          </div>
        </div>

        {/* Content Container */}
        <div className="px-5 py-5 flex flex-col gap-6">
          {/* FEATURED DAILY SPIN CARD (Fix 3) */}
          <div
            onClick={() => setIsSpinModalOpen(true)}
            className={`w-full rounded-[24px] p-5 shadow-xl flex flex-col gap-4 relative overflow-hidden cursor-pointer transition-transform active:scale-[0.99] ${
              isSpunToday ? 'bg-[#9E1B20] border border-white/10' : 'bg-[#B92429]'
            }`}
          >
            {isSpunToday && <div className="absolute inset-0 bg-black/15 pointer-events-none" />}

            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                {isSpunToday ? (
                  <div className="w-12 h-12 rounded-[16px] bg-[#8FC31F] text-white flex items-center justify-center shadow-md">
                    <CheckIcon size={26} />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-[16px] bg-[#FFC93C] flex items-center justify-center text-[#3D0B0E] shadow-md">
                    <MiniWheelIcon size={30} />
                  </div>
                )}
                <div className="flex flex-col">
                  <h2 className="font-anton text-[22px] text-white leading-none uppercase">
                    DAILY SPIN
                  </h2>
                  <span className="text-[12px] font-extrabold mt-1">
                    {isSpunToday ? (
                      dailySpinCoinsWon > 0 ? (
                        <span className="text-[#FFC93C]">Won +{dailySpinCoinsWon} today</span>
                      ) : (
                        <span className="text-white/70">OOPS today</span>
                      )
                    ) : (
                      <span className="text-white/90">Win up to 50 coins</span>
                    )}
                  </span>
                </div>
              </div>

              {!isSpunToday ? (
                <span className="px-4 py-2 rounded-[14px] bg-[#FFC93C] text-[#3D0B0E] font-anton text-[16px] uppercase shadow-md">
                  SPIN
                </span>
              ) : (
                <span className="font-anton text-[18px] text-white tracking-wider">
                  {countdown.split(' ')[0]} {countdown.split(' ')[1]}
                </span>
              )}
            </div>
          </div>

          {/* GAMES SECTION: MORE GAMES */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[22px] font-anton text-[#B92429] uppercase tracking-wide">
              MORE GAMES
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {/* Three Sips */}
              <Link
                href="/play/three-sips"
                className="bg-white rounded-[20px] p-4 shadow-sm border border-[#F4D2CF] flex flex-col justify-between h-[130px] text-left hover:border-[#B92429] transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-[14px] bg-[#FFE14D] flex items-center justify-center text-[#3D0B0E]">
                    <SlotsIcon size={22} />
                  </div>
                  {isThreeSipsDoneToday ? (
                    <span className="px-2 py-0.5 rounded-full bg-[#8FC31F] text-white font-anton text-[11px] flex items-center gap-1">
                      <CheckIcon size={10} /> Done
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-[#FFC93C] text-[#3D0B0E] font-anton text-[11px]">
                      PLAY
                    </span>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-anton text-[16px] text-[#3D0B0E] leading-none uppercase">
                    THREE SIPS
                  </span>
                  <span className="text-[10px] font-bold text-[#7A4547] mt-1">
                    {isThreeSipsDoneToday ? `Won +${threeSipsCoinsWon} coins` : '3-reel slot machine'}
                  </span>
                </div>
              </Link>

              {/* Pick the Kulkki */}
              <Link
                href="/play/pick-kulkki"
                className="bg-white rounded-[20px] p-4 shadow-sm border border-[#F4D2CF] flex flex-col justify-between h-[130px] text-left hover:border-[#B92429] transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-[14px] bg-[#CDEE1C] flex items-center justify-center text-[#3D0B0E]">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4M8 6h8M7 9h10l-1 12H8L7 9z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  {isKulkkiDoneToday ? (
                    <span className="px-2 py-0.5 rounded-full bg-[#8FC31F] text-white font-anton text-[11px] flex items-center gap-1">
                      <CheckIcon size={10} /> Done
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-[#FFC93C] text-[#3D0B0E] font-anton text-[11px]">
                      PLAY
                    </span>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-anton text-[16px] text-[#3D0B0E] leading-none uppercase">
                    PICK KULKKI
                  </span>
                  <span className="text-[10px] font-bold text-[#7A4547] mt-1">
                    {isKulkkiDoneToday ? `Won +${kulkkiCoinsWon} coins` : 'Shuffle & pick winning bottle'}
                  </span>
                </div>
              </Link>

              {/* Scratch Your Sip */}
              <Link
                href="/play/scratch"
                className="bg-white rounded-[20px] p-4 shadow-sm border border-[#F4D2CF] flex flex-col justify-between h-[130px] text-left hover:border-[#B92429] transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-[14px] bg-[#FCE4E1] flex items-center justify-center text-[#B92429]">
                    <TicketIcon size={22} />
                  </div>
                  {isScratchDoneToday ? (
                    <span className="px-2 py-0.5 rounded-full bg-[#8FC31F] text-white font-anton text-[11px] flex items-center gap-1">
                      <CheckIcon size={10} /> Done
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-[#FFC93C] text-[#3D0B0E] font-anton text-[11px]">
                      PLAY
                    </span>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-anton text-[16px] text-[#3D0B0E] leading-none uppercase">
                    SCRATCH YOUR SIP
                  </span>
                  <span className="text-[10px] font-bold text-[#7A4547] mt-1">
                    {isScratchDoneToday ? `Won +${scratchCoinsWon} coins` : 'Feeling lucky today?'}
                  </span>
                </div>
              </Link>

              {/* Scan a Bottle Card */}
              <button
                type="button"
                onClick={() => setIsComingSoonOpen(true)}
                className="bg-gray-50 opacity-75 rounded-[20px] p-4 shadow-sm border border-gray-200 flex flex-col justify-between h-[130px] text-left hover:border-gray-400 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-[14px] bg-gray-200 flex items-center justify-center text-gray-600">
                    <CameraIcon size={22} />
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 font-anton text-[10px] uppercase">
                    COMING SOON
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-anton text-[16px] text-gray-700 leading-none uppercase">
                    SCAN BOTTLE
                  </span>
                  <span className="text-[10px] font-bold text-gray-500 mt-1">
                    Verify Zee Sip bottle
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* THINGS TO DO SECTION */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[22px] font-anton text-[#B92429] uppercase tracking-wide">
              THINGS TO DO
            </h2>

            <div className="flex flex-col gap-2.5">
              {/* 1. Daily Games */}
              <div
                onClick={() => setIsSpinModalOpen(true)}
                className={`w-full bg-white rounded-[18px] p-3.5 shadow-sm border-l-4 flex items-center justify-between transition-transform active:scale-[0.99] cursor-pointer ${
                  isSpunToday ? 'border-l-[#8FC31F]' : 'border-l-[#B92429]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    isSpunToday ? 'bg-[#8FC31F] border-[#8FC31F] text-white' : 'border-[#3D0B0E]/30 bg-transparent'
                  }`}>
                    {isSpunToday && <CheckIcon size={14} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-extrabold text-[#3D0B0E]">Spin the wheel</span>
                    <span className="text-[10px] font-bold text-[#7A4547]">
                      {isSpunToday ? 'Done today' : 'Daily spin available'}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#FFC93C]/30 text-[#3D0B0E] font-anton text-[12px]">
                  up to +50
                </span>
              </div>

              <Link
                href="/play/three-sips"
                className={`w-full bg-white rounded-[18px] p-3.5 shadow-sm border-l-4 flex items-center justify-between transition-transform active:scale-[0.99] ${
                  isThreeSipsDoneToday ? 'border-l-[#8FC31F]' : 'border-l-[#B92429]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    isThreeSipsDoneToday ? 'bg-[#8FC31F] border-[#8FC31F] text-white' : 'border-[#3D0B0E]/30 bg-transparent'
                  }`}>
                    {isThreeSipsDoneToday && <CheckIcon size={14} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-extrabold text-[#3D0B0E]">Play Three Sips</span>
                    <span className="text-[10px] font-bold text-[#7A4547]">
                      {isThreeSipsDoneToday ? 'Done today' : '3-reel slot game'}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#FFC93C]/30 text-[#3D0B0E] font-anton text-[12px]">
                  up to +50
                </span>
              </Link>

              <Link
                href="/play/pick-kulkki"
                className={`w-full bg-white rounded-[18px] p-3.5 shadow-sm border-l-4 flex items-center justify-between transition-transform active:scale-[0.99] ${
                  isKulkkiDoneToday ? 'border-l-[#8FC31F]' : 'border-l-[#B92429]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    isKulkkiDoneToday ? 'bg-[#8FC31F] border-[#8FC31F] text-white' : 'border-[#3D0B0E]/30 bg-transparent'
                  }`}>
                    {isKulkkiDoneToday && <CheckIcon size={14} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-extrabold text-[#3D0B0E]">Pick the Kulkki</span>
                    <span className="text-[10px] font-bold text-[#7A4547]">
                      {isKulkkiDoneToday ? 'Done today' : 'Bottle shuffle game'}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#FFC93C]/30 text-[#3D0B0E] font-anton text-[12px]">
                  up to +25
                </span>
              </Link>

              <Link
                href="/play/scratch"
                className={`w-full bg-white rounded-[18px] p-3.5 shadow-sm border-l-4 flex items-center justify-between transition-transform active:scale-[0.99] ${
                  isScratchDoneToday ? 'border-l-[#8FC31F]' : 'border-l-[#B92429]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    isScratchDoneToday ? 'bg-[#8FC31F] border-[#8FC31F] text-white' : 'border-[#3D0B0E]/30 bg-transparent'
                  }`}>
                    {isScratchDoneToday && <CheckIcon size={14} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-extrabold text-[#3D0B0E]">Scratch Your Sip</span>
                    <span className="text-[10px] font-bold text-[#7A4547]">
                      {isScratchDoneToday ? 'Done today' : 'Digital scratch card'}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#FFC93C]/30 text-[#3D0B0E] font-anton text-[12px]">
                  up to +50
                </span>
              </Link>

              {/* 2. Scan a Zee Sip bottle */}
              <button
                type="button"
                onClick={() => setIsComingSoonOpen(true)}
                className="w-full bg-gray-50/90 rounded-[18px] p-3.5 shadow-sm border-l-4 border-l-gray-400 flex items-center justify-between transition-transform active:scale-[0.99] cursor-pointer text-left opacity-80"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-400 bg-transparent" />
                  <div className="flex flex-col">
                    <span className="text-[13px] font-extrabold text-gray-700">Scan a Zee Sip bottle</span>
                    <span className="text-[10px] font-bold text-gray-500">Scan QR code on bottle</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-gray-200 text-gray-700 font-anton text-[10px] uppercase">
                  COMING SOON
                </span>
              </button>

              {/* 3. Completed One-Time Tasks */}
              <Link
                href="/profile"
                className={`w-full bg-white/70 rounded-[18px] p-3.5 shadow-sm border-l-4 flex items-center justify-between transition-transform active:scale-[0.99] ${
                  isProfileDone ? 'border-l-[#8FC31F] opacity-60' : 'border-l-[#B92429]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    isProfileDone ? 'bg-[#8FC31F] border-[#8FC31F] text-white' : 'border-[#3D0B0E]/30 bg-transparent'
                  }`}>
                    {isProfileDone && <CheckIcon size={14} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-extrabold text-[#3D0B0E]">Complete your profile</span>
                    <span className="text-[10px] font-bold text-[#7A4547]">
                      {isProfileDone ? 'Completed' : 'Add name, phone & pincode'}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#FFC93C]/30 text-[#3D0B0E] font-anton text-[12px]">
                  +10 coins
                </span>
              </Link>

              <Link
                href="/profile"
                className={`w-full bg-white/70 rounded-[18px] p-3.5 shadow-sm border-l-4 flex items-center justify-between transition-transform active:scale-[0.99] ${
                  isAddressDone ? 'border-l-[#8FC31F] opacity-60' : 'border-l-[#B92429]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    isAddressDone ? 'bg-[#8FC31F] border-[#8FC31F] text-white' : 'border-[#3D0B0E]/30 bg-transparent'
                  }`}>
                    {isAddressDone && <CheckIcon size={14} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-extrabold text-[#3D0B0E]">Add delivery address</span>
                    <span className="text-[10px] font-bold text-[#7A4547]">
                      {isAddressDone ? 'Completed' : 'Required to receive rewards'}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#FFC93C]/30 text-[#3D0B0E] font-anton text-[12px]">
                  +10 coins
                </span>
              </Link>

              <Link
                href="/profile"
                className={`w-full bg-white/70 rounded-[18px] p-3.5 shadow-sm border-l-4 flex items-center justify-between transition-transform active:scale-[0.99] ${
                  isTeamDone ? 'border-l-[#8FC31F] opacity-60' : 'border-l-[#B92429]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    isTeamDone ? 'bg-[#8FC31F] border-[#8FC31F] text-white' : 'border-[#3D0B0E]/30 bg-transparent'
                  }`}>
                    {isTeamDone && <CheckIcon size={14} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-extrabold text-[#3D0B0E]">Pick your team</span>
                    <span className="text-[10px] font-bold text-[#7A4547]">
                      {isTeamDone ? 'Completed' : 'Team Mango or Team Pineapple'}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#FFC93C]/30 text-[#3D0B0E] font-anton text-[12px]">
                  +5 coins
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* DAILY SPIN MODAL */}
      {isSpinModalOpen && (
        <div
          onClick={() => setIsSpinModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 cursor-pointer animate-fadeIn"
        >
          {/* ALWAYS VISIBLE FIXED TOP-RIGHT CLOSE BUTTON */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsSpinModalOpen(false);
            }}
            style={{
              position: 'fixed',
              top: '16px',
              right: '16px',
              zIndex: 9999,
              width: '48px',
              height: '48px',
              background: 'rgba(0,0,0,0.5)',
              border: 'none',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18"/>
            </svg>
          </button>

          {/* FIX 1: ALREADY SPUN TODAY — CLEAN CARD (NO WHEEL) */}
          {isSpunToday ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#B92429] rounded-[28px] p-6 shadow-2xl flex flex-col items-center gap-5 relative text-white border-2 border-[#FFC93C] cursor-default"
            >
              {/* Top-Left ← BACK link */}
              <div className="w-full flex items-center justify-between z-10">
                <button
                  type="button"
                  onClick={() => setIsSpinModalOpen(false)}
                  className="text-xs font-bold text-white/80 hover:text-white uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  ← BACK TO PLAY
                </button>
              </div>

              <h3 className="font-anton text-[28px] text-white uppercase tracking-wide">
                DAILY SPIN
              </h3>

              {/* White Result Card */}
              <div className="w-full bg-white rounded-[24px] p-6 text-[#3D0B0E] shadow-xl flex flex-col items-center text-center">
                <span className="text-[13px] font-bold text-[#7A4547] uppercase tracking-wider">
                  Today you won
                </span>

                <div className="flex items-center gap-2.5 my-3">
                  {dailySpinCoinsWon > 0 ? (
                    <>
                      {/* 44px Gold Coin SVG */}
                      <svg width="44" height="44" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="11" fill="#FFC93C" />
                        <circle cx="12" cy="12" r="7" fill="none" stroke="#B92429" strokeWidth="1.6" />
                        <path
                          d="M12 6.5C12.35 10.2 13.8 11.65 17.5 12 13.8 12.35 12.35 13.8 12 17.5 11.65 13.8 10.2 12.35 6.5 12 10.2 11.65 11.65 10.2 12 6.5z"
                          fill="#B92429"
                        />
                      </svg>
                      <span className="font-anton text-[38px] text-[#FFC93C] leading-none drop-shadow-[0_2px_4px_rgba(61,11,14,0.3)]">
                        +{dailySpinCoinsWon} COINS
                      </span>
                    </>
                  ) : (
                    <>
                      <svg width="44" height="44" viewBox="0 0 24 24" className="opacity-30">
                        <circle cx="12" cy="12" r="11" fill="#7A4547" />
                        <circle cx="12" cy="12" r="7" fill="none" stroke="#3D0B0E" strokeWidth="1.6" />
                      </svg>
                      <span className="font-anton text-[32px] text-[#7A4547] leading-none">
                        OOPS — 0 COINS
                      </span>
                    </>
                  )}
                </div>

                <div className="w-full border-b border-[#F4D2CF] my-4" />

                <span className="text-[13px] font-bold text-[#7A4547]">
                  Next spin available in:
                </span>

                <span className="font-anton text-[36px] text-[#B92429] tracking-widest my-1">
                  {countdown}
                </span>

                <span className="text-[11px] font-bold text-[#7A4547]">
                  Resets daily at 12:00 AM IST
                </span>
              </div>
            </div>
          ) : (
            /* FIX 2 STEP 1 & 2: SPIN AVAILABLE WHEEL SCREEN */
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#B92429] rounded-[28px] p-6 shadow-2xl flex flex-col items-center gap-5 relative text-white border-2 border-[#FFC93C] cursor-default"
            >
              {/* Modal Header: Top-Left ← BACK link */}
              <div className="w-full flex items-center justify-between z-10">
                <button
                  type="button"
                  onClick={() => setIsSpinModalOpen(false)}
                  className="text-xs font-bold text-white/80 hover:text-white uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  ← BACK
                </button>
              </div>

              <h3 className="font-anton text-[28px] text-[#FFC93C] uppercase tracking-wide">
                DAILY SPIN
              </h3>

              <SpinWheel
                targetIndex={targetIndex}
                isSpinning={isSpinning}
                onSpinComplete={handleSpinComplete}
              />

              <button
                type="button"
                onClick={handleStartSpin}
                disabled={isSpinning}
                className="w-full h-[56px] bg-[#FFC93C] hover:bg-[#FFE14D] active:scale-[0.98] text-[#3D0B0E] font-anton text-[22px] uppercase rounded-[18px] shadow-lg transition-all disabled:opacity-75 cursor-pointer"
              >
                {isSpinning ? 'SPINNING...' : 'SPIN'}
              </button>

              {errorMsg && (
                <p className="text-xs font-bold text-amber-200 text-center">{errorMsg}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* FIX 2 STEP 3: FULL SCREEN RESULT POPUP OVERLAY */}
      {showResultOverlay && spinResult && (
        <div
          onClick={() => {
            setShowResultOverlay(false);
            setIsSpinModalOpen(false);
          }}
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-fadeIn"
        >
          {/* FIXED TOP-RIGHT CLOSE BUTTON */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowResultOverlay(false);
              setIsSpinModalOpen(false);
            }}
            style={{
              position: 'fixed',
              top: '16px',
              right: '16px',
              zIndex: 9999,
              width: '48px',
              height: '48px',
              background: 'rgba(0,0,0,0.5)',
              border: 'none',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18"/>
            </svg>
          </button>

          {/* IF WIN (+25, +30, +35, +40, +50) */}
          {spinResult.value > 0 ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[340px] bg-white rounded-[28px] p-7 shadow-2xl flex flex-col items-center text-center relative overflow-hidden border-4 border-[#FFC93C] cursor-default"
            >
              {/* Background Floating Sparkle Stars */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[
                  { left: '10%', delay: '0s', size: 18, color: '#FFC93C' },
                  { left: '25%', delay: '0.3s', size: 14, color: '#B92429' },
                  { left: '45%', delay: '0.1s', size: 22, color: '#FFC93C' },
                  { left: '65%', delay: '0.5s', size: 16, color: '#B92429' },
                  { left: '82%', delay: '0.2s', size: 20, color: '#FFC93C' },
                  { left: '35%', delay: '0.7s', size: 14, color: '#B92429' },
                  { left: '75%', delay: '0.4s', size: 24, color: '#FFC93C' },
                ].map((s, idx) => (
                  <div
                    key={idx}
                    className="absolute animate-floatUp opacity-70"
                    style={{
                      left: s.left,
                      bottom: '-30px',
                      animationDelay: s.delay,
                      animationDuration: '2.5s',
                    }}
                  >
                    <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill={s.color}>
                      <path d="M12 0C12 8 16 12 24 12C16 12 12 16 12 24C12 16 8 12 0 12C8 12 12 8 12 0Z" />
                    </svg>
                  </div>
                ))}
              </div>

              {/* b. YOU WON text */}
              <span className="text-[14px] font-extrabold text-[#B92429] uppercase tracking-widest font-['Montserrat',sans-serif]">
                YOU WON
              </span>

              {/* c. Large 80px Gold Coin SVG with scaleUp */}
              <div className="my-3 animate-scaleUp">
                <svg width="80" height="80" viewBox="0 0 24 24" className="drop-shadow-[0_8px_16px_rgba(61,11,14,0.3)]">
                  <circle cx="12" cy="12" r="11" fill="#FFC93C" />
                  <circle cx="12" cy="12" r="7" fill="none" stroke="#B92429" strokeWidth="1.6" />
                  <path
                    d="M12 6.5C12.35 10.2 13.8 11.65 17.5 12 13.8 12.35 12.35 13.8 12 17.5 11.65 13.8 10.2 12.35 6.5 12 10.2 11.65 11.65 10.2 12 6.5z"
                    fill="#B92429"
                  />
                </svg>
              </div>

              {/* d. Huge +X amount in gold Anton font 96px */}
              <h2 className="font-anton text-[96px] text-[#FFC93C] leading-none tracking-tight drop-shadow-[0_4px_12px_rgba(61,11,14,0.35)] -my-2">
                +{spinResult.value}
              </h2>

              {/* e. SIP COINS */}
              <span className="font-anton text-[24px] text-[#B92429] uppercase tracking-wide">
                SIP COINS
              </span>

              {/* f. Progress bar showing new total */}
              <div className="w-full bg-[#FFF5F3] rounded-[16px] p-3 my-4 border border-[#F4D2CF] flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[12px] font-extrabold text-[#7A4547]">
                  <span>{balance} / 250</span>
                  <span>{Math.max(0, 250 - balance)} more to go</span>
                </div>
                <div className="w-full h-3 bg-[#FCE4E1] rounded-full overflow-hidden border border-[#F4D2CF]">
                  <div
                    className="h-full bg-[#B92429] rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.round((balance / 250) * 100))}%` }}
                  />
                </div>
              </div>

              {/* g. Subtext */}
              <p className="text-[13px] font-extrabold text-[#7A4547] leading-snug mb-4">
                Keep spinning daily to reach your free Zee Sip!
              </p>

              {/* h. COLLECT button */}
              <button
                type="button"
                onClick={() => {
                  setShowResultOverlay(false);
                  setIsSpinModalOpen(false);
                }}
                className="w-full h-[56px] bg-[#B92429] hover:bg-[#7A1418] active:scale-[0.98] text-white font-anton text-[20px] uppercase rounded-[16px] shadow-lg transition-all cursor-pointer flex items-center justify-center"
              >
                COLLECT
              </button>

              {/* i. Auto added subtext */}
              <span className="text-[12px] font-bold text-[#7A4547] mt-2">
                Your coins have been added automatically
              </span>
            </div>
          ) : (
            /* IF OOPS (0 coins) */
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[340px] bg-white rounded-[28px] p-7 shadow-2xl flex flex-col items-center text-center animate-womp border-4 border-[#3D0B0E] cursor-default"
            >
              {/* b. OOPS heading */}
              <h2 className="font-anton text-[48px] text-[#B92429] leading-none uppercase mb-2">
                OOPS
              </h2>

              {/* c. Dimmed 44px coin SVG */}
              <div className="my-2 opacity-30">
                <svg width="44" height="44" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="11" fill="#7A4547" />
                  <circle cx="12" cy="12" r="7" fill="none" stroke="#3D0B0E" strokeWidth="1.6" />
                </svg>
              </div>

              {/* d. No coins this time */}
              <span className="text-[16px] font-bold text-[#7A4547] mt-1">
                No coins this time
              </span>

              {/* e. Streak alive */}
              <span className="text-[14px] font-extrabold text-[#B92429] mt-1 mb-5">
                But your streak is still alive!
              </span>

              {/* f. TRY AGAIN TOMORROW button */}
              <button
                type="button"
                onClick={() => {
                  setShowResultOverlay(false);
                  setIsSpinModalOpen(false);
                }}
                className="w-full h-[56px] bg-[#FFC93C] hover:bg-[#FFE14D] active:scale-[0.98] text-[#3D0B0E] font-anton text-[20px] uppercase rounded-[16px] shadow-lg transition-all cursor-pointer flex items-center justify-center"
              >
                TRY AGAIN TOMORROW
              </button>

              {/* g. Countdown subtext */}
              <span className="text-[12px] font-bold text-[#7A4547] mt-3">
                Next spin in {countdown.split(' ')[0]} {countdown.split(' ')[1]}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </main>
  );
}
