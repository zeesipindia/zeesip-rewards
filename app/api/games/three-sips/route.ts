import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Symbol Indices:
// 0: Mango, 1: Pineapple, 2: Coin, 3: Logo, 4: Water
const SYMBOL_NAMES = ['mango', 'pineapple', 'coin', 'logo', 'water'];

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
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
  }

  const supabaseAdmin = createAdminClient();
  const todayStartISO = getTodayISTStartISO();
  const nextAvailableISO = getMidnightISTNextAvailable();

  // Check if user played three-sips today
  const { data: todayPlays } = await supabaseAdmin
    .from('game_plays')
    .select('played_at')
    .eq('user_id', user.id)
    .eq('game_type', 'three_sips')
    .gte('played_at', todayStartISO);

  if (todayPlays && todayPlays.length > 0) {
    return NextResponse.json(
      {
        error: 'You have already played Three Sips today. Come back tomorrow!',
        next_available: nextAvailableISO,
      },
      { status: 409 }
    );
  }

  // Fetch user's previous plays for psychology rules
  const { data: pastPlaysData } = await supabaseAdmin
    .from('game_plays')
    .select('coins_won, played_at')
    .eq('user_id', user.id)
    .eq('game_type', 'three_sips')
    .order('played_at', { ascending: false })
    .limit(3);

  const pastPlays = (pastPlaysData || []) as GamePlayRow[];
  const isFirstPlay = pastPlays.length === 0;
  const lastTwoWereZero = pastPlays.length >= 2 && pastPlays[0].coins_won === 0 && pastPlays[1].coins_won === 0;

  // Psychology rule: First play or 2 consecutive zero losses forces a win (no 0 allowed)
  const forceWin = isFirstPlay || lastTwoWereZero;

  // Outcome categories with probabilities
  // 3x logo: 1%, 3x coin: 4%, 3x mango: 8%, 3x pineapple: 8%, 3x water: 9%, 2x match: 30%, no match: 40%
  let categories = [
    { type: 'jackpot_logo', prob: 0.01, coins: 50, payoutType: 'jackpot' },
    { type: 'triple_coin', prob: 0.04, coins: 35, payoutType: 'triple' },
    { type: 'triple_mango', prob: 0.08, coins: 25, payoutType: 'triple' },
    { type: 'triple_pineapple', prob: 0.08, coins: 25, payoutType: 'triple' },
    { type: 'triple_water', prob: 0.09, coins: 10, payoutType: 'triple' },
    { type: 'double_match', prob: 0.30, coins: 5, payoutType: 'double' },
    { type: 'no_match', prob: 0.40, coins: 0, payoutType: 'none' },
  ];

  if (forceWin) {
    categories = categories.filter((c) => c.coins > 0);
  }

  const totalProb = categories.reduce((sum, c) => sum + c.prob, 0);
  let rand = Math.random() * totalProb;
  let chosenCategory = categories[0];

  for (const cat of categories) {
    if (rand <= cat.prob) {
      chosenCategory = cat;
      break;
    }
    rand -= cat.prob;
  }

  let symbols: [number, number, number] = [0, 0, 0];
  const coinsWon = chosenCategory.coins;
  const payoutType = chosenCategory.payoutType;

  switch (chosenCategory.type) {
    case 'jackpot_logo':
      symbols = [3, 3, 3];
      break;
    case 'triple_coin':
      symbols = [2, 2, 2];
      break;
    case 'triple_mango':
      symbols = [0, 0, 0];
      break;
    case 'triple_pineapple':
      symbols = [1, 1, 1];
      break;
    case 'triple_water':
      symbols = [4, 4, 4];
      break;
    case 'double_match': {
      const matchSym = Math.floor(Math.random() * 5);
      let diffSym = Math.floor(Math.random() * 5);
      while (diffSym === matchSym) {
        diffSym = Math.floor(Math.random() * 5);
      }
      const diffPos = Math.floor(Math.random() * 3);
      const arr: [number, number, number] = [matchSym, matchSym, matchSym];
      arr[diffPos] = diffSym;
      symbols = arr;
      break;
    }
    case 'no_match': {
      const pool = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);
      symbols = [pool[0], pool[1], pool[2]];
      break;
    }
  }

  const playedAt = new Date().toISOString();

  await supabaseAdmin.from('game_plays').insert({
    user_id: user.id,
    game_type: 'three_sips',
    result: { symbols, payout_type: payoutType },
    coins_won: coinsWon,
    played_at: playedAt,
  });

  if (coinsWon > 0) {
    const symbolText = `${SYMBOL_NAMES[symbols[0]]} ${SYMBOL_NAMES[symbols[1]]} ${SYMBOL_NAMES[symbols[2]]}`;
    await supabaseAdmin.from('coin_ledger').insert({
      user_id: user.id,
      amount: coinsWon,
      source: 'THREE_SIPS',
      description: `Three Sips reward (${symbolText})`,
    });
  }

  await supabaseAdmin.from('events').insert({
    user_id: user.id,
    event_type: 'THREE_SIPS_COMPLETED',
    metadata: { coins_won: coinsWon, symbols },
  });

  return NextResponse.json({
    symbols,
    coins_won: coinsWon,
    payout_type: payoutType,
    next_available: nextAvailableISO,
  });
}
