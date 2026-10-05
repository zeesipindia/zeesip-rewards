import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = createAdminClient();

  // Fetch all valid profiles
  const { data: profiles, error: profilesError } = await adminSupabase
    .from('profiles')
    .select('id, display_name, phone_number, created_at')
    .not('display_name', 'is', null);

  if (profilesError) {
    console.error('[admin/leaderboard] Error fetching profiles:', profilesError);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }

  // Fetch all coin ledger entries
  const { data: ledgerEntries } = await adminSupabase
    .from('coin_ledger')
    .select('user_id, amount');

  const balanceMap: Record<string, number> = {};
  if (ledgerEntries) {
    for (const entry of ledgerEntries) {
      balanceMap[entry.user_id] = (balanceMap[entry.user_id] || 0) + entry.amount;
    }
  }

  const rankedUsers = (profiles || [])
    .map((profile) => ({
      id: profile.id,
      display_name: profile.display_name,
      phone_number: profile.phone_number,
      total_coins: balanceMap[profile.id] || 0,
      created_at: profile.created_at,
    }))
    .sort((a, b) => b.total_coins - a.total_coins)
    .map((user, index) => ({
      rank: index + 1,
      ...user,
    }));

  return NextResponse.json(rankedUsers);
}
