import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface GamePlayRow {
  coins_won: number;
  played_at: string;
}

function getMidnightISTNextAvailable(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 3600000 * 5.5);
  const midnightIST = new Date(istDate);
  midnightIST.setHours(24, 0, 0, 0);
  const nextAvailable = new Date(midnightIST.getTime() - 3600000 * 5.5);
  return nextAvailable.toISOString();
}

function getTodayISTStartISO(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 3600000 * 5.5);
  const todayIST = new Date(istDate);
  todayIST.setHours(0, 0, 0, 0);
  const todayStartUTC = new Date(todayIST.getTime() - 3600000 * 5.5);
  return todayStartUTC.toISOString();
}

export async function POST() {
  const serverSupabase = await createClient();
  const { data: { user }, error: authError } = await serverSupabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAdmin = createAdminClient();
  const todayStartISO = getTodayISTStartISO();
  const nextAvailableISO = getMidnightISTNextAvailable();

  // Check if played today
  const { data: todayPlays } = await supabaseAdmin
    .from('game_plays')
    .select('played_at')
    .eq('user_id', user.id)
    .eq('game_type', 'pick_kulkki')
    .gte('played_at', todayStartISO);

  if (todayPlays && todayPlays.length > 0) {
    return NextResponse.json(
      {
        error: 'You have already played Pick the Kulkki today. Come back tomorrow!',
        next_available: nextAvailableISO,
      },
      { status: 409 }
    );
  }

  // Check past plays for psychology rules
  const { data: pastPlaysData } = await supabaseAdmin
    .from('game_plays')
    .select('coins_won, played_at')
    .eq('user_id', user.id)
    .eq('game_type', 'pick_kulkki')
    .order('played_at', { ascending: false })
    .limit(3);

  const pastPlays = (pastPlaysData || []) as GamePlayRow[];
  const isFirstPlay = pastPlays.length === 0;
  const lastTwoWereZero = pastPlays.length >= 2 && pastPlays[0].coins_won === 0 && pastPlays[1].coins_won === 0;
  const forceWin = isFirstPlay || lastTwoWereZero;

  // Prize options
  let prizeOptions = [
    { coins: 5, prob: 0.30 },
    { coins: 10, prob: 0.25 },
    { coins: 15, prob: 0.15 },
    { coins: 25, prob: 0.05 },
    { coins: 0, prob: 0.25 },
  ];

  if (forceWin) {
    prizeOptions = prizeOptions.filter((p) => p.coins > 0);
  }

  const totalProb = prizeOptions.reduce((sum, p) => sum + p.prob, 0);
  let rand = Math.random() * totalProb;
  let chosenPrize = prizeOptions[0].coins;

  for (const option of prizeOptions) {
    if (rand <= option.prob) {
      chosenPrize = option.coins;
      break;
    }
    rand -= option.prob;
  }

  // Winning position (0, 1, or 2)
  const winningPosition = Math.floor(Math.random() * 3);

  const { data: newGame, error: insertError } = await supabaseAdmin
    .from('game_plays')
    .insert({
      user_id: user.id,
      game_type: 'pick_kulkki',
      result: { winning_position: winningPosition, coins: chosenPrize, picked: null },
      coins_won: 0,
    })
    .select()
    .single();

  if (insertError || !newGame) {
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
  }

  return NextResponse.json({
    game_id: newGame.id,
  });
}
