'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

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

  // Delete User & Modal States
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentAuthUserId, setCurrentAuthUserId] = useState<string | null>(null);

  useEffect(() => {
    // 0. Fetch Current Logged-In Supabase Auth User (Safety: Prevent self-deletion)
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentAuthUserId(user.id);
      }
    });

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

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    const targetUser = userToDelete;
    setIsDeleting(true);
    setDeletingUserId(targetUser.id);

    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to delete user');
        setIsDeleting(false);
        setDeletingUserId(null);
        return;
      }

      // Close modal
      setUserToDelete(null);
      setIsDeleting(false);

      // Fade-out row animation (300ms) then remove from state
      setTimeout(() => {
        setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
        setLeaderboard((prev) => prev.filter((l) => l.id !== targetUser.id));
        setDeletingUserId(null);
      }, 300);

      // Decrement total users and subtract user coins
      setStats((prev) =>
        prev
          ? {
              ...prev,
              total_users: Math.max(0, prev.total_users - 1),
              total_coins: Math.max(0, prev.total_coins - (targetUser.total_coins || 0)),
            }
          : prev
      );

      // Show brief green toast notification
      setToastMessage(`User ${targetUser.display_name} deleted successfully`);
      setTimeout(() => {
        setToastMessage(null);
      }, 4000);
    } catch {
      alert('An unexpected network error occurred while deleting the user.');
      setIsDeleting(false);
      setDeletingUserId(null);
    }
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
    <div className="flex flex-col min-h-screen w-full relative">
      {/* GREEN TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#16A34A] text-white px-5 py-3.5 rounded-[10px] shadow-2xl flex items-center gap-2.5 font-bold text-[14px] border border-green-700 animate-fade-in transition-all">
          <span className="text-base leading-none">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* CONFIRMATION DIALOG MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-[16px] max-w-md w-full p-6 shadow-2xl border border-[#E0E0E0] flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-lg">
                🗑️
              </div>
              <h3 className="font-anton text-[22px] text-[#3D0B0E] uppercase tracking-wide">
                Delete User?
              </h3>
            </div>

            {/* Target User Info Box */}
            <div className="bg-[#FFF5F3] border border-[#F4D2CF] rounded-[10px] p-4 flex flex-col gap-1.5 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#7A4547] uppercase">Name</span>
                <span className="text-[13px] font-bold text-[#3D0B0E]">{userToDelete.display_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#7A4547] uppercase">Email</span>
                <span className="text-[13px] font-medium text-gray-700">{userToDelete.email}</span>
              </div>
              {userToDelete.phone_number && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-[#7A4547] uppercase">Phone</span>
                  <span className="text-[13px] font-medium text-gray-700">+91 {userToDelete.phone_number}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#7A4547] uppercase">Coins</span>
                <span className="text-[13px] font-anton text-[#B92429]">{userToDelete.total_coins}</span>
              </div>
            </div>

            <p className="text-[13px] text-gray-600 leading-relaxed text-left">
              This will permanently delete this user&apos;s profile, all their coins, game history, and transaction records. This cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => !isDeleting && setUserToDelete(null)}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-[8px] bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-700 font-bold text-[13px] uppercase tracking-wider cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-[8px] bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-red-400 text-white font-bold text-[13px] uppercase tracking-wider cursor-pointer transition-colors shadow-sm flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  'Delete Permanently'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
                        <th className="p-3.5 text-center w-36">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E0E0E0] text-[13px] font-bold">
                      {filteredUsers.map((user, idx) => (
                        <tr
                          key={user.id}
                          className={`${
                            idx % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'
                          } hover:bg-amber-50/50 transition-all duration-300 ${
                            deletingUserId === user.id
                              ? 'opacity-0 scale-95 pointer-events-none'
                              : 'opacity-100'
                          }`}
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
                            <div className="flex items-center justify-center gap-2">
                              <Link
                                href={`/admin/users/${user.id}`}
                                className="inline-block px-3 py-1 bg-[#B92429] hover:bg-[#9E1B20] text-white font-anton text-[12px] uppercase rounded-[6px] shadow-xs transition-colors"
                              >
                                VIEW
                              </Link>
                              {user.id !== currentAuthUserId && (
                                <button
                                  type="button"
                                  onClick={() => setUserToDelete(user)}
                                  disabled={deletingUserId === user.id}
                                  className="inline-block px-3 py-1 bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-gray-400 text-white font-anton text-[12px] uppercase rounded-[6px] shadow-xs transition-colors cursor-pointer"
                                >
                                  DELETE
                                </button>
                              )}
                            </div>
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
                      <th className="p-3.5 text-center w-36">ACTION</th>
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
                        const matchingUser = users.find((u) => u.id === row.id);

                        return (
                          <tr
                            key={row.id}
                            className={`${
                              idx % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'
                            } hover:bg-amber-50/50 transition-all duration-300 ${
                              deletingUserId === row.id
                                ? 'opacity-0 scale-95 pointer-events-none'
                                : 'opacity-100'
                            }`}
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
                              <div className="flex items-center justify-center gap-2">
                                <Link
                                  href={`/admin/users/${row.id}`}
                                  className="inline-block px-3 py-1 bg-[#B92429] hover:bg-[#9E1B20] text-white font-anton text-[12px] uppercase rounded-[6px] shadow-xs transition-colors"
                                >
                                  VIEW
                                </Link>
                                {row.id !== currentAuthUserId && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setUserToDelete(
                                        matchingUser || {
                                          id: row.id,
                                          display_name: row.display_name,
                                          email: 'No email found',
                                          phone_number: row.phone_number,
                                          team: null,
                                          created_at: row.created_at,
                                          total_coins: row.total_coins,
                                        }
                                      )
                                    }
                                    disabled={deletingUserId === row.id}
                                    className="inline-block px-3 py-1 bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-gray-400 text-white font-anton text-[12px] uppercase rounded-[6px] shadow-xs transition-colors cursor-pointer"
                                  >
                                    DELETE
                                  </button>
                                )}
                              </div>
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
