import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = createAdminClient();

  // 1. Fetch profile to check last_game_played_at and created_at
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('last_game_played_at, created_at')
    .eq('id', user.id)
    .single();

  let lastGamePlayedAt = profile?.last_game_played_at;
  const createdAt = profile?.created_at || new Date().toISOString();

  if (!lastGamePlayedAt) {
    lastGamePlayedAt = createdAt;
    await adminSupabase
      .from('profiles')
      .update({ last_game_played_at: lastGamePlayedAt })
      .eq('id', user.id);
  }

  // 2. Calculate balance from coin_ledger
  const { data: ledgerEntries, error: ledgerError } = await adminSupabase
    .from('coin_ledger')
    .select('amount')
    .eq('user_id', user.id);

  if (ledgerError) {
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }

  const currentBalance = ledgerEntries ? ledgerEntries.reduce((sum, item) => sum + item.amount, 0) : 0;
  const target = 500;

  // 3. 14-day expiry check
  const lastPlayedDate = new Date(lastGamePlayedAt);
  const now = new Date();
  const diffMs = now.getTime() - lastPlayedDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let finalBalance = currentBalance;
  let expiredJustNow = false;
  let coinsExpired = 0;

  if (diffDays >= 14) {
    if (currentBalance > 0) {
      // Coins expired — reset balance to 0
      const { error: expiryErr } = await adminSupabase.from('coin_ledger').insert({
        user_id: user.id,
        amount: -currentBalance,
        source: 'EXPIRY',
        description: 'Coins expired — no activity for 14+ days',
      });

      if (!expiryErr) {
        expiredJustNow = true;
        coinsExpired = currentBalance;
        finalBalance = 0;
      }
    }

    // Update last_game_played_at = now() so expiry doesn't re-trigger continuously
    await adminSupabase
      .from('profiles')
      .update({ last_game_played_at: now.toISOString() })
      .eq('id', user.id);

    return NextResponse.json({
      balance: finalBalance,
      target,
      progress_percent: 0,
      days_since_last_play: 0,
      days_until_expiry: 14,
      expired_just_now: expiredJustNow,
      coins_expired: coinsExpired,
      last_game_played_at: now.toISOString(),
    });
  }

  const daysUntilExpiry = Math.max(1, 14 - diffDays);
  const progress_percent = Math.min(100, Math.round((finalBalance / target) * 100));

  return NextResponse.json({
    balance: finalBalance,
    target,
    progress_percent,
    days_since_last_play: diffDays,
    days_until_expiry: daysUntilExpiry,
    expired_just_now: false,
    coins_expired: 0,
    last_game_played_at: lastPlayedDate.toISOString(),
  });
}
