'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface StatsData {
  total_users: number;
  total_coins: number;
}

interface UserRow {
  id: string;
  display_name: string;
  email: string;
  phone_number: string | null;
  team: string | null;
  pincode: string | null;
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

  // Fetch stats and tab data
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

    // 2. Fetch Users list
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

  // Filter users by search query
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = u.display_name?.toLowerCase().includes(q);
    const phoneMatch = u.phone_number?.toLowerCase().includes(q);
    return nameMatch || phoneMatch;
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
    <div className="min-h-screen bg-gray-50 text-[#3D0B0E] font-['Montserrat',sans-serif] p-4 sm:p-8">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-6">
        {/* HEADER BAR */}
        <header className="w-full bg-white rounded-[20px] p-6 shadow-sm border border-gray-200 flex items-center justify-between">
          <h1 className="font-anton text-[32px] text-[#B92429] uppercase tracking-wide leading-none">
            ZEESIP ADMIN
          </h1>
          <button
            onClick={handleLogout}
            className="text-[14px] font-bold text-[#B92429] hover:underline cursor-pointer uppercase"
          >
            Logout
          </button>
        </header>

        {/* STATS BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Registered Users */}
          <div className="bg-white rounded-[20px] p-6 shadow-sm border border-gray-200 flex flex-col justify-between">
            <span className="text-[12px] font-extrabold text-[#7A4547] tracking-wider uppercase">
              TOTAL REGISTERED USERS
            </span>
            <div className="mt-2">
              {isLoadingStats ? (
                <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
              ) : (
                <span className="font-anton text-[44px] text-[#3D0B0E] leading-none">
                  {stats?.total_users ?? 0}
                </span>
              )}
            </div>
          </div>

          {/* Card 2: Total Coins in Circulation */}
          <div className="bg-white rounded-[20px] p-6 shadow-sm border border-gray-200 flex flex-col justify-between">
            <span className="text-[12px] font-extrabold text-[#7A4547] tracking-wider uppercase">
              TOTAL COINS IN CIRCULATION
            </span>
            <div className="mt-2 flex items-center gap-2">
              {isLoadingStats ? (
                <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
              ) : (
                <span className="font-anton text-[44px] text-[#FFC93C] drop-shadow-[0_1px_2px_rgba(61,11,14,0.3)] leading-none">
                  {stats?.total_coins ?? 0}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* TAB CONTROLS & MAIN CARD */}
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-200 overflow-hidden">
          {/* Tabs Bar */}
          <div className="flex border-b border-gray-200 bg-gray-50/50">
            <Link
              href="/admin/dashboard?tab=users"
              className={`px-8 py-4 font-anton text-[18px] uppercase tracking-wide transition-colors ${
                activeTab === 'users'
                  ? 'bg-white text-[#B92429] border-b-4 border-[#B92429]'
                  : 'text-gray-500 hover:text-[#3D0B0E]'
              }`}
            >
              USERS ({users.length})
            </Link>
            <Link
              href="/admin/dashboard?tab=points"
              className={`px-8 py-4 font-anton text-[18px] uppercase tracking-wide transition-colors ${
                activeTab === 'points'
                  ? 'bg-white text-[#B92429] border-b-4 border-[#B92429]'
                  : 'text-gray-500 hover:text-[#3D0B0E]'
              }`}
            >
              POINTS LEADERBOARD
            </Link>
          </div>

          {/* TAB 1: USERS */}
          {activeTab === 'users' && (
            <div className="p-6 flex flex-col gap-5">
              {/* Search Box */}
              <div className="w-full max-w-md">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or phone number..."
                  className="w-full h-[44px] px-4 rounded-[14px] border-2 border-gray-200 focus:border-[#B92429] outline-none font-bold text-[14px] text-[#3D0B0E] bg-[#FFF5F3]"
                />
              </div>

              {/* Users Table */}
              {isLoadingData ? (
                <div className="py-12 text-center text-gray-500 font-bold">Loading users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-12 text-center text-gray-500 font-bold">No users found.</div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-[16px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200 text-[12px] font-extrabold text-[#7A4547] uppercase">
                        <th className="p-4">DISPLAY NAME</th>
                        <th className="p-4">PHONE NUMBER</th>
                        <th className="p-4">TEAM</th>
                        <th className="p-4">COINS</th>
                        <th className="p-4">JOINED DATE</th>
                        <th className="p-4 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-[14px] font-bold">
                      {filteredUsers.map((u, idx) => (
                        <tr
                          key={u.id}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9] hover:bg-gray-100/60'}
                        >
                          <td className="p-4 text-[#3D0B0E]">{u.display_name}</td>
                          <td className="p-4">
                            {u.phone_number ? (
                              <span className="text-[#3D0B0E]">{u.phone_number}</span>
                            ) : (
                              <span className="text-gray-400 font-normal">Not set</span>
                            )}
                          </td>
                          <td className="p-4">
                            {u.team === 'mango' ? (
                              <span className="px-2.5 py-1 rounded-full bg-[#CDEE1C] text-[#3D0B0E] font-anton text-[12px] uppercase">
                                Team Mango
                              </span>
                            ) : u.team === 'pineapple' ? (
                              <span className="px-2.5 py-1 rounded-full bg-[#FFE14D] text-[#3D0B0E] font-anton text-[12px] uppercase">
                                Team Pineapple
                              </span>
                            ) : (
                              <span className="text-gray-400 font-normal">Not set</span>
                            )}
                          </td>
                          <td className="p-4 font-anton text-[16px] text-[#B92429]">
                            {u.total_coins}
                          </td>
                          <td className="p-4 text-gray-600 text-[13px]">{formatDate(u.created_at)}</td>
                          <td className="p-4 text-right">
                            <Link
                              href={`/admin/users/${u.id}`}
                              className="px-4 py-2 rounded-[12px] bg-[#B92429] hover:bg-[#9E1B20] text-white font-anton text-[14px] uppercase transition-colors inline-block"
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
            <div className="p-6">
              {leaderboard.length === 0 ? (
                <div className="py-12 text-center text-gray-500 font-bold">No users on leaderboard yet.</div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-[16px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200 text-[12px] font-extrabold text-[#7A4547] uppercase">
                        <th className="p-4 w-20 text-center">RANK</th>
                        <th className="p-4">DISPLAY NAME</th>
                        <th className="p-4">PHONE NUMBER</th>
                        <th className="p-4">TOTAL COINS</th>
                        <th className="p-4 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-[14px] font-bold">
                      {leaderboard.map((user, idx) => {
                        let rankStyle = 'bg-gray-100 text-gray-700';
                        if (user.rank === 1) rankStyle = 'bg-[#FFC93C] text-[#3D0B0E] shadow-sm';
                        else if (user.rank === 2) rankStyle = 'bg-[#C0C0C0] text-[#3D0B0E] shadow-sm';
                        else if (user.rank === 3) rankStyle = 'bg-[#CD7F32] text-white shadow-sm';

                        return (
                          <tr
                            key={user.id}
                            className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9] hover:bg-gray-100/60'}
                          >
                            <td className="p-4 text-center">
                              <span
                                className={`w-9 h-9 rounded-full font-anton text-[16px] inline-flex items-center justify-center ${rankStyle}`}
                              >
                                {user.rank}
                              </span>
                            </td>
                            <td className="p-4 text-[#3D0B0E]">{user.display_name}</td>
                            <td className="p-4">
                              {user.phone_number ? (
                                <span className="text-[#3D0B0E]">{user.phone_number}</span>
                              ) : (
                                <span className="text-gray-400 font-normal">Not set</span>
                              )}
                            </td>
                            <td className="p-4 font-anton text-[20px] text-[#FFC93C] drop-shadow-[0_1px_1px_rgba(61,11,14,0.4)]">
                              {user.total_coins} COINS
                            </td>
                            <td className="p-4 text-right">
                              <Link
                                href={`/admin/users/${user.id}`}
                                className="px-4 py-2 rounded-[12px] bg-[#B92429] hover:bg-[#9E1B20] text-white font-anton text-[14px] uppercase transition-colors inline-block"
                              >
                                VIEW
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-bold">Loading dashboard...</div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}
