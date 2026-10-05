import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = createAdminClient();

  // 1. Count registered users where display_name IS NOT NULL
  const { count: totalUsers, error: usersError } = await adminSupabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .not('display_name', 'is', null);

  if (usersError) {
    console.error('[admin/stats] Failed to fetch users count:', usersError);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }

  // 2. Calculate total coins in circulation (SUM of all positive entries in coin_ledger)
  const { data: coinsData, error: coinsError } = await adminSupabase
    .from('coin_ledger')
    .select('amount')
    .gt('amount', 0);

  if (coinsError) {
    console.error('[admin/stats] Failed to fetch coins:', coinsError);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }

  const totalCoins = coinsData ? coinsData.reduce((sum, row) => sum + row.amount, 0) : 0;

  return NextResponse.json({
    total_users: totalUsers || 0,
    total_coins: totalCoins,
  });
}
