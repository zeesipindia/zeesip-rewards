'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { CoinIcon } from '@/components/CoinIcon';
import { BottomNav } from '@/components/BottomNav';
import { CheckIcon } from '@/components/Icons';
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

  // Task Completion Checkmarks
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
          if (data.balance !== undefined) {
            setBalance(data.balance);
            setProgressPercent(data.progress_percent || 0);
          }
        });

      // Fetch profile task status
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile) {
            setIsProfileDone(Boolean(profile.display_name && profile.phone_number && profile.pincode));
            setIsAddressDone(Boolean(profile.address_line1 && profile.city && profile.state));
            setIsTeamDone(Boolean(profile.team));
          }
        });

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

  const target = 250;
  const remainingCoins = Math.max(0, target - balance);

  return (
    <main className="min-h-[100dvh] w-full bg-[#FFF5F3] text-[#3D0B0E] flex flex-col justify-between pb-24 select-none relative">
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
          {/* COIN BALANCE CARD */}
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
              {/* Daily Spin */}
              <Link
                href="/play"
                className="w-full bg-white rounded-[18px] p-3.5 shadow-sm border border-[#F4D2CF] flex items-center justify-between"
              >
                <span className="text-[13px] font-extrabold text-[#3D0B0E]">
                  Daily Spin
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[#FFC93C]/30 text-[#3D0B0E] font-anton text-[12px]">
                  up to +50 / day
                </span>
              </Link>

              {/* Complete Profile */}
              <Link
                href="/profile"
                className="w-full bg-white rounded-[18px] p-3.5 shadow-sm border border-[#F4D2CF] flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  {isProfileDone && (
                    <div className="w-5 h-5 rounded-full bg-[#8FC31F] text-white flex items-center justify-center">
                      <CheckIcon size={12} />
                    </div>
                  )}
                  <span className="text-[13px] font-extrabold text-[#3D0B0E]">
                    Complete Profile
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#FFC93C]/30 text-[#3D0B0E] font-anton text-[12px]">
                  +10 coins (one-time)
                </span>
              </Link>

              {/* Add Address */}
              <Link
                href="/profile"
                className="w-full bg-white rounded-[18px] p-3.5 shadow-sm border border-[#F4D2CF] flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  {isAddressDone && (
                    <div className="w-5 h-5 rounded-full bg-[#8FC31F] text-white flex items-center justify-center">
                      <CheckIcon size={12} />
                    </div>
                  )}
                  <span className="text-[13px] font-extrabold text-[#3D0B0E]">
                    Add Delivery Address
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#FFC93C]/30 text-[#3D0B0E] font-anton text-[12px]">
                  +10 coins (one-time)
                </span>
              </Link>

              {/* Pick Team */}
              <Link
                href="/profile"
                className="w-full bg-white rounded-[18px] p-3.5 shadow-sm border border-[#F4D2CF] flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  {isTeamDone && (
                    <div className="w-5 h-5 rounded-full bg-[#8FC31F] text-white flex items-center justify-center">
                      <CheckIcon size={12} />
                    </div>
                  )}
                  <span className="text-[13px] font-extrabold text-[#3D0B0E]">
                    Pick Team
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#FFC93C]/30 text-[#3D0B0E] font-anton text-[12px]">
                  +5 coins (one-time)
                </span>
              </Link>

              {/* Scan a Bottle */}
              <button
                type="button"
                onClick={() => alert('Bottle Verification is unlocking in Phase 2!')}
                className="w-full bg-white rounded-[18px] p-3.5 shadow-sm border border-[#F4D2CF] flex items-center justify-between cursor-pointer text-left"
              >
                <span className="text-[13px] font-extrabold text-[#3D0B0E]">
                  Scan a Bottle
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[#FFC93C]/30 text-[#3D0B0E] font-anton text-[12px]">
                  +25 coins / bottle
                </span>
              </button>
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
                  No transactions yet. Start spinning to earn coins!
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
                        {new Date(entry.created_at).toLocaleString()}
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
