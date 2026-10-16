import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMidnightIST, getNextMidnightIST } from '@/lib/gameUtils';
import { BottleType, BottleSpawn } from '@/lib/bottleTypes';

function generateSequence(isFirstPlay: boolean): BottleSpawn[] {
  const bottles: BottleSpawn[] = [];
  let currentIndex = 0;

  // Phase 1: 0 - 10s (warmup: 4-5 bottles, every 2-2.5s)
  // No expired bottles. 0-1 gold bottle.
  let timeMs = 1200;
  while (timeMs < 9500) {
    const isGold = Math.random() < 0.15;
    const type: BottleType = isGold ? 'gold' : Math.random() < 0.5 ? 'mango' : 'pineapple';
    const duration = isFirstPlay ? 2400 + Math.floor(Math.random() * 200) : 2100 + Math.floor(Math.random() * 300);

    bottles.push({
      index: currentIndex++,
      type,
      appear_at_ms: timeMs,
      start_x_percent: 0.15 + Math.random() * 0.7,
      drift_x: (Math.random() - 0.5) * 120,
      peak_height_percent: 0.32 + Math.random() * 0.35,
      flight_duration_ms: duration,
      initial_rotation: (Math.random() - 0.5) * 40,
      rotation_speed: (Math.random() > 0.5 ? 1 : -1) * (120 + Math.floor(Math.random() * 100)),
    });
    timeMs += isFirstPlay ? 2300 + Math.floor(Math.random() * 400) : 2000 + Math.floor(Math.random() * 400);
  }

  // Phase 2: 10 - 20s (medium: 6-7 bottles, every 1.5-2s, sometimes 2 at once)
  // 1 expired bottle guaranteed here (unless first play)
  let expiredCountPhase2 = 0;
  let goldCountPhase2 = 0;
  timeMs = 10500;
  while (timeMs < 19500) {
    const spawnDouble = Math.random() < 0.25;
    const countToSpawn = spawnDouble ? 2 : 1;

    for (let i = 0; i < countToSpawn; i++) {
      let type: BottleType = 'mango';
      if (!isFirstPlay && expiredCountPhase2 === 0 && Math.random() < 0.35) {
        type = 'expired';
        expiredCountPhase2++;
      } else if (goldCountPhase2 === 0 && Math.random() < 0.25) {
        type = 'gold';
        goldCountPhase2++;
      } else {
        type = Math.random() < 0.5 ? 'mango' : 'pineapple';
      }

      const duration = isFirstPlay ? 2400 + Math.floor(Math.random() * 200) : 2000 + Math.floor(Math.random() * 300);
      const startX = countToSpawn === 2 ? (i === 0 ? 0.25 : 0.75) : 0.15 + Math.random() * 0.7;

      bottles.push({
        index: currentIndex++,
        type,
        appear_at_ms: timeMs + i * 160,
        start_x_percent: startX,
        drift_x: (Math.random() - 0.5) * 140,
        peak_height_percent: 0.30 + Math.random() * 0.35,
        flight_duration_ms: duration,
        initial_rotation: (Math.random() - 0.5) * 40,
        rotation_speed: (Math.random() > 0.5 ? 1 : -1) * (130 + Math.floor(Math.random() * 120)),
      });
    }

    timeMs += 1600 + Math.floor(Math.random() * 400);
  }

  // Phase 3: 20 - 30s (fast: 8-10 bottles, every 1-1.5s, 2-3 at once sometimes)
  // More gold, 1 more expired (unless first play)
  let expiredCountPhase3 = 0;
  timeMs = 20500;
  while (timeMs < 28500) {
    const spawnMult = Math.random();
    const countToSpawn = spawnMult < 0.3 ? 2 : spawnMult < 0.4 ? 3 : 1;

    for (let i = 0; i < countToSpawn; i++) {
      let type: BottleType = 'pineapple';
      if (!isFirstPlay && expiredCountPhase3 === 0 && Math.random() < 0.3) {
        type = 'expired';
        expiredCountPhase3++;
      } else if (Math.random() < 0.22) {
        type = 'gold';
      } else {
        type = Math.random() < 0.5 ? 'mango' : 'pineapple';
      }

      const duration = isFirstPlay ? 2300 + Math.floor(Math.random() * 200) : 1900 + Math.floor(Math.random() * 300);
      const startX =
        countToSpawn === 3
          ? 0.2 + i * 0.3
          : countToSpawn === 2
          ? i === 0
            ? 0.28
            : 0.72
          : 0.15 + Math.random() * 0.7;

      bottles.push({
        index: currentIndex++,
        type,
        appear_at_ms: timeMs + i * 140,
        start_x_percent: startX,
        drift_x: (Math.random() - 0.5) * 150,
        peak_height_percent: 0.28 + Math.random() * 0.35,
        flight_duration_ms: duration,
        initial_rotation: (Math.random() - 0.5) * 40,
        rotation_speed: (Math.random() > 0.5 ? 1 : -1) * (140 + Math.floor(Math.random() * 130)),
      });
    }

    timeMs += 1200 + Math.floor(Math.random() * 400);
  }

  return bottles;
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

  // 1. Check if already played today (midnight IST)
  const { data: plays } = await adminSupabase
    .from('game_plays')
    .select('*')
    .eq('user_id', user.id)
    .eq('game_type', 'sip_slice')
    .gte('played_at', midnightIST.toISOString())
    .order('played_at', { ascending: false });

  const completedPlay = plays?.find(
    (p) => p.coins_won > 0 || (p.result && p.result.is_completed)
  );

  if (completedPlay) {
    return NextResponse.json(
      {
        error: 'Already played today',
        already_played: true,
        next_available: nextAvailable,
        coins_won: completedPlay.coins_won || 0,
        bottles_sliced: completedPlay.result?.bottles_sliced ?? 0,
        total_bottles: completedPlay.result?.bottles?.length || 20,
      },
      { status: 409 }
    );
  }

  // Check if first ever sip_slice play for this user
  const { count } = await adminSupabase
    .from('game_plays')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('game_type', 'sip_slice')
    .gt('coins_won', 0);

  const isFirstPlay = (count ?? 0) === 0;

  // 2. Generate bottle sequence
  const bottles = generateSequence(isFirstPlay);

  const initialResult = {
    bottles,
    is_first_play: isFirstPlay,
    start_time: new Date().toISOString(),
    is_completed: false,
  };

  const { data: gamePlay, error: insertError } = await adminSupabase
    .from('game_plays')
    .insert({
      user_id: user.id,
      game_type: 'sip_slice',
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
    bottles,
  });
}
