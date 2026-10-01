/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { CoinIcon } from '@/components/CoinIcon';
import { BottomNav } from '@/components/BottomNav';
import { CheckIcon, FireIcon } from '@/components/Icons';
import { createClient } from '@/lib/supabase/client';

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
  const [balance, setBalance] = useState<number | null>(null);
  const [target] = useState<number>(250);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Task Completion States
  const [isProfileDone, setIsProfileDone] = useState<boolean>(false);
  const [isAddressDone, setIsAddressDone] = useState<boolean>(false);
  const [isTeamDone, setIsTeamDone] = useState<boolean>(false);
  const [isSpinDoneToday, setIsSpinDoneToday] = useState<boolean>(false);
  const [isThreeSipsDoneToday, setIsThreeSipsDoneToday] = useState<boolean>(false);
  const [isKulkkiDoneToday, setIsKulkkiDoneToday] = useState<boolean>(false);
  const [isScratchDoneToday, setIsScratchDoneToday] = useState<boolean>(false);
  const [coinsEarnedToday, setCoinsEarnedToday] = useState<number>(0);

  const fetchBalance = useCallback(() => {
    fetch('/api/balance')
      .then((res) => res.json())
      .then((data) => {
        if (data.balance !== undefined) {
          setBalance(data.balance);
          setProgressPercent(data.progress_percent || 0);
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

      // Prefetch routes for instant navigation
      router.prefetch('/profile');
      router.prefetch('/play');
      router.prefetch('/play/three-sips');
      router.prefetch('/play/pick-kulkki');
      router.prefetch('/play/scratch');
      router.prefetch('/rewards');

      // Fetch profile & check tasks
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile) {
            if (profile.display_name) {
              setUserName(profile.display_name.split(' ')[0]);
            }
            setIsProfileDone(Boolean(profile.display_name && profile.phone_number && profile.pincode));
            setIsAddressDone(Boolean(profile.address_line1 && profile.city && profile.state && profile.pincode));
            setIsTeamDone(Boolean(profile.team));
          }
        });

      // Fetch balance from API
      fetchBalance();

      // Fetch today's activities & check tasks
      const todayStr = new Date().toISOString().split('T')[0];

      supabase
        .from('coin_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data: ledger }) => {
          if (ledger) {
            setHistoryEntries(ledger as HistoryEntry[]);

            // Calculate coins earned today
            const todayEntries = ledger.filter(
              (item) => item.created_at.startsWith(todayStr) && item.amount > 0
            );
            const todaySum = todayEntries.reduce((sum, item) => sum + item.amount, 0);
            setCoinsEarnedToday(todaySum);

            // Check if daily spin done today
            const spunToday = ledger.some(
              (item) => item.source === 'DAILY_SPIN' && item.created_at.startsWith(todayStr)
            );
            setIsSpinDoneToday(spunToday);
          }
        });

      // Check daily game plays today
      supabase
        .from('game_plays')
        .select('game_type, played_at')
        .eq('user_id', user.id)
        .gte('played_at', `${todayStr}T00:00:00.000Z`)
        .then(({ data: plays }) => {
          if (plays) {
            setIsThreeSipsDoneToday(plays.some((p) => p.game_type === 'three_sips'));
            setIsKulkkiDoneToday(plays.some((p) => p.game_type === 'pick_kulkki'));
            setIsScratchDoneToday(plays.some((p) => p.game_type === 'scratch'));
          }
        });
    });

    // Re-fetch balance on window focus (Fix 9)
    window.addEventListener('focus', fetchBalance);
    return () => {
      window.removeEventListener('focus', fetchBalance);
    };
  }, [router, fetchBalance]);

  const currentBalance = balance ?? 50;
  const remainingCoins = Math.max(0, target - currentBalance);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  };

  return (
    <main className="min-h-[100dvh] w-full max-w-[430px] mx-auto bg-[#FFF5F3] text-[#3D0B0E] flex flex-col justify-between pb-24 select-none relative overflow-x-hidden shadow-2xl">
      {/* Toast Notification Popup */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#3D0B0E] text-[#FFC93C] font-['Montserrat',sans-serif] font-bold text-xs px-5 py-3 rounded-full shadow-2xl border border-[#FFC93C]/40 animate-bounce text-center max-w-[340px]">
          {toastMsg}
        </div>
      )}

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
        <div className="px-5 -mt-6 flex flex-col gap-5 relative z-10">
          {/* RED "YOUR SIP COINS" CARD WITH WATERMARK */}
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

            {/* Progress Bar */}
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

          {/* THINGS TO DO SECTION */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[26px] font-anton text-[#B92429] uppercase tracking-wide">
              THINGS TO DO
            </h2>

            <div className="flex flex-col gap-2.5">
              {/* 1. Daily Games */}
              <Link
                href="/play"
                className={`w-full bg-white rounded-[18px] p-3.5 shadow-sm border-l-4 flex items-center justify-between transition-transform active:scale-[0.99] ${
                  isSpinDoneToday ? 'border-l-[#8FC31F]' : 'border-l-[#B92429]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                      isSpinDoneToday
                        ? 'bg-[#8FC31F] border-[#8FC31F] text-white'
                        : 'border-[#3D0B0E]/30 bg-transparent'
                    }`}
                  >
                    {isSpinDoneToday && <CheckIcon size={14} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-extrabold text-[#3D0B0E]">
                      Spin the wheel
                    </span>
                    <span className="text-[10px] font-bold text-[#7A4547]">
                      {isSpinDoneToday ? 'Done today' : 'Daily spin available'}
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
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                      isThreeSipsDoneToday
                        ? 'bg-[#8FC31F] border-[#8FC31F] text-white'
                        : 'border-[#3D0B0E]/30 bg-transparent'
                    }`}
                  >
                    {isThreeSipsDoneToday && <CheckIcon size={14} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-extrabold text-[#3D0B0E]">
                      Play Three Sips
                    </span>
                    <span className="text-[10px] font-bold text-[#7A4547]">
                      {isThreeSipsDoneToday ? 'Done today' : 'Slot machine game'}
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
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                      isKulkkiDoneToday
                        ? 'bg-[#8FC31F] border-[#8FC31F] text-white'
                        : 'border-[#3D0B0E]/30 bg-transparent'
                    }`}
                  >
                    {isKulkkiDoneToday && <CheckIcon size={14} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-extrabold text-[#3D0B0E]">
                      Pick the Kulkki
                    </span>
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
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                      isScratchDoneToday
                        ? 'bg-[#8FC31F] border-[#8FC31F] text-white'
                        : 'border-[#3D0B0E]/30 bg-transparent'
                    }`}
                  >
                    {isScratchDoneToday && <CheckIcon size={14} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-extrabold text-[#3D0B0E]">
                      Scratch Your Sip
                    </span>
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
                onClick={() => showToast('Coming soon! Bottle scanning will be available in a future update.')}
                className="w-full bg-gray-50/90 rounded-[18px] p-3.5 shadow-sm border-l-4 border-l-gray-400 flex items-center justify-between transition-transform active:scale-[0.99] cursor-pointer text-left opacity-80"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-400 bg-transparent" />
                  <div className="flex flex-col">
                    <span className="text-[13px] font-extrabold text-gray-700">
                      Scan a Zee Sip bottle
                    </span>
                    <span className="text-[10px] font-bold text-gray-500">
                      Scan QR code on bottle
                    </span>
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
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                      isProfileDone
                        ? 'bg-[#8FC31F] border-[#8FC31F] text-white'
                        : 'border-[#3D0B0E]/30 bg-transparent'
                    }`}
                  >
                    {isProfileDone && <CheckIcon size={14} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-extrabold text-[#3D0B0E]">
                      Complete your profile
                    </span>
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
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                      isAddressDone
                        ? 'bg-[#8FC31F] border-[#8FC31F] text-white'
                        : 'border-[#3D0B0E]/30 bg-transparent'
                    }`}
                  >
                    {isAddressDone && <CheckIcon size={14} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-extrabold text-[#3D0B0E]">
                      Add delivery address
                    </span>
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
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                      isTeamDone
                        ? 'bg-[#8FC31F] border-[#8FC31F] text-white'
                        : 'border-[#3D0B0E]/30 bg-transparent'
                    }`}
                  >
                    {isTeamDone && <CheckIcon size={14} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-extrabold text-[#3D0B0E]">
                      Pick your team
                    </span>
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

          {/* BOTTOM ACTIVITY MINI SUMMARY */}
          <div className="w-full bg-white/80 rounded-[16px] p-3.5 border border-[#F4D2CF] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CoinIcon size={20} />
              <span className="text-[12px] font-extrabold text-[#3D0B0E]">
                {coinsEarnedToday} coins earned today
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-[#7A4547]">
              <FireIcon size={16} />
              <span>1 day streak</span>
            </div>
          </div>
        </div>
      </div>

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

      {/* Bottom Navigation */}
      <BottomNav />
    </main>
  );
}
