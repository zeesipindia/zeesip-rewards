import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = createAdminClient();

  // Fetch all profiles sorted newest first
  const { data: profiles, error: profilesError } = await adminSupabase
    .from('profiles')
    .select('id, display_name, email, phone_number, team, pincode, created_at')
    .not('display_name', 'is', null)
    .order('created_at', { ascending: false });

  if (profilesError) {
    console.error('[admin/users] Error fetching profiles:', profilesError);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }

  // Fetch all ledger entries to aggregate user coin balances
  const { data: ledgerEntries } = await adminSupabase
    .from('coin_ledger')
    .select('user_id, amount');

  const balanceMap: Record<string, number> = {};
  if (ledgerEntries) {
    for (const entry of ledgerEntries) {
      balanceMap[entry.user_id] = (balanceMap[entry.user_id] || 0) + entry.amount;
    }
  }

  const usersWithCoins = (profiles || []).map((user) => ({
    ...user,
    total_coins: balanceMap[user.id] || 0,
  }));

  return NextResponse.json(usersWithCoins);
}
