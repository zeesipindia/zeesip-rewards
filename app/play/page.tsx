'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { CoinIcon } from '@/components/CoinIcon';
import { BottomNav } from '@/components/BottomNav';
import { SpinWheel } from '@/components/SpinWheel';
import { MiniWheelIcon, CameraIcon, TicketIcon, SlotsIcon, CheckIcon } from '@/components/Icons';
import { createClient } from '@/lib/supabase/client';

export default function PlayPage() {
  const [balance, setBalance] = useState<number>(0);
  const [isSpunToday, setIsSpunToday] = useState<boolean>(false);
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Profile task completion states
  const [isProfileDone, setIsProfileDone] = useState<boolean>(false);
  const [isAddressDone, setIsAddressDone] = useState<boolean>(false);
  const [isTeamDone, setIsTeamDone] = useState<boolean>(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      // Fetch balance
      fetch('/api/balance')
        .then((res) => res.json())
        .then((data) => {
          if (data.balance !== undefined) setBalance(data.balance);
        });

      const todayStr = new Date().toISOString().split('T')[0];

      // Check if daily spin done today
      supabase
        .from('coin_ledger')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('source', 'DAILY_SPIN')
        .gte('created_at', `${todayStr}T00:00:00.000Z`)
        .then(({ data: spins }) => {
          if (spins && spins.length > 0) {
            setIsSpunToday(true);
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
    return () => clearInterval(interval);
  }, []);

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
    setTimeout(() => {
      setIsSpinning(false);
      setIsSpunToday(true);
      if (spinResult) {
        setBalance((prev) => prev + spinResult.value);
      }
    }, 400);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  };

  return (
    <main className="min-h-[100dvh] w-full bg-[#FFF5F3] text-[#3D0B0E] flex flex-col justify-between pb-24 select-none relative">
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
          {/* FEATURED DAILY SPIN CARD */}
          <div className="w-full bg-[#B92429] text-white rounded-[24px] p-5 shadow-xl flex flex-col gap-4 relative overflow-hidden">
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-[16px] bg-[#FFC93C] flex items-center justify-center text-[#3D0B0E]">
                  <MiniWheelIcon size={30} />
                </div>
                <div className="flex flex-col">
                  <h2 className="font-anton text-[22px] text-white leading-none uppercase">
                    DAILY SPIN
                  </h2>
                  <span className="text-[11px] font-bold text-white/80 mt-0.5">
                    Win up to 50 coins every day
                  </span>
                </div>
              </div>
            </div>

            {isSpunToday ? (
              <div className="bg-black/25 rounded-[18px] p-4 text-center border border-white/20 flex flex-col items-center gap-1">
                <span className="text-[12px] font-extrabold text-[#FFC93C] uppercase tracking-wider">
                  COME BACK TOMORROW
                </span>
                <span className="font-anton text-[24px] text-white tracking-widest">
                  {countdown}
                </span>
                <span className="text-[10px] font-bold text-white/80">
                  Resets daily at 12:00 AM IST
                </span>
              </div>
            ) : (
              <button
                onClick={() => setIsSpinModalOpen(true)}
                className="w-full h-[54px] bg-[#FFC93C] hover:bg-[#FFE14D] active:scale-[0.98] text-[#3D0B0E] font-anton text-[20px] uppercase rounded-[16px] shadow-md transition-all flex items-center justify-center cursor-pointer"
              >
                SPIN NOW
              </button>
            )}
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

              {/* Scratch Your Sip (Fix 4 subtitle) */}
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

              {/* Scan a Bottle Card (Fix 5: COMING SOON + Toast) */}
              <button
                type="button"
                onClick={() => showToast('Coming soon! Bottle scanning will be available in a future update.')}
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

          {/* THINGS TO DO SECTION (Fix 6 Ordering) */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[22px] font-anton text-[#B92429] uppercase tracking-wide">
              THINGS TO DO
            </h2>

            <div className="flex flex-col gap-2.5">
              {/* 1. Daily Games */}
              <Link
                href="/play"
                className={`w-full bg-white rounded-[18px] p-3.5 shadow-sm border-l-4 flex items-center justify-between transition-transform active:scale-[0.99] ${
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
              </Link>

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

              {/* 2. Scan a Zee Sip bottle (Fix 6 & Fix 5) */}
              <button
                type="button"
                onClick={() => showToast('Coming soon! Bottle scanning will be available in a future update.')}
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

              {/* 3. Completed One-Time Tasks (Fix 6: at bottom, dimmed) */}
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

      {/* SPIN WHEEL MODAL */}
      {isSpinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#B92429] rounded-[28px] p-6 shadow-2xl flex flex-col items-center gap-5 relative text-white border-2 border-[#FFC93C]">
            <button
              onClick={() => setIsSpinModalOpen(false)}
              disabled={isSpinning}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 text-white font-bold flex items-center justify-center hover:bg-white/30 disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="font-anton text-[28px] text-[#FFC93C] uppercase tracking-wide">
              DAILY SPIN
            </h3>

            <SpinWheel
              targetIndex={targetIndex}
              isSpinning={isSpinning}
              onSpinComplete={handleSpinComplete}
            />

            {spinResult && !isSpinning && (
              <div className="flex flex-col items-center gap-1 animate-fadeIn">
                <span className="font-anton text-[36px] text-[#FFC93C]">
                  {spinResult.value > 0 ? `YOU WON ${spinResult.label} COINS!` : 'OOPS! BETTER LUCK NEXT TIME'}
                </span>
                <button
                  onClick={() => setIsSpinModalOpen(false)}
                  className="mt-2 px-6 py-2.5 rounded-full bg-[#FFC93C] text-[#3D0B0E] font-anton text-[16px] uppercase"
                >
                  CONTINUE
                </button>
              </div>
            )}

            {!spinResult && (
              <button
                onClick={handleStartSpin}
                disabled={isSpinning}
                className="w-full h-[56px] bg-[#FFC93C] hover:bg-[#FFE14D] active:scale-[0.98] text-[#3D0B0E] font-anton text-[22px] uppercase rounded-[18px] shadow-lg transition-all disabled:opacity-75"
              >
                {isSpinning ? 'SPINNING...' : 'SPIN'}
              </button>
            )}

            {errorMsg && (
              <p className="text-xs font-bold text-amber-200 text-center">{errorMsg}</p>
            )}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </main>
  );
}
