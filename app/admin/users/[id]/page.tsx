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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-['Montserrat',sans-serif]">
        <div className="flex items-center gap-3 text-gray-600 font-bold">
          <div className="w-5 h-5 border-2 border-[#B92429] border-t-transparent rounded-full animate-spin" />
          <span>Loading user details...</span>
        </div>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 font-['Montserrat',sans-serif]">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-4">
          <Link
            href="/admin/dashboard?tab=users"
            className="text-xs font-extrabold text-[#B92429] hover:underline uppercase"
          >
            ← BACK TO USERS
          </Link>
          <div className="bg-white rounded-[20px] p-8 text-center text-red-600 font-bold border border-gray-200">
            {errorMsg || 'User not found'}
          </div>
        </div>
      </div>
    );
  }

  const { profile, balance, coin_ledger, game_plays } = data;
  const progressPercent = Math.min(100, Math.round((balance / 250) * 100));

  return (
    <main className="min-h-screen bg-gray-50 text-[#3D0B0E] font-['Montserrat',sans-serif] p-4 sm:p-8">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-6">
        {/* BACK LINK */}
        <div>
          <Link
            href="/admin/dashboard?tab=users"
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#B92429] hover:underline uppercase tracking-wider"
          >
            ← BACK TO USERS
          </Link>
        </div>

        {/* TOP USER HEADER */}
        <div className="bg-white rounded-[20px] p-6 shadow-sm border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.display_name}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full border-2 border-[#B92429] object-cover shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#B92429] text-white font-anton text-[28px] flex items-center justify-center border-2 border-[#3D0B0E]">
                {profile.display_name?.slice(0, 1).toUpperCase() || 'Z'}
              </div>
            )}
            <div className="flex flex-col">
              <h1 className="font-anton text-[28px] text-[#B92429] uppercase leading-tight">
                {profile.display_name}
              </h1>
              <span className="text-[13px] font-bold text-gray-600">{profile.email}</span>
            </div>
          </div>

          <div className="bg-[#FFF5F3] border border-[#F4D2CF] rounded-[16px] px-5 py-3 flex flex-col items-end">
            <span className="text-[10px] font-extrabold text-[#7A4547] uppercase tracking-wider">
              CURRENT BALANCE
            </span>
            <span className="font-anton text-[32px] text-[#FFC93C] drop-shadow-[0_1px_1px_rgba(61,11,14,0.4)] leading-none mt-0.5">
              {balance} COINS
            </span>
          </div>
        </div>

        {/* GRID: PROFILE & DELIVERY ADDRESS & COIN BALANCE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* SECTION 1: PROFILE DETAILS */}
          <div className="bg-white rounded-[20px] p-6 shadow-sm border border-gray-200 flex flex-col gap-4">
            <h2 className="font-anton text-[18px] text-[#B92429] uppercase tracking-wide border-b border-gray-100 pb-2">
              PROFILE DETAILS
            </h2>

            <div className="flex flex-col gap-2.5 text-[13px] font-bold">
              <div>
                <span className="text-gray-400 text-[11px] uppercase block">Display Name</span>
                <span className="text-[#3D0B0E]">{profile.display_name}</span>
              </div>
              <div>
                <span className="text-gray-400 text-[11px] uppercase block">Email</span>
                <span className="text-[#3D0B0E]">{profile.email}</span>
              </div>
              <div>
                <span className="text-gray-400 text-[11px] uppercase block">Phone Number</span>
                {profile.phone_number ? (
                  <span className="text-[#3D0B0E]">{profile.phone_number}</span>
                ) : (
                  <span className="text-gray-400 font-normal">Not set</span>
                )}
              </div>
              <div>
                <span className="text-gray-400 text-[11px] uppercase block">Pincode</span>
                {profile.pincode ? (
                  <span className="text-[#3D0B0E]">{profile.pincode}</span>
                ) : (
                  <span className="text-gray-400 font-normal">Not set</span>
                )}
              </div>
              <div>
                <span className="text-gray-400 text-[11px] uppercase block">Team</span>
                {profile.team === 'mango' ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#CDEE1C] text-[#3D0B0E] font-anton text-[11px] uppercase">
                    Team Mango
                  </span>
                ) : profile.team === 'pineapple' ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FFE14D] text-[#3D0B0E] font-anton text-[11px] uppercase">
                    Team Pineapple
                  </span>
                ) : (
                  <span className="text-gray-400 font-normal">Not set</span>
                )}
              </div>
              <div>
                <span className="text-gray-400 text-[11px] uppercase block">WhatsApp Consent</span>
                <span className={profile.whatsapp_consent ? 'text-green-600' : 'text-gray-500'}>
                  {profile.whatsapp_consent ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 text-[11px] uppercase block">Account Created</span>
                <span className="text-gray-700 text-[12px]">{formatDate(profile.created_at)}</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: DELIVERY ADDRESS */}
          <div className="bg-white rounded-[20px] p-6 shadow-sm border border-gray-200 flex flex-col gap-4">
            <h2 className="font-anton text-[18px] text-[#B92429] uppercase tracking-wide border-b border-gray-100 pb-2">
              DELIVERY ADDRESS
            </h2>

            <div className="flex flex-col gap-2.5 text-[13px] font-bold">
              <div>
                <span className="text-gray-400 text-[11px] uppercase block">Delivery Name</span>
                {profile.delivery_name ? (
                  <span className="text-[#3D0B0E]">{profile.delivery_name}</span>
                ) : (
                  <span className="text-gray-400 font-normal">Not provided</span>
                )}
              </div>
              <div>
                <span className="text-gray-400 text-[11px] uppercase block">Address Line 1</span>
                {profile.address_line1 ? (
                  <span className="text-[#3D0B0E]">{profile.address_line1}</span>
                ) : (
                  <span className="text-gray-400 font-normal">Not provided</span>
                )}
              </div>
              <div>
                <span className="text-gray-400 text-[11px] uppercase block">Address Line 2</span>
                {profile.address_line2 ? (
                  <span className="text-[#3D0B0E]">{profile.address_line2}</span>
                ) : (
                  <span className="text-gray-400 font-normal">Not provided</span>
                )}
              </div>
              <div>
                <span className="text-gray-400 text-[11px] uppercase block">City</span>
                {profile.city ? (
                  <span className="text-[#3D0B0E]">{profile.city}</span>
                ) : (
                  <span className="text-gray-400 font-normal">Not provided</span>
                )}
              </div>
              <div>
                <span className="text-gray-400 text-[11px] uppercase block">State</span>
                {profile.state ? (
                  <span className="text-[#3D0B0E]">{profile.state}</span>
                ) : (
                  <span className="text-gray-400 font-normal">Not provided</span>
                )}
              </div>
              <div>
                <span className="text-gray-400 text-[11px] uppercase block">Pincode</span>
                {profile.pincode ? (
                  <span className="text-[#3D0B0E]">{profile.pincode}</span>
                ) : (
                  <span className="text-gray-400 font-normal">Not provided</span>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: COIN BALANCE & REWARD PROGRESS */}
          <div className="bg-white rounded-[20px] p-6 shadow-sm border border-gray-200 flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h2 className="font-anton text-[18px] text-[#B92429] uppercase tracking-wide border-b border-gray-100 pb-2">
                COIN BALANCE
              </h2>
              <div className="mt-2">
                <span className="font-anton text-[56px] text-[#FFC93C] drop-shadow-[0_2px_4px_rgba(61,11,14,0.3)] leading-none block">
                  {balance}
                </span>
                <span className="text-[12px] font-extrabold text-[#7A4547] uppercase tracking-wider block mt-1">
                  TOTAL SIP COINS
                </span>
              </div>
            </div>

            <div className="w-full bg-[#FFF5F3] p-4 rounded-[16px] border border-[#F4D2CF] flex flex-col gap-2">
              <div className="flex justify-between items-center text-[12px] font-extrabold text-[#7A4547]">
                <span>PROGRESS TO FREE ZEE SIP</span>
                <span>{balance} / 250</span>
              </div>
              <div className="w-full h-3.5 bg-[#FCE4E1] rounded-full overflow-hidden border border-[#F4D2CF]">
                <div
                  className="h-full bg-[#B92429] rounded-full transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-[#7A4547]">
                {balance >= 250
                  ? 'Reward target reached (250 coins)!'
                  : `${250 - balance} more coins needed to unlock reward.`}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 4: COIN HISTORY */}
        <div className="bg-white rounded-[20px] p-6 shadow-sm border border-gray-200 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h2 className="font-anton text-[18px] text-[#B92429] uppercase tracking-wide">
              COIN HISTORY ({coin_ledger.length})
            </h2>
          </div>

          {coin_ledger.length === 0 ? (
            <p className="text-xs text-gray-500 font-bold py-4 text-center">
              No coin transactions recorded for this user yet.
            </p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-[16px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200 text-[11px] font-extrabold text-[#7A4547] uppercase">
                    <th className="p-3">DATE & TIME</th>
                    <th className="p-3">SOURCE</th>
                    <th className="p-3">DESCRIPTION</th>
                    <th className="p-3 text-right">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-[13px] font-bold">
                  {coin_ledger.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9] hover:bg-gray-100/60'}
                    >
                      <td className="p-3 text-gray-600 font-normal">{formatDate(item.created_at)}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-[11px] font-anton text-[#3D0B0E] uppercase">
                          {item.source}
                        </span>
                      </td>
                      <td className="p-3 text-gray-700">{item.description || '-'}</td>
                      <td className="p-3 text-right font-anton text-[16px]">
                        <span className={item.amount >= 0 ? 'text-[#8FC31F]' : 'text-[#B92429]'}>
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

        {/* SECTION 5: GAME ACTIVITY */}
        <div className="bg-white rounded-[20px] p-6 shadow-sm border border-gray-200 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h2 className="font-anton text-[18px] text-[#B92429] uppercase tracking-wide">
              GAME ACTIVITY ({game_plays.length})
            </h2>
          </div>

          {game_plays.length === 0 ? (
            <p className="text-xs text-gray-500 font-bold py-4 text-center">
              No game plays recorded for this user yet.
            </p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-[16px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200 text-[11px] font-extrabold text-[#7A4547] uppercase">
                    <th className="p-3">DATE & TIME</th>
                    <th className="p-3">GAME TYPE</th>
                    <th className="p-3">RESULT DETAILS</th>
                    <th className="p-3 text-right">COINS WON</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-[13px] font-bold">
                  {game_plays.map((game, idx) => (
                    <tr
                      key={game.id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9] hover:bg-gray-100/60'}
                    >
                      <td className="p-3 text-gray-600 font-normal">{formatDate(game.played_at)}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-[11px] font-anton text-[#B92429] uppercase">
                          {game.game_type.replace(/_/g, ' ')}
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
    </main>
  );
}
