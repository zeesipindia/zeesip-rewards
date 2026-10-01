import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

  // Check if brand new user (first play ever)
  const { data: pastPlaysData } = await supabaseAdmin
    .from('game_plays')
    .select('id')
    .eq('user_id', user.id)
    .eq('game_type', 'scratch')
    .limit(1);

  const isFirstPlayEver = !pastPlaysData || pastPlaysData.length === 0;

  let chosenPrize = 0;

  if (isFirstPlayEver) {
    // Brand new user first play ever gets +5
    chosenPrize = 5;
  } else {
    // Rare probability distribution:
    // +50: 0.5% (0.005)
    // +25: 1.0% (0.010)
    // +15: 2.0% (0.020)
    // +10: 3.0% (0.030)
    // +5:  3.5% (0.035)
    // 0:   90.0% (0.900)
    const rand = Math.random();
    if (rand < 0.005) {
      chosenPrize = 50;
    } else if (rand < 0.015) {
      chosenPrize = 25;
    } else if (rand < 0.035) {
      chosenPrize = 15;
    } else if (rand < 0.065) {
      chosenPrize = 10;
    } else if (rand < 0.100) {
      chosenPrize = 5;
    } else {
      chosenPrize = 0;
    }
  }

  let prizeLabel = 'BETTER LUCK NEXT TIME';
  if (chosenPrize === 50) {
    prizeLabel = 'MEGA WIN! +50 SIP COINS!';
  } else if (chosenPrize === 25) {
    prizeLabel = 'BIG WIN! +25 SIP COINS!';
  } else if (chosenPrize === 15 || chosenPrize === 10) {
    prizeLabel = `YOU WON +${chosenPrize} SIP COINS!`;
  } else if (chosenPrize === 5) {
    prizeLabel = 'NICE! +5 SIP COINS';
  }

  const playedAt = new Date().toISOString();

  await supabaseAdmin.from('game_plays').insert({
    user_id: user.id,
    game_type: 'scratch',
    result: { coins_won: chosenPrize, prize_label: prizeLabel },
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
    prize_label: prizeLabel,
    next_available: nextAvailableISO,
  });
}
