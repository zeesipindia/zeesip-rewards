'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { CoinIcon } from '@/components/CoinIcon';
import { BottomNav } from '@/components/BottomNav';
import { createClient } from '@/lib/supabase/client';

interface HistoryEntry {
  id: string;
  amount: number;
  source: string;
  description: string | null;
  created_at: string;
}

export default function RewardsPage() {
  const [balance, setBalance] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      // Fetch balance & progress
      fetch('/api/balance')
        .then((res) => res.json())
        .then((data) => {
          if (data.balance !== undefined) {
            setBalance(data.balance);
            setProgressPercent(data.progress_percent || 0);
          }
        })
        .catch(() => {});

      // Fetch coin ledger transaction history
      supabase
        .from('coin_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data: ledger }) => {
          if (ledger) setHistoryEntries(ledger as HistoryEntry[]);
        });
    });
  }, []);

  const target = 500;
  const remainingCoins = Math.max(0, target - balance);

  return (
    <main className="min-h-[100dvh] w-full max-w-[430px] mx-auto bg-[#FFF5F3] text-[#3D0B0E] flex flex-col justify-between pb-24 select-none relative shadow-2xl">
      <div>
        {/* Header */}
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
              REWARDS
            </h1>
          </div>
        </div>

        {/* Content Container */}
        <div className="px-5 py-5 flex flex-col gap-6">
          {/* COIN BALANCE CARD (Target 500) */}
          <div className="w-full bg-[#B92429] text-white rounded-[24px] p-5 shadow-xl flex flex-col gap-3 relative overflow-hidden">
            <span className="text-[11px] font-extrabold text-white/80 tracking-widest uppercase">
              REWARD PROGRESS
            </span>

            <div className="flex items-center gap-3">
              <CoinIcon size={44} />
              <span className="text-[64px] font-anton text-[#FFC93C] leading-none tracking-tight">
                {balance}
              </span>
            </div>

            <div className="w-full">
              <div className="flex justify-between items-center text-[11px] font-extrabold text-white/90 mb-1">
                <span>FREE ZEE SIP BOTTLE</span>
                <span>{balance} / 500</span>
              </div>
              <div className="w-full h-3.5 bg-black/25 rounded-full overflow-hidden border border-white/20">
                <div
                  className="h-full bg-[#FFC93C] rounded-full transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[11.5px] font-extrabold text-white/90 mt-2">
                {remainingCoins > 0
                  ? `${remainingCoins} more coins to unlock a free Zee Sip`
                  : 'Reward unlocked! Contact us on WhatsApp to claim.'}
              </p>
            </div>
          </div>

          {/* HOW TO EARN MORE SECTION */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[22px] font-anton text-[#B92429] uppercase tracking-wide">
              HOW TO EARN MORE
            </h2>

            <div className="flex flex-col gap-2.5">
              {/* 1. Sip Match */}
              <Link
                href="/play/sip-match"
                className="w-full bg-white rounded-[18px] p-3.5 shadow-sm border border-[#F4D2CF] flex items-center justify-between transition-transform active:scale-[0.99]"
              >
                <div className="flex flex-col">
                  <span className="text-[13px] font-extrabold text-[#3D0B0E]">
                    Sip Match
                  </span>
                  <span className="text-[10.5px] font-bold text-[#7A4547]">
                    Memory game · 1 play/day
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#FFC93C]/30 text-[#3D0B0E] font-anton text-[12px] border border-[#FFC93C]/60">
                  up to +12 coins/day
                </span>
              </Link>

              {/* 2. Sip Slice */}
              <Link
                href="/play/sip-slice"
                className="w-full bg-white rounded-[18px] p-3.5 shadow-sm border border-[#F4D2CF] flex items-center justify-between transition-transform active:scale-[0.99]"
              >
                <div className="flex flex-col">
                  <span className="text-[13px] font-extrabold text-[#3D0B0E]">
                    Sip Slice
                  </span>
                  <span className="text-[10.5px] font-bold text-[#7A4547]">
                    Bottle slice game · 1 play/day
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#FFC93C]/30 text-[#3D0B0E] font-anton text-[12px] border border-[#FFC93C]/60">
                  up to +10 coins/day
                </span>
              </Link>

              {/* 3. First Visit Bonus */}
              <div className="w-full bg-white rounded-[18px] p-3.5 shadow-sm border border-[#F4D2CF] flex items-center justify-between opacity-85">
                <div className="flex flex-col">
                  <span className="text-[13px] font-extrabold text-[#3D0B0E]">
                    First visit bonus
                  </span>
                  <span className="text-[10.5px] font-bold text-[#7A4547]">
                    First landing page spin
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#FFC93C]/30 text-[#3D0B0E] font-anton text-[12px] border border-[#FFC93C]/60">
                  +30 coins (one-time)
                </span>
              </div>
            </div>
          </div>

          {/* COIN HISTORY TRANSACTION LIST */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[22px] font-anton text-[#B92429] uppercase tracking-wide">
              TRANSACTION HISTORY
            </h2>

            <div className="flex flex-col gap-2.5">
              {historyEntries.length === 0 ? (
                <div className="p-4 bg-white rounded-[18px] text-center text-xs font-bold text-[#7A4547] border border-[#F4D2CF]">
                  No transactions yet. Start playing to earn coins!
                </div>
              ) : (
                historyEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3.5 rounded-[16px] bg-white border border-[#F4D2CF]"
                  >
                    <div className="flex flex-col">
                      <span className="text-[13px] font-extrabold text-[#3D0B0E]">
                        {entry.description || entry.source.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] font-bold text-[#7A4547]">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span
                      className={`font-anton text-[20px] ${
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
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </main>
  );
}
