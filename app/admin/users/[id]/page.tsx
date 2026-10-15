'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface ProfileData {
  id: string;
  display_name: string;
  email: string;
  phone_number: string | null;
  pincode: string | null;
  team: string | null;
  whatsapp_consent: boolean | null;
  created_at: string;
  avatar_url: string | null;
  delivery_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  completed_tasks: Record<string, boolean> | null;
}

interface CoinLedgerEntry {
  id: string;
  amount: number;
  source: string;
  description: string | null;
  created_at: string;
}

interface GamePlayEntry {
  id: string;
  game_type: string;
  result: Record<string, unknown>;
  coins_won: number;
  played_at: string;
}

interface UserDetailResponse {
  profile: ProfileData;
  balance: number;
  coin_ledger: CoinLedgerEntry[];
  game_plays: GamePlayEntry[];
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = use(params);
  const router = useRouter();

  const [data, setData] = useState<UserDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/users/${userId}`)
      .then((res) => {
        if (res.status === 401) {
          router.push('/admin');
          return null;
        }
        if (!res.ok) throw new Error('User not found');
        return res.json();
      })
      .then((resData) => {
        if (resData) setData(resData);
        setIsLoading(false);
      })
      .catch((err) => {
        setErrorMsg(err.message || 'Failed to load user details');
        setIsLoading(false);
      });
  }, [userId, router]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin');
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center font-['Montserrat',sans-serif]">
        <div className="flex items-center gap-3 text-gray-600 font-bold">
          <div className="w-5 h-5 border-2 border-[#B92429] border-t-transparent rounded-full animate-spin" />
          <span>Loading user details...</span>
        </div>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] p-8 font-['Montserrat',sans-serif]">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-4">
          <Link
            href="/admin/dashboard?tab=users"
            className="text-xs font-extrabold text-[#B92429] hover:underline uppercase"
          >
            ← BACK TO USERS
          </Link>
          <div className="bg-white rounded-[12px] p-8 text-center text-red-600 font-bold border border-[#E0E0E0]">
            {errorMsg || 'User not found'}
          </div>
        </div>
      </div>
    );
  }

  const { profile, balance, coin_ledger, game_plays } = data;
  const target = 500;
  const progressPercent = Math.min(100, Math.round((balance / target) * 100));

  // Only show new games: sip_match and sip_slice
  const newGamePlays = (game_plays || []).filter(
    (g) => g.game_type === 'sip_match' || g.game_type === 'sip_slice'
  );

  return (
    <div className="min-h-screen w-full bg-[#F5F5F5] text-[#3D0B0E] font-['Montserrat',sans-serif]">
      {/* MOBILE BLOCK (< 768px) */}
      <div className="flex md:hidden min-h-screen w-full items-center justify-center p-6 text-center">
        <div className="bg-white rounded-[12px] p-8 shadow-sm border border-[#E0E0E0] max-w-sm flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[#FFF5F3] text-[#B92429] flex items-center justify-center mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <h2 className="font-anton text-[22px] text-[#B92429] uppercase mb-2">
            DESKTOP ONLY
          </h2>
          <p className="text-[14px] font-bold text-[#7A4547] leading-relaxed">
            Admin panel is designed for desktop. Please open on a laptop or computer.
          </p>
        </div>
      </div>

      {/* DESKTOP CONTENT (>= 768px) */}
      <div className="hidden md:flex flex-col min-h-screen w-full">
        {/* HEADER: Full width sticky top bar */}
        <header className="sticky top-0 z-40 w-full bg-white border-b border-[#E0E0E0] px-8 py-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/dashboard?tab=users"
              className="text-[12px] font-extrabold text-[#B92429] hover:underline uppercase tracking-wider"
            >
              ← BACK TO USERS
            </Link>
            <span className="text-gray-300">|</span>
            <span className="font-anton text-[22px] text-[#B92429] uppercase tracking-wide leading-none">
              USER DETAILS
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="text-[13px] font-extrabold text-[#B92429] hover:text-[#7A1418] hover:underline cursor-pointer uppercase tracking-wider"
          >
            LOGOUT
          </button>
        </header>

        {/* MAIN CONTAINER: Max-width 1200px centered */}
        <main className="w-full max-w-[1200px] mx-auto px-8 py-8 flex flex-col gap-6 flex-1">
          {/* USER BANNER CARD */}
          <div className="w-full bg-white rounded-[12px] p-6 shadow-sm border border-[#E0E0E0] flex items-center justify-between">
            <div className="flex items-center gap-4">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full border border-gray-200 object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#B92429] text-[#FFC93C] font-anton text-[26px] flex items-center justify-center border-2 border-[#3D0B0E]">
                  {profile.display_name?.slice(0, 1).toUpperCase() || 'Z'}
                </div>
              )}
              <div className="flex flex-col">
                <h1 className="font-anton text-[30px] text-[#B92429] leading-tight uppercase">
                  {profile.display_name}
                </h1>
                <span className="text-[13px] font-bold text-gray-500">
                  {profile.email} · Joined {formatDate(profile.created_at)}
                </span>
              </div>
            </div>

            {profile.team && (
              <div
                className={`px-4 py-2 rounded-[8px] font-anton text-[14px] uppercase border ${
                  profile.team === 'mango'
                    ? 'bg-[#CDEE1C]/40 border-[#CDEE1C] text-[#3D0B0E]'
                    : 'bg-[#FFE14D]/40 border-[#FFE14D] text-[#3D0B0E]'
                }`}
              >
                TEAM {profile.team}
              </div>
            )}
          </div>

          {/* TWO-COLUMN DESKTOP LAYOUT (40% LEFT, 60% RIGHT) */}
          <div className="w-full grid grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: 40% (col-span-5) */}
            <div className="col-span-5 flex flex-col gap-6">
              {/* Profile Info Card */}
              <div className="w-full bg-white rounded-[12px] p-6 shadow-sm border border-[#E0E0E0] flex flex-col gap-4">
                <h2 className="font-anton text-[18px] text-[#B92429] uppercase tracking-wide border-b border-[#E0E0E0] pb-2">
                  PROFILE INFORMATION
                </h2>
                <div className="flex flex-col gap-3 text-[13px]">
                  <div>
                    <span className="text-[11px] font-extrabold text-[#7A4547] uppercase block mb-0.5">
                      PHONE NUMBER
                    </span>
                    <span className="font-bold text-[#3D0B0E]">
                      {profile.phone_number ? `+91 ${profile.phone_number}` : 'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold text-[#7A4547] uppercase block mb-0.5">
                      PINCODE
                    </span>
                    <span className="font-bold text-[#3D0B0E]">
                      {profile.pincode || 'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold text-[#7A4547] uppercase block mb-0.5">
                      WHATSAPP CONSENT
                    </span>
                    <span className="font-bold text-[#3D0B0E]">
                      {profile.whatsapp_consent ? 'Yes (Opted in)' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery Address Card */}
              <div className="w-full bg-white rounded-[12px] p-6 shadow-sm border border-[#E0E0E0] flex flex-col gap-4">
                <h2 className="font-anton text-[18px] text-[#B92429] uppercase tracking-wide border-b border-[#E0E0E0] pb-2">
                  DELIVERY ADDRESS
                </h2>
                {profile.address_line1 ? (
                  <div className="text-[13px] font-bold text-[#3D0B0E] flex flex-col gap-1 leading-relaxed">
                    <p className="font-extrabold text-[#B92429]">
                      {profile.delivery_name || profile.display_name}
                    </p>
                    <p>{profile.address_line1}</p>
                    {profile.address_line2 && <p>{profile.address_line2}</p>}
                    <p>
                      {profile.city}, {profile.state} - {profile.pincode}
                    </p>
                  </div>
                ) : (
                  <p className="text-[13px] font-bold text-gray-400">
                    No delivery address added yet.
                  </p>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: 60% (col-span-7) */}
            <div className="col-span-7 flex flex-col gap-6">
              {/* Coin Balance Card */}
              <div className="w-full bg-white rounded-[12px] p-6 shadow-sm border border-[#E0E0E0] flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-[#E0E0E0] pb-2">
                  <span className="text-[12px] font-extrabold text-[#7A4547] uppercase">
                    NET COIN BALANCE
                  </span>
                  <span className="font-anton text-[36px] text-[#B92429] leading-none">
                    {balance} COINS
                  </span>
                </div>

                <div className="w-full bg-[#FFF5F3] p-4 rounded-[8px] border border-[#F4D2CF] flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[12px] font-extrabold text-[#7A4547]">
                    <span>PROGRESS TO FREE ZEE SIP</span>
                    <span>{balance} / {target}</span>
                  </div>
                  <div className="w-full h-3 bg-[#FCE4E1] rounded-full overflow-hidden border border-[#F4D2CF]">
                    <div
                      className="h-full bg-[#B92429] rounded-full transition-all duration-700"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-[#7A4547]">
                    {balance >= target
                      ? `Reward target reached (${target} coins)!`
                      : `${target - balance} more coins needed to unlock reward.`}
                  </span>
                </div>
              </div>

              {/* Coin History Table */}
              <div className="w-full bg-white rounded-[12px] p-6 shadow-sm border border-[#E0E0E0] flex flex-col gap-4">
                <h2 className="font-anton text-[18px] text-[#B92429] uppercase tracking-wide border-b border-[#E0E0E0] pb-2">
                  COIN HISTORY ({coin_ledger.length})
                </h2>

                {coin_ledger.length === 0 ? (
                  <p className="text-xs text-gray-500 font-bold py-4 text-center">
                    No coin transactions recorded for this user yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto border border-[#E0E0E0] rounded-[8px]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F5F5F5] border-b border-[#E0E0E0] text-[11px] font-extrabold text-[#7A4547] uppercase tracking-wider">
                          <th className="p-3">DATE & TIME</th>
                          <th className="p-3">SOURCE</th>
                          <th className="p-3">DESCRIPTION</th>
                          <th className="p-3 text-right">AMOUNT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E0E0E0] text-[13px] font-bold">
                        {coin_ledger.map((item, idx) => (
                          <tr
                            key={item.id}
                            className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'}
                          >
                            <td className="p-3 text-gray-600 font-normal">
                              {formatDate(item.created_at)}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-[11px] font-anton text-[#3D0B0E] uppercase">
                                {item.source}
                              </span>
                            </td>
                            <td className="p-3 text-gray-700">
                              {item.description || '-'}
                            </td>
                            <td className="p-3 text-right font-anton text-[16px]">
                              <span
                                className={
                                  item.amount >= 0 ? 'text-[#8FC31F]' : 'text-[#B92429]'
                                }
                              >
                                {item.amount >= 0 ? `+${item.amount}` : item.amount}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Game Activity Table */}
              <div className="w-full bg-white rounded-[12px] p-6 shadow-sm border border-[#E0E0E0] flex flex-col gap-4">
                <h2 className="font-anton text-[18px] text-[#B92429] uppercase tracking-wide border-b border-[#E0E0E0] pb-2">
                  GAME ACTIVITY ({newGamePlays.length})
                </h2>

                {newGamePlays.length === 0 ? (
                  <p className="text-xs text-gray-500 font-bold py-4 text-center">
                    No Sip Match or Sip Slice plays recorded for this user yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto border border-[#E0E0E0] rounded-[8px]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F5F5F5] border-b border-[#E0E0E0] text-[11px] font-extrabold text-[#7A4547] uppercase tracking-wider">
                          <th className="p-3">DATE & TIME</th>
                          <th className="p-3">GAME TYPE</th>
                          <th className="p-3">RESULT DETAILS</th>
                          <th className="p-3 text-right">COINS WON</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E0E0E0] text-[13px] font-bold">
                        {newGamePlays.map((game, idx) => (
                          <tr
                            key={game.id}
                            className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'}
                          >
                            <td className="p-3 text-gray-600 font-normal">
                              {formatDate(game.played_at)}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-[11px] font-anton text-[#B92429] uppercase">
                                {game.game_type === 'sip_match' ? 'SIP MATCH' : 'SIP SLICE'}
                              </span>
                            </td>
                            <td className="p-3 text-gray-700 font-mono text-[11px]">
                              {JSON.stringify(game.result)}
                            </td>
                            <td className="p-3 text-right font-anton text-[16px] text-[#FFC93C] drop-shadow-[0_1px_1px_rgba(61,11,14,0.3)]">
                              +{game.coins_won}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
