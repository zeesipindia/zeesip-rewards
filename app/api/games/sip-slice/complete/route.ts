import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateLastGamePlayed } from '@/lib/gameUtils';
import { BottleSpawn } from '@/lib/bottleTypes';

interface SipSliceState {
  bottles: BottleSpawn[];
  is_first_play?: boolean;
  start_time: string;
  is_completed: boolean;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { game_id, sliced_indices, hit_expired, ended_at_ms } = body;

  if (!game_id || !Array.isArray(sliced_indices)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  const { data: gamePlay, error: fetchErr } = await adminSupabase
    .from('game_plays')
    .select('*')
    .eq('id', game_id)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !gamePlay) {
    return NextResponse.json({ error: 'Game session not found' }, { status: 404 });
  }

  const state = gamePlay.result as SipSliceState;

  if (state.is_completed || gamePlay.coins_won > 0) {
    return NextResponse.json({ error: 'Game already completed' }, { status: 400 });
  }

  const bottlesMap = new Map<number, BottleSpawn>();
  state.bottles.forEach((b) => bottlesMap.set(b.index, b));

  // Deduplicate and order sliced indices by appearance
  const uniqueSliced = [...new Set(sliced_indices)].filter((idx) => bottlesMap.has(idx));
  uniqueSliced.sort((a, b) => {
    const bA = bottlesMap.get(a)?.appear_at_ms ?? 0;
    const bB = bottlesMap.get(b)?.appear_at_ms ?? 0;
    return bA - bB;
  });

  let rawScore = 0;
  let didHitExpired = false;
  let validSlicedCount = 0;

  for (const idx of uniqueSliced) {
    const bottle = bottlesMap.get(idx);
    if (!bottle) continue;

    if (bottle.type === 'expired') {
      didHitExpired = true;
      rawScore -= 3;
      validSlicedCount += 1;
      // Game ended immediately upon slicing expired bottle
      break;
    } else if (bottle.type === 'gold') {
      rawScore += 3;
      validSlicedCount += 1;
    } else {
      rawScore += 1;
      validSlicedCount += 1;
    }
  }

  // Minimum 1 coin participation reward
  let finalScore = Math.max(1, rawScore);

  // First ever play guarantee: at least +5 coins
  if (state.is_first_play && finalScore < 5) {
    finalScore = 5;
  }

  const totalBottles = state.bottles.length;

  // 1. Insert into coin_ledger
  await adminSupabase.from('coin_ledger').insert({
    user_id: user.id,
    amount: finalScore,
    source: 'SIP_SLICE',
    description: `Sip Slice reward (+${finalScore} coins)`,
  });

  // 2. Update profiles.last_game_played_at = now()
  await updateLastGamePlayed(user.id);

  // 3. Insert into events
  await adminSupabase.from('events').insert({
    user_id: user.id,
    event_type: 'SIP_SLICE_COMPLETED',
    metadata: {
      coins_won: finalScore,
      bottles_sliced: validSlicedCount,
      total_bottles: totalBottles,
      hit_expired: didHitExpired || Boolean(hit_expired),
      ended_at_ms: ended_at_ms || null,
    },
  });

  // 4. Update game_plays
  const updatedResult = {
    ...state,
    is_completed: true,
    sliced_indices: uniqueSliced,
    hit_expired: didHitExpired || Boolean(hit_expired),
    bottles_sliced: validSlicedCount,
    total_bottles: totalBottles,
    final_coins: finalScore,
    completed_at: new Date().toISOString(),
  };

  await adminSupabase
    .from('game_plays')
    .update({
      coins_won: finalScore,
      result: updatedResult,
    })
    .eq('id', game_id);

  const { data: ledgerEntries } = await adminSupabase
    .from('coin_ledger')
    .select('amount')
    .eq('user_id', user.id);
  const newBalance = ledgerEntries ? ledgerEntries.reduce((sum, item) => sum + item.amount, 0) : finalScore;

  return NextResponse.json({
    coins_won: finalScore,
    bottles_sliced: validSlicedCount,
    total_bottles: totalBottles,
    hit_expired: didHitExpired,
    new_balance: newBalance,
  });
}
