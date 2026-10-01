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

  // Check if played scratch today
  const { data: todayPlays } = await supabaseAdmin
    .from('game_plays')
    .select('played_at')
    .eq('user_id', user.id)
    .eq('game_type', 'scratch')
    .gte('played_at', todayStartISO);

  if (todayPlays && todayPlays.length > 0) {
    return NextResponse.json(
      {
        error: 'You have already played Scratch Your Sip today. Come back tomorrow!',
        next_available: nextAvailableISO,
      },
      { status: 409 }
    );
  }

  // Fetch past plays for psychology rules
  const { data: pastPlaysData } = await supabaseAdmin
    .from('game_plays')
    .select('coins_won, played_at')
    .eq('user_id', user.id)
    .eq('game_type', 'scratch')
    .order('played_at', { ascending: false })
    .limit(3);

  const pastPlays = (pastPlaysData || []) as GamePlayRow[];
  const isFirstPlay = pastPlays.length === 0;
  const lastTwoWereZero = pastPlays.length >= 2 && pastPlays[0].coins_won === 0 && pastPlays[1].coins_won === 0;
  const forceWin = isFirstPlay || lastTwoWereZero;

  let prizeOptions = [
    { coins: 5, prob: 0.25 },
    { coins: 10, prob: 0.25 },
    { coins: 15, prob: 0.15 },
    { coins: 25, prob: 0.08 },
    { coins: 50, prob: 0.02 },
    { coins: 0, prob: 0.25 },
  ];

  if (forceWin) {
    // Exclude 0, for first play ensure minimum 10
    prizeOptions = prizeOptions.filter((p) => (isFirstPlay ? p.coins >= 10 : p.coins > 0));
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

  const playedAt = new Date().toISOString();

  await supabaseAdmin.from('game_plays').insert({
    user_id: user.id,
    game_type: 'scratch',
    result: { coins_won: chosenPrize, prize_label: chosenPrize > 0 ? `+${chosenPrize} COINS` : 'OOPS' },
    coins_won: chosenPrize,
    played_at: playedAt,
  });

  if (chosenPrize > 0) {
    await supabaseAdmin.from('coin_ledger').insert({
      user_id: user.id,
      amount: chosenPrize,
      source: 'SCRATCH',
      description: `Scratch Your Sip reward (+${chosenPrize} coins)`,
    });
  }

  await supabaseAdmin.from('events').insert({
    user_id: user.id,
    event_type: 'SCRATCH_COMPLETED',
    metadata: { coins_won: chosenPrize },
  });

  return NextResponse.json({
    coins_won: chosenPrize,
    prize_label: chosenPrize > 0 ? `+${chosenPrize}` : 'OOPS',
    next_available: nextAvailableISO,
  });
}
