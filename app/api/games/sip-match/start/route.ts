import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasPlayedGameToday } from '@/lib/gameUtils';

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Check if already played today (resets at midnight IST)
  const status = await hasPlayedGameToday(user.id, 'sip_match');
  if (status.played) {
    return NextResponse.json(
      { error: 'Already played today', next_available: status.nextAvailable },
      { status: 409 }
    );
  }

  // 2. Generate 4x4 grid: 8 pairs of symbols (0 to 7)
  const symbols = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7];
  const grid = shuffle(symbols);

  // 3. Generate random round order for the 8 pairs
  const roundOrder = shuffle([0, 1, 2, 3, 4, 5, 6, 7]);

  // 4. For each round, choose one card of the pair to reveal, and the other is the target
  const roundsData = roundOrder.map((sym) => {
    const positions: number[] = [];
    grid.forEach((v, idx) => {
      if (v === sym) positions.push(idx);
    });
    const revealFirst = Math.random() < 0.5;
    const revealed = revealFirst ? positions[0] : positions[1];
    const match = revealFirst ? positions[1] : positions[0];
    return { symbol: sym, revealed, match };
  });

  const adminSupabase = createAdminClient();

  const initialResult = {
    grid,
    round_order: roundOrder,
    rounds_data: roundsData,
    current_round: 0,
    matched_pairs: [] as number[],
    correct_count: 0,
    is_completed: false,
  };

  const { data: gamePlay, error: insertError } = await adminSupabase
    .from('game_plays')
    .insert({
      user_id: user.id,
      game_type: 'sip_match',
      result: initialResult,
      coins_won: 0,
    })
    .select('id')
    .single();

  if (insertError || !gamePlay) {
    return NextResponse.json({ error: 'Failed to create game session' }, { status: 500 });
  }

  return NextResponse.json({
    game_id: gamePlay.id,
    grid,
    round_order: roundOrder,
    rounds_data: roundsData,
  });
}
