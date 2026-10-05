import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  // 1. Fetch full profile
  const { data: profile, error: profileError } = await adminSupabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // 2. Fetch coin_ledger entries sorted by created_at DESC
  const { data: coinLedger } = await adminSupabase
    .from('coin_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // 3. Fetch game_plays entries sorted by played_at DESC
  const { data: gamePlays } = await adminSupabase
    .from('game_plays')
    .select('*')
    .eq('user_id', userId)
    .order('played_at', { ascending: false });

  // Calculate current coin balance
  const balance = (coinLedger || []).reduce((sum, item) => sum + item.amount, 0);

  return NextResponse.json({
    profile,
    balance,
    coin_ledger: coinLedger || [],
    game_plays: gamePlays || [],
  });
}
