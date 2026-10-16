'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface StatsData {
  total_users: number;
  total_coins: number;
  total_games_today: number;
}

interface UserRow {
  id: string;
  display_name: string;
  email: string;
  phone_number: string | null;
  team: string | null;
  created_at: string;
  total_coins: number;
}

interface LeaderboardRow {
  rank: number;
  id: string;
  display_name: string;
  phone_number: string | null;
  total_coins: number;
  created_at: string;
}

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') === 'points' ? 'points' : 'users';

  const [stats, setStats] = useState<StatsData | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    // 1. Fetch Stats
    fetch('/api/admin/stats')
      .then((res) => {
        if (res.status === 401) {
          router.push('/admin');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setStats(data);
        setIsLoadingStats(false);
      })
      .catch(() => setIsLoadingStats(false));

    // 2. Fetch Users
    fetch('/api/admin/users')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setUsers(data);
        setIsLoadingData(false);
      })
      .catch(() => setIsLoadingData(false));

    // 3. Fetch Leaderboard
    fetch('/api/admin/leaderboard')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setLeaderboard(data);
      })
      .catch(() => {});
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin');
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = u.display_name?.toLowerCase().includes(q);
    const phoneMatch = u.phone_number?.toLowerCase().includes(q);
    const emailMatch = u.email?.toLowerCase().includes(q);
    return nameMatch || phoneMatch || emailMatch;
  });

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full">
      {/* HEADER: Full width sticky top bar */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-[#E0E0E0] shadow-xs">
        <div className="w-full max-w-[1200px] mx-auto px-8 py-4 flex items-center justify-between">
          <span className="font-anton text-[26px] text-[#B92429] uppercase tracking-wide leading-none">
            ZEESIP ADMIN
          </span>

          <button
            onClick={handleLogout}
            className="text-[13px] font-extrabold text-[#B92429] hover:text-[#7A1418] hover:underline cursor-pointer uppercase tracking-wider"
          >
            LOGOUT
          </button>
        </div>
      </header>

      {/* MAIN DESKTOP CONTAINER: Max-width 1200px centered */}
      <main className="w-full max-w-[1200px] mx-auto px-8 py-8 flex flex-col gap-8 flex-1">
        {/* STATS BAR: 3 cards horizontal */}
        <div className="grid grid-cols-3 gap-6">
          {/* Card 1: Total Users */}
          <div className="bg-white rounded-[12px] p-6 shadow-sm border border-[#E0E0E0] flex flex-col justify-between">
            <span className="text-[12px] font-extrabold text-[#7A4547] tracking-wider uppercase font-['Montserrat',sans-serif]">
              TOTAL USERS
            </span>
            <div className="mt-3">
              {isLoadingStats ? (
                <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
              ) : (
                <span className="font-anton text-[46px] text-[#3D0B0E] leading-none">
                  {stats?.total_users ?? 0}
                </span>
              )}
            </div>
          </div>

          {/* Card 2: Total Coins in Circulation (NET) */}
          <div className="bg-white rounded-[12px] p-6 shadow-sm border border-[#E0E0E0] flex flex-col justify-between">
            <span className="text-[12px] font-extrabold text-[#7A4547] tracking-wider uppercase font-['Montserrat',sans-serif]">
              TOTAL COINS IN CIRCULATION (NET)
            </span>
            <div className="mt-3 flex items-center gap-2">
              {isLoadingStats ? (
                <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
              ) : (
                <span className="font-anton text-[46px] text-[#FFC93C] drop-shadow-[0_1px_2px_rgba(61,11,14,0.3)] leading-none">
                  {stats?.total_coins ?? 0}
                </span>
              )}
            </div>
          </div>

          {/* Card 3: Games Played Today */}
          <div className="bg-white rounded-[12px] p-6 shadow-sm border border-[#E0E0E0] flex flex-col justify-between">
            <span className="text-[12px] font-extrabold text-[#7A4547] tracking-wider uppercase font-['Montserrat',sans-serif]">
              GAMES PLAYED TODAY
            </span>
            <div className="mt-3 flex items-center gap-2">
              {isLoadingStats ? (
                <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
              ) : (
                <span className="font-anton text-[46px] text-[#8FC31F] leading-none">
                  {stats?.total_games_today ?? 0}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* TAB CONTROLS & MAIN CONTENT CARD */}
        <div className="w-full bg-white rounded-[12px] shadow-sm border border-[#E0E0E0] overflow-hidden">
          {/* Tabs Header */}
          <div className="flex border-b border-[#E0E0E0] bg-[#FAFAFA]">
            <Link
              href="/admin/dashboard?tab=users"
              className={`px-8 py-4 font-anton text-[18px] uppercase tracking-wide transition-colors ${
                activeTab === 'users'
                  ? 'bg-white text-[#B92429] border-b-2 border-[#B92429]'
                  : 'text-gray-500 hover:text-[#3D0B0E]'
              }`}
            >
              USERS ({users.length})
            </Link>
            <Link
              href="/admin/dashboard?tab=points"
              className={`px-8 py-4 font-anton text-[18px] uppercase tracking-wide transition-colors ${
                activeTab === 'points'
                  ? 'bg-white text-[#B92429] border-b-2 border-[#B92429]'
                  : 'text-gray-500 hover:text-[#3D0B0E]'
              }`}
            >
              POINTS LEADERBOARD
            </Link>
          </div>

          {/* TAB 1: USERS */}
          {activeTab === 'users' && (
            <div className="p-6 flex flex-col gap-6">
              {/* Search Bar */}
              <div className="w-full max-w-md">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, phone, or email..."
                  className="w-full h-[44px] px-4 rounded-[8px] border border-[#E0E0E0] focus:border-[#B92429] outline-none font-bold text-[14px] text-[#3D0B0E] bg-[#FFF5F3]"
                />
              </div>

              {/* Users Table */}
              {isLoadingData ? (
                <div className="py-16 text-center text-gray-500 font-bold">Loading users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-16 text-center text-gray-500 font-bold">No users found.</div>
              ) : (
                <div className="w-full overflow-x-auto border border-[#E0E0E0] rounded-[8px]">
                  <table className="w-full min-w-[850px] text-left border-collapse">
                    <thead>
                      <tr className="bg-[#F5F5F5] border-b border-[#E0E0E0] text-[11px] font-extrabold text-[#7A4547] uppercase tracking-wider">
                        <th className="p-3.5 text-center w-12">#</th>
                        <th className="p-3.5">NAME</th>
                        <th className="p-3.5">EMAIL</th>
                        <th className="p-3.5">PHONE</th>
                        <th className="p-3.5">TEAM</th>
                        <th className="p-3.5 text-right">COINS</th>
                        <th className="p-3.5">JOINED</th>
                        <th className="p-3.5 text-center w-24">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E0E0E0] text-[13px] font-bold">
                      {filteredUsers.map((user, idx) => (
                        <tr
                          key={user.id}
                          className={`${
                            idx % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'
                          } hover:bg-amber-50/50 transition-colors`}
                        >
                          <td className="p-3.5 text-center text-gray-400 font-normal">
                            {idx + 1}
                          </td>
                          <td className="p-3.5 text-[#3D0B0E]">
                            {user.display_name}
                          </td>
                          <td className="p-3.5 text-gray-600 font-normal">
                            {user.email}
                          </td>
                          <td className="p-3.5 text-[#3D0B0E]">
                            {user.phone_number ? `+91 ${user.phone_number}` : '-'}
                          </td>
                          <td className="p-3.5">
                            {user.team ? (
                              <span
                                className={`px-2.5 py-0.5 rounded text-[11px] font-anton uppercase ${
                                  user.team === 'mango'
                                    ? 'bg-[#CDEE1C]/40 text-[#3D0B0E] border border-[#CDEE1C]'
                                    : 'bg-[#FFE14D]/40 text-[#3D0B0E] border border-[#FFE14D]'
                                }`}
                              >
                                {user.team}
                              </span>
                            ) : (
                              <span className="text-gray-400 font-normal">-</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right font-anton text-[16px] text-[#B92429]">
                            {user.total_coins}
                          </td>
                          <td className="p-3.5 text-gray-600 font-normal">
                            {formatDate(user.created_at)}
                          </td>
                          <td className="p-3.5 text-center">
                            <Link
                              href={`/admin/users/${user.id}`}
                              className="inline-block px-3 py-1 bg-[#B92429] hover:bg-[#9E1B20] text-white font-anton text-[12px] uppercase rounded-[6px] shadow-xs transition-colors"
                            >
                              VIEW
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: POINTS LEADERBOARD */}
          {activeTab === 'points' && (
            <div className="p-6 flex flex-col gap-6">
              <div className="w-full overflow-x-auto border border-[#E0E0E0] rounded-[8px]">
                <table className="w-full min-w-[700px] text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F5F5F5] border-b border-[#E0E0E0] text-[11px] font-extrabold text-[#7A4547] uppercase tracking-wider">
                      <th className="p-3.5 text-center w-20">RANK</th>
                      <th className="p-3.5">NAME</th>
                      <th className="p-3.5">PHONE</th>
                      <th className="p-3.5 text-right">TOTAL COINS (NET)</th>
                      <th className="p-3.5 text-center w-28">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0E0E0] text-[13px] font-bold">
                    {leaderboard.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-500 font-bold">
                          No leaderboard entries found.
                        </td>
                      </tr>
                    ) : (
                      leaderboard.map((row, idx) => {
                        const isRank1 = row.rank === 1;
                        const isRank2 = row.rank === 2;
                        const isRank3 = row.rank === 3;

                        return (
                          <tr
                            key={row.id}
                            className={`${
                              idx % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'
                            } hover:bg-amber-50/50 transition-colors`}
                          >
                            <td className="p-3.5 text-center">
                              <span
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-anton text-[13px] ${
                                  isRank1
                                    ? 'bg-[#FFC93C] text-[#3D0B0E] shadow-sm'
                                    : isRank2
                                    ? 'bg-[#C0C0C0] text-white shadow-sm'
                                    : isRank3
                                    ? 'bg-[#CD7F32] text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {row.rank}
                              </span>
                            </td>
                            <td className="p-3.5 text-[#3D0B0E]">
                              {row.display_name}
                            </td>
                            <td className="p-3.5 text-gray-700">
                              {row.phone_number ? `+91 ${row.phone_number}` : '-'}
                            </td>
                            <td className="p-3.5 text-right font-anton text-[18px] text-[#B92429]">
                              {row.total_coins}
                            </td>
                            <td className="p-3.5 text-center">
                              <Link
                                href={`/admin/users/${row.id}`}
                                className="inline-block px-3 py-1 bg-[#B92429] hover:bg-[#9E1B20] text-white font-anton text-[12px] uppercase rounded-[6px] shadow-xs transition-colors"
                              >
                                VIEW
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center font-['Montserrat',sans-serif]">
          <div className="flex items-center gap-3 text-gray-600 font-bold">
            <div className="w-5 h-5 border-2 border-[#B92429] border-t-transparent rounded-full animate-spin" />
            <span>Loading admin dashboard...</span>
          </div>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
