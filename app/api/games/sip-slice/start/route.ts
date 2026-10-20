import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMidnightIST, getNextMidnightIST } from '@/lib/gameUtils';
import { ItemType, ItemSpawn } from '@/lib/bottleTypes';

function generateSequence(isFirstPlay: boolean): ItemSpawn[] {
  const items: ItemSpawn[] = [];
  let currentIndex = 0;

  // Phase 1: 0 - 8s (WARMUP: single fruits every 2-2.5s, all mango/pineapple, NO bombs, slow arcs)
  let timeMs = 1200;
  while (timeMs < 7500) {
    const type: ItemType = Math.random() < 0.5 ? 'mango' : 'pineapple';
    const startX = 15 + Math.random() * 70;
    const peak = 35 + Math.random() * 30; // 35% to 65% from top
    const drift = (Math.random() - 0.5) * 20;

    items.push({
      index: currentIndex++,
      type,
      appear_at_ms: Math.round(timeMs),
      start_x_percent: Math.round(startX),
      velocity_x: Number(drift.toFixed(2)),
      velocity_y: -1,
      peak_height_percent: Math.round(peak),
      rotation_speed: (Math.random() > 0.5 ? 1 : -1) * (100 + Math.floor(Math.random() * 120)),
    });
    timeMs += 2000 + Math.floor(Math.random() * 500);
  }

  // Phase 2: 8 - 18s (RAMP UP: 1-2 fruits every 1.5-2s, sometimes pairs. First bomb around second 12. Faster arcs)
  let bombCountPhase2 = 0;
  timeMs = 8500;
  while (timeMs < 17500) {
    const isPair = Math.random() < 0.35;
    const count = isPair ? 2 : 1;
    let hasBombInThisLaunch = false;

    for (let i = 0; i < count; i++) {
      let type: ItemType = Math.random() < 0.5 ? 'mango' : 'pineapple';
      // First bomb appears around second 12 (never before second 10, never on first play)
      if (!isFirstPlay && timeMs >= 11000 && bombCountPhase2 === 0 && !hasBombInThisLaunch) {
        type = 'bomb';
        bombCountPhase2++;
        hasBombInThisLaunch = true;
      }

      const startX = count === 2 ? (i === 0 ? 25 + Math.random() * 15 : 60 + Math.random() * 15) : 15 + Math.random() * 70;
      const peak = 28 + Math.random() * 38;
      const drift = (Math.random() - 0.5) * 26;

      items.push({
        index: currentIndex++,
        type,
        appear_at_ms: Math.round(timeMs + i * 160),
        start_x_percent: Math.round(startX),
        velocity_x: Number(drift.toFixed(2)),
        velocity_y: -1.1,
        peak_height_percent: Math.round(peak),
        rotation_speed: (Math.random() > 0.5 ? 1 : -1) * (120 + Math.floor(Math.random() * 140)),
      });
    }

    timeMs += 1600 + Math.floor(Math.random() * 450);
  }

  // Phase 3: 18 - 30s (INTENSE: 2-3 fruits every 1-1.5s, triple launches, 1-2 more bombs, never 2 bombs at once)
  let bombCountPhase3 = 0;
  timeMs = 18500;
  while (timeMs < 28500) {
    const roll = Math.random();
    const count = roll < 0.35 ? 3 : roll < 0.75 ? 2 : 1;
    let hasBombInThisLaunch = false;

    for (let i = 0; i < count; i++) {
      let type: ItemType = Math.random() < 0.5 ? 'mango' : 'pineapple';
      if (!isFirstPlay && bombCountPhase3 < 2 && !hasBombInThisLaunch && Math.random() < 0.4) {
        type = 'bomb';
        bombCountPhase3++;
        hasBombInThisLaunch = true;
      }

      const startX =
        count === 3
          ? 20 + i * 28 + (Math.random() - 0.5) * 10
          : count === 2
          ? i === 0
            ? 25 + Math.random() * 15
            : 60 + Math.random() * 15
          : 15 + Math.random() * 70;
      const peak = 25 + Math.random() * 42;
      const drift = (Math.random() - 0.5) * 32;

      items.push({
        index: currentIndex++,
        type,
        appear_at_ms: Math.round(timeMs + i * 140),
        start_x_percent: Math.round(startX),
        velocity_x: Number(drift.toFixed(2)),
        velocity_y: -1.2,
        peak_height_percent: Math.round(peak),
        rotation_speed: (Math.random() > 0.5 ? 1 : -1) * (140 + Math.floor(Math.random() * 160)),
      });
    }

    timeMs += 1200 + Math.floor(Math.random() * 400);
  }

  return items;
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
    const resObj = completedPlay.result || {};
    const fruitsSliced = resObj.fruits_sliced ?? resObj.bottles_sliced ?? 0;
    const totalFruits = resObj.total_fruits ?? resObj.total_bottles ?? resObj.items?.length ?? resObj.bottles?.length ?? 24;
    const bombsHit = resObj.bombs_hit ?? 0;

    return NextResponse.json(
      {
        error: 'Already played today',
        already_played: true,
        next_available: nextAvailable,
        coins_won: completedPlay.coins_won || 0,
        fruits_sliced: fruitsSliced,
        total_fruits: totalFruits,
        bombs_hit: bombsHit,
        bottles_sliced: fruitsSliced,
        total_bottles: totalFruits,
        today_result: {
          fruits_sliced: fruitsSliced,
          total_fruits: totalFruits,
          bombs_hit: bombsHit,
          bottles_sliced: fruitsSliced,
          total_bottles: totalFruits,
          coins_won: completedPlay.coins_won || 0,
        },
      },
      { status: 409 }
    );
  }

  // 2. Check if first ever sip_slice play for this user
  const { count } = await adminSupabase
    .from('game_plays')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('game_type', 'sip_slice')
    .gt('coins_won', 0);

  const isFirstPlay = (count ?? 0) === 0;

  // 3. Generate item sequence server-side (~22-28 items)
  const items = generateSequence(isFirstPlay);

  const initialResult = {
    items,
    bottles: items,
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
    items,
    bottles: items,
    is_first_play: isFirstPlay,
  });
}
