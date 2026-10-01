'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { CoinIcon } from '@/components/CoinIcon';
import { BottomNav } from '@/components/BottomNav';
import { FireIcon, MiniWheelIcon } from '@/components/Icons';
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
  const [userTeam, setUserTeam] = useState<string>('mango');
  const [balance, setBalance] = useState<number>(0);
  const [target, setTarget] = useState<number>(250);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/');
        return;
      }

      setUserName(user.user_metadata?.full_name?.split(' ')[0] || 'Sipper');

      // Fetch profile
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
            if (profile.team) {
              setUserTeam(profile.team);
            }
            // If profile is incomplete, redirect to /profile
            if (!profile.phone_number || !profile.team) {
              router.push('/profile');
              return;
            }
          }
        });

      // Fetch balance from API
      fetch('/api/balance')
        .then((res) => res.json())
        .then((data) => {
          if (data.balance !== undefined) {
            setBalance(data.balance);
            setTarget(data.target || 250);
            setProgressPercent(data.progress_percent || 0);
          }
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));

      // Fetch history entries
      supabase
        .from('coin_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data: ledger }) => {
          if (ledger) setHistoryEntries(ledger as HistoryEntry[]);
        });
    });
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] w-full bg-[#FFF5F3] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#B92429] border-t-transparent" />
      </div>
    );
  }

  const remainingCoins = Math.max(0, target - balance);

  return (
    <main className="min-h-[100dvh] w-full bg-[#FFF5F3] text-[#3D0B0E] flex flex-col justify-between pb-24 select-none relative">
      <div>
        {/* Top Yellow Band (~170px) */}
        <div className="w-full bg-[#FFC93C] text-[#3D0B0E] pb-5 border-b-4 border-[#3D0B0E]">
          <Header variant="yellow" />

          {/* Greeting & Streak Badge */}
          <div className="px-5 pt-1 flex items-center justify-between">
            <h1 className="text-[32px] font-anton text-[#B92429] leading-tight uppercase tracking-tight">
              HEY {userName}!
            </h1>

            {/* Streak Badge */}
            <div className="bg-white rounded-full px-3 py-1 flex items-center gap-1.5 shadow-sm border border-[#3D0B0E]/10">
              <FireIcon size={18} />
              <span className="text-[12px] font-extrabold text-[#3D0B0E]">
                0 days
              </span>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="px-5 -mt-6 flex flex-col gap-4 relative z-10">
          {/* COIN CARD (Brand-red bg, white text) */}
          <div className="w-full bg-[#B92429] text-white rounded-[24px] p-5 shadow-xl relative overflow-hidden">
            {/* Faint Coin Watermark in Corner */}
            <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
              <CoinIcon size={160} />
            </div>

            {/* Card Header: Label + HISTORY Link */}
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

            {/* Balance Hero */}
            <div className="flex items-center gap-3 my-3 z-10 relative">
              <CoinIcon size={56} />
              <span className="text-[72px] font-anton text-[#FFC93C] leading-none tracking-tight">
                {balance}
              </span>
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
                  : '🎉 Reward unlocked! Ready to claim.'}
              </p>
            </div>
          </div>

          {/* TODAY'S SPIN IS READY CARD (Phase 2 Preview) */}
          <div className="w-full bg-white rounded-[22px] p-4 shadow-md border border-[#F4D2CF] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[16px] bg-[#FFC93C]/30 flex items-center justify-center text-[#3D0B0E]">
                <MiniWheelIcon size={28} />
              </div>
              <div className="flex flex-col">
                <span className="font-anton text-[18px] text-[#3D0B0E] leading-none uppercase">
                  DAILY SPIN
                </span>
                <span className="text-[11px] font-bold text-[#7A4547] mt-0.5">
                  Win up to 50 coins
                </span>
              </div>
            </div>
            <button
              onClick={() => alert('Daily Spins unlock in Phase 2!')}
              className="px-4 py-2 rounded-[14px] bg-[#FFC93C] text-[#3D0B0E] font-anton text-[14px] uppercase shadow-sm cursor-pointer hover:bg-[#FFE14D]"
            >
              SPIN
            </button>
          </div>

          {/* 2-COLUMN GRID: VERIFIED SIPS + SIP STREAK */}
          <div className="grid grid-cols-2 gap-3">
            {/* Verified Sips Card */}
            <div className="bg-[#CDEE1C] rounded-[22px] p-4 shadow-sm border border-[#3D0B0E]/10 flex flex-col justify-between h-[110px]">
              <span className="text-[11px] font-extrabold text-[#3D0B0E]/80 tracking-wider uppercase">
                VERIFIED SIPS
              </span>
              <div className="flex items-baseline justify-between">
                <span className="font-anton text-[36px] text-[#3D0B0E] leading-none">
                  0
                </span>
                <span className="text-[11px] font-extrabold text-[#3D0B0E]/70">
                  Bottles
                </span>
              </div>
            </div>

            {/* Sip Streak Card */}
            <div className="bg-white rounded-[22px] p-4 shadow-sm border border-[#F4D2CF] flex flex-col justify-between h-[110px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#7A4547] tracking-wider uppercase">
                  SIP STREAK
                </span>
                <FireIcon size={16} />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-anton text-[36px] text-[#3D0B0E] leading-none">
                  0
                </span>
                <span className="text-[11px] font-bold text-[#7A4547]">
                  Days
                </span>
              </div>
            </div>
          </div>

          {/* WHICH SIP RULES? FLAVOUR BATTLE BAR (58% Mango / 42% Pineapple) */}
          <div className="w-full bg-white rounded-[22px] p-4 shadow-md border border-[#F4D2CF] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-extrabold text-[#3D0B0E] uppercase tracking-wider flex items-center gap-1.5">
                <span>WHICH SIP RULES?</span>
                <span className="text-[10px] text-[#7A4547] lowercase font-bold">(Battle)</span>
              </span>
              <span className="text-[11px] font-extrabold text-[#7A4547]">
                Your Team: <strong className="uppercase text-[#B92429]">{userTeam}</strong>
              </span>
            </div>

            {/* Dual Flavour Progress Bar */}
            <div className="w-full h-5 rounded-full overflow-hidden flex border border-[#3D0B0E]/15 shadow-inner">
              <div
                className="bg-[#CDEE1C] h-full flex items-center justify-start pl-2 text-[10px] font-extrabold text-[#3D0B0E]"
                style={{ width: '58%' }}
              >
                Mango 58%
              </div>
              <div
                className="bg-[#FFE14D] h-full flex items-center justify-end pr-2 text-[10px] font-extrabold text-[#3D0B0E]"
                style={{ width: '42%' }}
              >
                Pineapple 42%
              </div>
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
                ✕
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
