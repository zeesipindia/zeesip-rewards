import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasPlayedGameToday } from '@/lib/gameUtils';
import { BottleType, BottleSpawn } from '@/lib/bottleTypes';

function generateSequence(): BottleSpawn[] {
  const bottles: BottleSpawn[] = [];
  let currentIndex = 0;

  // Phase 1: 0 - 10s (warmup: 4-5 bottles, every 2-2.5s)
  // No expired bottles. 0-1 gold bottle.
  let timeMs = 1500;
  while (timeMs < 9500) {
    const isGold = Math.random() < 0.15;
    const type: BottleType = isGold ? 'gold' : Math.random() < 0.5 ? 'mango' : 'pineapple';
    bottles.push({
      index: currentIndex++,
      type,
      appear_at_ms: timeMs,
      start_x: 20 + Math.floor(Math.random() * 60),
      arc_height: 60 + Math.floor(Math.random() * 20),
      speed: 2100 + Math.floor(Math.random() * 300),
    });
    timeMs += 2000 + Math.floor(Math.random() * 500);
  }

  // Phase 2: 10 - 20s (medium: 6-7 bottles, every 1.5-2s, sometimes 2 at once)
  // 1 expired bottle guaranteed here
  let expiredCountPhase2 = 0;
  timeMs = 10500;
  while (timeMs < 19500) {
    const spawnDouble = Math.random() < 0.25;
    const countToSpawn = spawnDouble ? 2 : 1;

    for (let i = 0; i < countToSpawn; i++) {
      let type: BottleType = 'mango';
      if (expiredCountPhase2 === 0 && Math.random() < 0.35) {
        type = 'expired';
        expiredCountPhase2++;
      } else if (Math.random() < 0.18) {
        type = 'gold';
      } else {
        type = Math.random() < 0.5 ? 'mango' : 'pineapple';
      }

      bottles.push({
        index: currentIndex++,
        type,
        appear_at_ms: timeMs + (i * 150),
        start_x: countToSpawn === 2 ? (i === 0 ? 25 : 75) : 15 + Math.floor(Math.random() * 70),
        arc_height: 58 + Math.floor(Math.random() * 22),
        speed: 2000 + Math.floor(Math.random() * 300),
      });
    }

    timeMs += 1600 + Math.floor(Math.random() * 400);
  }

  // Phase 3: 20 - 30s (fast: 7-8 bottles, every 1-1.5s, sometimes 2 at once)
  // 1 expired bottle guaranteed here
  let expiredCountPhase3 = 0;
  timeMs = 20500;
  while (timeMs < 28500) {
    const spawnDouble = Math.random() < 0.3;
    const countToSpawn = spawnDouble ? 2 : 1;

    for (let i = 0; i < countToSpawn; i++) {
      let type: BottleType = 'pineapple';
      if (expiredCountPhase3 === 0 && Math.random() < 0.35) {
        type = 'expired';
        expiredCountPhase3++;
      } else if (Math.random() < 0.18) {
        type = 'gold';
      } else {
        type = Math.random() < 0.5 ? 'mango' : 'pineapple';
      }

      bottles.push({
        index: currentIndex++,
        type,
        appear_at_ms: timeMs + (i * 150),
        start_x: countToSpawn === 2 ? (i === 0 ? 25 : 75) : 15 + Math.floor(Math.random() * 70),
        arc_height: 60 + Math.floor(Math.random() * 20),
        speed: 1900 + Math.floor(Math.random() * 300),
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

  // 1. Check if already played today (midnight IST)
  const status = await hasPlayedGameToday(user.id, 'sip_slice');
  if (status.played) {
    return NextResponse.json(
      { error: 'Already played today', next_available: status.nextAvailable },
      { status: 409 }
    );
  }

  // 2. Generate bottle sequence
  const bottles = generateSequence();

  const adminSupabase = createAdminClient();

  const initialResult = {
    bottles,
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
