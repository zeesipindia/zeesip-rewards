import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateLastGamePlayed } from '@/lib/gameUtils';

export function calculateSipMatchCoins(totalTaps: number, isFirstPlay = false): number {
  let coins = 1;
  if (totalTaps === 16) coins = 12;
  else if (totalTaps <= 20) coins = 10;
  else if (totalTaps <= 24) coins = 8;
  else if (totalTaps <= 28) coins = 5;
  else if (totalTaps <= 32) coins = 3;
  else coins = 1;

  // First ever sip-match play guarantee: minimum +3 coins
  if (isFirstPlay && coins < 3) {
    coins = 3;
  }

  return coins;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { game_id, total_taps } = body;

  if (!game_id || typeof total_taps !== 'number') {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  // Minimum possible taps is 16 (8 pairs x 2 taps)
  if (total_taps < 16) {
    return NextResponse.json({ error: 'Invalid tap count (minimum 16)' }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  // Fetch the game session
  const { data: gamePlay, error: fetchErr } = await adminSupabase
    .from('game_plays')
    .select('*')
    .eq('id', game_id)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !gamePlay) {
    return NextResponse.json({ error: 'Game session not found' }, { status: 404 });
  }

  // Validate game hasn't been completed already
  if (gamePlay.coins_won > 0 || gamePlay.result?.status === 'completed') {
    return NextResponse.json({ error: 'Game already completed' }, { status: 400 });
  }

  // Check if this is the user's first ever completed sip_match play
  const { count } = await adminSupabase
    .from('game_plays')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('game_type', 'sip_match')
    .gt('coins_won', 0);

  const isFirstPlay = (count ?? 0) === 0;

  const coinsWon = calculateSipMatchCoins(total_taps, isFirstPlay);

  // 1. Insert into coin_ledger
  await adminSupabase.from('coin_ledger').insert({
    user_id: user.id,
    amount: coinsWon,
    source: 'SIP_MATCH',
    description: `Sip Match reward (+${coinsWon} coins)`,
  });

  // 2. Update profiles.last_game_played_at = now()
  await updateLastGamePlayed(user.id);

  // 3. Insert into events
  await adminSupabase.from('events').insert({
    user_id: user.id,
    event_type: 'SIP_MATCH_COMPLETED',
    metadata: {
      total_taps,
      coins_won: coinsWon,
      is_first_play: isFirstPlay,
    },
  });

  // 4. Update game_plays
  const updatedResult = {
    ...(gamePlay.result || {}),
    status: 'completed',
    total_taps,
    coins_won: coinsWon,
    is_first_play: isFirstPlay,
    completed_at: new Date().toISOString(),
  };

  await adminSupabase
    .from('game_plays')
    .update({
      coins_won: coinsWon,
      result: updatedResult,
    })
    .eq('id', game_id);

  return NextResponse.json({
    coins_won: coinsWon,
    total_taps,
    is_first_play: isFirstPlay,
  });
}
