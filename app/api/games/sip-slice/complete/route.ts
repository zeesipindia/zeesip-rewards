import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateLastGamePlayed } from '@/lib/gameUtils';
import { ItemSpawn } from '@/lib/bottleTypes';

interface SipSliceState {
  items?: ItemSpawn[];
  bottles?: ItemSpawn[];
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

  const body = await req.json().catch(() => ({}));
  const { game_id, sliced_indices, bombs_hit_indices, ended_at_ms } = body;

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

  const itemsList = state.items || state.bottles || [];
  const itemsMap = new Map<number, ItemSpawn>();
  itemsList.forEach((b) => itemsMap.set(b.index, b));

  // Deduplicate sliced indices
  const uniqueSliced = [...new Set(sliced_indices)].filter((idx) => itemsMap.has(idx));
  const uniqueBombs = Array.isArray(bombs_hit_indices)
    ? [...new Set(bombs_hit_indices)].filter((idx) => itemsMap.has(idx) && itemsMap.get(idx)?.type === 'bomb')
    : uniqueSliced.filter((idx) => itemsMap.get(idx)?.type === 'bomb');

  let rawScore = 0;
  let fruitsSlicedCount = 0;
  let bombsHitCount = 0;

  for (const idx of uniqueSliced) {
    const item = itemsMap.get(idx);
    if (!item) continue;

    if (item.type === 'bomb') {
      rawScore -= 10;
      bombsHitCount += 1;
    } else {
      rawScore += 1;
      fruitsSlicedCount += 1;
    }
  }

  // Minimum total score: +1 (can never be 0 or negative)
  let finalCoins = Math.max(1, rawScore);

  // First ever play guarantee: at least +5 coins
  if (state.is_first_play && finalCoins < 5) {
    finalCoins = 5;
  }

  const totalFruits = itemsList.filter((it) => it.type !== 'bomb').length;
  const totalItems = itemsList.length;

  // 1. Insert into coin_ledger
  await adminSupabase.from('coin_ledger').insert({
    user_id: user.id,
    amount: finalCoins,
    source: 'SIP_SLICE',
    description: `Sip Slice reward (+${finalCoins} coins)`,
  });

  // 2. Update profiles.last_game_played_at = now()
  await updateLastGamePlayed(user.id);

  // 3. Insert into events
  await adminSupabase.from('events').insert({
    user_id: user.id,
    event_type: 'SIP_SLICE_COMPLETED',
    metadata: {
      coins_won: finalCoins,
      fruits_sliced: fruitsSlicedCount,
      total_fruits: totalFruits,
      total_items: totalItems,
      bombs_hit: bombsHitCount,
      ended_at_ms: ended_at_ms || null,
    },
  });

  // 4. Update game_plays
  const updatedResult = {
    ...state,
    is_completed: true,
    sliced_indices: uniqueSliced,
    bombs_hit_indices: uniqueBombs,
    fruits_sliced: fruitsSlicedCount,
    bottles_sliced: fruitsSlicedCount,
    total_fruits: totalFruits,
    total_bottles: totalFruits,
    bombs_hit: bombsHitCount,
    coins_won: finalCoins,
    completed_at: new Date().toISOString(),
  };

  await adminSupabase
    .from('game_plays')
    .update({
      coins_won: finalCoins,
      result: updatedResult,
    })
    .eq('id', game_id);

  // 5. Calculate new balance
  const { data: ledgerEntries } = await adminSupabase
    .from('coin_ledger')
    .select('amount')
    .eq('user_id', user.id);

  const newBalance = ledgerEntries
    ? ledgerEntries.reduce((sum, item) => sum + item.amount, 0)
    : finalCoins;

  return NextResponse.json({
    coins_won: finalCoins,
    fruits_sliced: fruitsSlicedCount,
    total_fruits: totalFruits,
    bombs_hit: bombsHitCount,
    bottles_sliced: fruitsSlicedCount,
    total_bottles: totalFruits,
    new_balance: newBalance,
  });
}
