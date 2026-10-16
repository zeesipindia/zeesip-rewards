import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateLastGamePlayed } from '@/lib/gameUtils';
import { BottleSpawn } from '@/lib/bottleTypes';

interface SipSliceState {
  bottles: BottleSpawn[];
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
  const { game_id, sliced_indices, ended_early, ended_at_ms } = body;

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

  if (state.is_completed) {
    return NextResponse.json({ error: 'Game already completed' }, { status: 400 });
  }

  const bottlesMap = new Map<number, BottleSpawn>();
  state.bottles.forEach((b) => bottlesMap.set(b.index, b));

  // Sort sliced indices by their appearance time
  const sortedSliced = [...new Set(sliced_indices)].sort((a, b) => {
    const bA = bottlesMap.get(a)?.appear_at_ms ?? 0;
    const bB = bottlesMap.get(b)?.appear_at_ms ?? 0;
    return bA - bB;
  });

  let rawScore = 0;
  let hitExpired = false;
  let validSlicedCount = 0;

  for (const idx of sortedSliced) {
    const bottle = bottlesMap.get(idx);
    if (!bottle) continue;

    if (bottle.type === 'expired') {
      hitExpired = true;
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
  const finalScore = Math.max(1, rawScore);
  const totalBottles = state.bottles.length;
  const missedCount = Math.max(0, totalBottles - validSlicedCount);

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
      bottles_missed: missedCount,
      hit_expired: hitExpired,
      ended_early: Boolean(ended_early),
      ended_at_ms: ended_at_ms || null,
    },
  });

  // 4. Update game_plays
  state.is_completed = true;
  await adminSupabase
    .from('game_plays')
    .update({
      coins_won: finalScore,
      result: {
        ...state,
        sliced_indices: sortedSliced,
        hit_expired: hitExpired,
        final_coins: finalScore,
      },
    })
    .eq('id', game_id);

  return NextResponse.json({
    coins_won: finalScore,
    bottles_sliced: validSlicedCount,
    bottles_missed: missedCount,
    hit_expired: hitExpired,
  });
}
