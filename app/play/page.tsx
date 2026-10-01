'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { CoinIcon } from '@/components/CoinIcon';
import { BottomNav } from '@/components/BottomNav';
import { SpinWheel } from '@/components/SpinWheel';
import { MiniWheelIcon, CameraIcon, ZapIcon, TicketIcon, SlotsIcon } from '@/components/Icons';
import { createClient } from '@/lib/supabase/client';

export default function PlayPage() {
  const [balance, setBalance] = useState<number>(0);
  const [isSpunToday, setIsSpunToday] = useState<boolean>(false);
  const [isThreeSipsDoneToday, setIsThreeSipsDoneToday] = useState<boolean>(false);
  const [threeSipsCoinsWon, setThreeSipsCoinsWon] = useState<number>(0);
  const [countdown, setCountdown] = useState<string>('');
  const [isSpinModalOpen, setIsSpinModalOpen] = useState<boolean>(false);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [spinResult, setSpinResult] = useState<{ value: number; label: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Incomplete tasks list
  const [incompleteTasks, setIncompleteTasks] = useState<Array<{ id: string; title: string; reward: string; link: string }>>([]);

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

      // Check if Three Sips played today
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

      // Check incomplete tasks from profile
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data: profile }) => {
          const tasks = [];
          if (!profile?.display_name || !profile?.phone_number || !profile?.pincode) {
            tasks.push({ id: 'profile', title: 'Complete your profile', reward: '+10 coins', link: '/profile' });
          }
          if (!profile?.address_line1 || !profile?.city) {
            tasks.push({ id: 'address', title: 'Add delivery address', reward: '+10 coins', link: '/profile' });
          }
          if (!profile?.team) {
            tasks.push({ id: 'team', title: 'Pick your team', reward: '+5 coins', link: '/profile' });
          }
          tasks.push({ id: 'scan', title: 'Scan a Zee Sip bottle', reward: '+25 coins', link: '/verify' });
          setIncompleteTasks(tasks);
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

  const handleComingSoon = (feature: string) => {
    alert(`${feature} is unlocking in Phase 2! Stay tuned.`);
  };

  return (
    <main className="min-h-[100dvh] w-full bg-[#FFF5F3] text-[#3D0B0E] flex flex-col justify-between pb-24 select-none relative">
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

          {/* GAMES SECTION: MORE WAYS TO EARN */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[22px] font-anton text-[#B92429] uppercase tracking-wide">
              MORE WAYS TO EARN
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {/* Three Sips (LIVE GAME) */}
              <Link
                href="/play/three-sips"
                className="bg-white rounded-[20px] p-4 shadow-sm border border-[#F4D2CF] flex flex-col justify-between h-[120px] text-left hover:border-[#B92429] transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-[14px] bg-[#FFE14D] flex items-center justify-center text-[#3D0B0E]">
                    <SlotsIcon size={22} />
                  </div>
                  {isThreeSipsDoneToday ? (
                    <span className="px-2 py-0.5 rounded-full bg-[#8FC31F] text-white font-anton text-[11px]">
                      Done ✓
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
                    {isThreeSipsDoneToday ? `Won +${threeSipsCoinsWon} coins` : 'Match 3 & win'}
                  </span>
                </div>
              </Link>

              {/* Scan a Bottle */}
              <button
                onClick={() => handleComingSoon('Scan a Bottle')}
                className="bg-white rounded-[20px] p-4 shadow-sm border border-[#F4D2CF] flex flex-col justify-between h-[120px] text-left hover:border-[#B92429] cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-[14px] bg-[#CDEE1C] flex items-center justify-center text-[#3D0B0E]">
                    <CameraIcon size={22} />
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#FFC93C]/30 text-[#3D0B0E] font-anton text-[11px]">
                    +25
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-anton text-[16px] text-[#3D0B0E] leading-none uppercase">
                    SCAN BOTTLE
                  </span>
                  <span className="text-[10px] font-bold text-[#7A4547] mt-1">
                    Scan QR on bottle
                  </span>
                </div>
              </button>

              {/* Quick Sip */}
              <button
                onClick={() => handleComingSoon('Quick Sip')}
                className="bg-white rounded-[20px] p-4 shadow-sm border border-[#F4D2CF] flex flex-col justify-between h-[120px] text-left hover:border-[#B92429] cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-[14px] bg-[#FFC93C]/40 flex items-center justify-center text-[#3D0B0E]">
                    <ZapIcon size={22} />
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#FFC93C]/30 text-[#3D0B0E] font-anton text-[11px]">
                    +1
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-anton text-[16px] text-[#3D0B0E] leading-none uppercase">
                    QUICK SIP
                  </span>
                  <span className="text-[10px] font-bold text-[#7A4547] mt-1">
                    Instant tap bonus
                  </span>
                </div>
              </button>

              {/* Scratch Your Sip */}
              <button
                onClick={() => handleComingSoon('Scratch Your Sip')}
                className="bg-white rounded-[20px] p-4 shadow-sm border border-[#F4D2CF] flex flex-col justify-between h-[120px] text-left hover:border-[#B92429] cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-[14px] bg-[#FCE4E1] flex items-center justify-center text-[#B92429]">
                    <TicketIcon size={22} />
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#FFC93C]/30 text-[#3D0B0E] font-anton text-[11px]">
                    up to +50
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-anton text-[16px] text-[#3D0B0E] leading-none uppercase">
                    SCRATCH CARD
                  </span>
                  <span className="text-[10px] font-bold text-[#7A4547] mt-1">
                    Scratch & reveal
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* THINGS TO DO NEXT SECTION */}
          {incompleteTasks.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-[22px] font-anton text-[#B92429] uppercase tracking-wide">
                THINGS TO DO NEXT
              </h2>

              <div className="flex flex-col gap-2.5">
                {incompleteTasks.map((t) => (
                  <Link
                    key={t.id}
                    href={t.link}
                    className="w-full bg-white rounded-[18px] p-3.5 shadow-sm border-l-4 border-l-[#B92429] flex items-center justify-between transition-transform active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full border-2 border-[#3D0B0E]/30 bg-transparent" />
                      <span className="text-[13px] font-extrabold text-[#3D0B0E]">
                        {t.title}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[#FFC93C]/30 text-[#3D0B0E] font-anton text-[12px]">
                      {t.reward}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
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
              ✕
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
