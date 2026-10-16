import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMidnightIST, getNextMidnightIST } from '@/lib/gameUtils';

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

  const adminSupabase = createAdminClient();
  const midnightIST = getMidnightIST();
  const nextAvailable = getNextMidnightIST().toISOString();

  // 1. Check if user already played today (resets at midnight IST)
  const { data: plays } = await adminSupabase
    .from('game_plays')
    .select('*')
    .eq('user_id', user.id)
    .eq('game_type', 'sip_match')
    .gte('played_at', midnightIST.toISOString())
    .order('played_at', { ascending: false });

  // If a completed play exists today: return 409 with details
  const completedPlay = plays?.find(
    (p) => p.coins_won > 0 || (p.result && p.result.status === 'completed')
  );

  if (completedPlay) {
    return NextResponse.json(
      {
        error: 'Already played today',
        already_played: true,
        next_available: nextAvailable,
        coins_won: completedPlay.coins_won || 0,
        total_taps: completedPlay.result?.total_taps || 16,
        grid: completedPlay.result?.grid || [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7],
      },
      { status: 409 }
    );
  }

  // If user has an in-progress game from today, allow resuming it
  const activePlay = plays?.find((p) => p.result && p.result.status === 'playing');
  if (activePlay && Array.isArray(activePlay.result.grid) && activePlay.result.grid.length === 16) {
    return NextResponse.json({
      game_id: activePlay.id,
      grid: activePlay.result.grid,
    });
  }

  // 2. Generate random 4x4 grid: 8 pairs (2 of each symbol 0 to 7)
  const symbols = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7];
  const grid = shuffle(symbols);

  const initialResult = {
    grid,
    status: 'playing',
    created_at: new Date().toISOString(),
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
  });
}
