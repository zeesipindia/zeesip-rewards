import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMidnightIST, getNextMidnightIST } from '@/lib/gameUtils';
import { BottleType, BottleSpawn } from '@/lib/bottleTypes';

function generateSequence(isFirstPlay: boolean): BottleSpawn[] {
  const bottles: BottleSpawn[] = [];
  let currentIndex = 0;

  // Phase 1: 0 - 10s (warmup: 4 bottles, every ~2.5s)
  // No expired bottles. 0-1 gold bottle.
  let timeMs = 1200;
  let goldInPhase1 = false;
  while (timeMs < 9500) {
    const isGold = !goldInPhase1 && Math.random() < 0.2;
    if (isGold) goldInPhase1 = true;
    const type: BottleType = isGold ? 'gold' : Math.random() < 0.5 ? 'mango' : 'pineapple';
    const startX = 15 + Math.random() * 70;
    const peak = 35 + Math.random() * 30; // 35% to 65% from top
    const drift = (Math.random() - 0.5) * 20;

    bottles.push({
      index: currentIndex++,
      type,
      appear_at_ms: Math.round(timeMs),
      start_x_percent: Math.round(startX),
      velocity_x: Number(drift.toFixed(2)),
      velocity_y: -1, // normalized upward impulse
      peak_height_percent: Math.round(peak),
      rotation_speed: (Math.random() > 0.5 ? 1 : -1) * (100 + Math.floor(Math.random() * 100)),
    });
    timeMs += 2200 + Math.floor(Math.random() * 500);
  }

  // Phase 2: 10 - 20s (medium: 1-2 bottles every 1.5-2s, sometimes pairs)
  // 1 gold, 1 expired (if not first play)
  let expiredCountPhase2 = 0;
  let goldCountPhase2 = 0;
  timeMs = 10500;
  while (timeMs < 19500) {
    const isPair = Math.random() < 0.3;
    const count = isPair ? 2 : 1;

    for (let i = 0; i < count; i++) {
      let type: BottleType = 'mango';
      if (!isFirstPlay && expiredCountPhase2 === 0 && Math.random() < 0.4) {
        type = 'expired';
        expiredCountPhase2++;
      } else if (goldCountPhase2 === 0 && Math.random() < 0.35) {
        type = 'gold';
        goldCountPhase2++;
      } else {
        type = Math.random() < 0.5 ? 'mango' : 'pineapple';
      }

      const startX = count === 2 ? (i === 0 ? 25 + Math.random() * 15 : 60 + Math.random() * 15) : 15 + Math.random() * 70;
      const peak = 30 + Math.random() * 35;
      const drift = (Math.random() - 0.5) * 25;

      bottles.push({
        index: currentIndex++,
        type,
        appear_at_ms: Math.round(timeMs + i * 180),
        start_x_percent: Math.round(startX),
        velocity_x: Number(drift.toFixed(2)),
        velocity_y: -1.1,
        peak_height_percent: Math.round(peak),
        rotation_speed: (Math.random() > 0.5 ? 1 : -1) * (120 + Math.floor(Math.random() * 120)),
      });
    }

    timeMs += 1600 + Math.floor(Math.random() * 500);
  }

  // Phase 3: 20 - 30s (fast: 2-3 bottles every 1-1.5s, fast arcs, more gold & expired)
  let expiredCountPhase3 = 0;
  let goldCountPhase3 = 0;
  timeMs = 20500;
  while (timeMs < 28500) {
    const roll = Math.random();
    const count = roll < 0.35 ? 3 : roll < 0.7 ? 2 : 1;

    for (let i = 0; i < count; i++) {
      let type: BottleType = 'pineapple';
      if (!isFirstPlay && expiredCountPhase3 === 0 && Math.random() < 0.45) {
        type = 'expired';
        expiredCountPhase3++;
      } else if (goldCountPhase3 < 2 && Math.random() < 0.3) {
        type = 'gold';
        goldCountPhase3++;
      } else {
        type = Math.random() < 0.5 ? 'mango' : 'pineapple';
      }

      const startX =
        count === 3
          ? 20 + i * 28 + (Math.random() - 0.5) * 10
          : count === 2
          ? i === 0
            ? 25 + Math.random() * 15
            : 60 + Math.random() * 15
          : 15 + Math.random() * 70;
      const peak = 28 + Math.random() * 38;
      const drift = (Math.random() - 0.5) * 30;

      bottles.push({
        index: currentIndex++,
        type,
        appear_at_ms: Math.round(timeMs + i * 150),
        start_x_percent: Math.round(startX),
        velocity_x: Number(drift.toFixed(2)),
        velocity_y: -1.2,
        peak_height_percent: Math.round(peak),
        rotation_speed: (Math.random() > 0.5 ? 1 : -1) * (140 + Math.floor(Math.random() * 140)),
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
        total_bottles: completedPlay.result?.bottles?.length || 22,
        today_result: {
          bottles_sliced: completedPlay.result?.bottles_sliced ?? 0,
          total_bottles: completedPlay.result?.bottles?.length || 22,
          coins_won: completedPlay.coins_won || 0,
        },
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
    is_first_play: isFirstPlay,
  });
}
