import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateLastGamePlayed } from '@/lib/gameUtils';

interface RoundData {
  symbol: number;
  revealed: number;
  match: number;
}

interface SipMatchResult {
  grid: number[];
  round_order: number[];
  rounds_data: RoundData[];
  current_round: number;
  matched_pairs: number[];
  correct_count: number;
  is_completed: boolean;
}

function calculateSipMatchCoins(correctCount: number): number {
  if (correctCount === 8) return 12;
  if (correctCount >= 6) return 8;
  if (correctCount >= 4) return 5;
  if (correctCount >= 2) return 3;
  return 1; // 0 or 1
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { game_id, round, tapped_position } = body;

  if (!game_id || round === undefined) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  const { data: gamePlay, error: fetchErr } = await adminSupabase
    .from('game_plays')
    .select('*')
    .eq('id', game_id)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !gamePlay) {
    return NextResponse.json({ error: 'Game session not found' }, { status: 404 });
  }

  const state = gamePlay.result as SipMatchResult;

  if (state.is_completed) {
    return NextResponse.json({ error: 'Game is already completed' }, { status: 400 });
  }

  const currentRoundIndex = state.current_round;
  if (round !== currentRoundIndex) {
    return NextResponse.json(
      { error: `Invalid round. Expected round ${currentRoundIndex}` },
      { status: 400 }
    );
  }

  const roundInfo = state.rounds_data[currentRoundIndex];
  const targetSymbol = roundInfo.symbol;

  // Check if tap was correct:
  // tapped_position is valid, matches the target symbol, and is not the revealed card itself
  const isCorrect =
    tapped_position !== null &&
    tapped_position !== undefined &&
    tapped_position !== roundInfo.revealed &&
    state.grid[tapped_position] === targetSymbol;

  let coinsForRound = 0;
  let reshufflePositions: [number, number] | null = null;

  if (isCorrect) {
    if (currentRoundIndex <= 2) coinsForRound = 1; // Rounds 1-3
    else if (currentRoundIndex <= 5) coinsForRound = 1; // Rounds 4-6
    else coinsForRound = 2; // Rounds 7-8

    state.matched_pairs.push(targetSymbol);
    state.correct_count += 1;
  } else {
    // WRONG: 2 random un-matched cards swap positions
    const unmatchedIndices = state.grid
      .map((sym, idx) => (state.matched_pairs.includes(sym) ? -1 : idx))
      .filter((idx) => idx !== -1);

    if (unmatchedIndices.length >= 2) {
      const idxA = Math.floor(Math.random() * unmatchedIndices.length);
      let idxB = Math.floor(Math.random() * unmatchedIndices.length);
      while (idxB === idxA) {
        idxB = Math.floor(Math.random() * unmatchedIndices.length);
      }
      const posA = unmatchedIndices[idxA];
      const posB = unmatchedIndices[idxB];

      // Swap in grid
      const temp = state.grid[posA];
      state.grid[posA] = state.grid[posB];
      state.grid[posB] = temp;

      reshufflePositions = [posA, posB];

      // Update future rounds data to reflect new positions of symbols
      for (let r = currentRoundIndex + 1; r < state.rounds_data.length; r++) {
        const sym = state.rounds_data[r].symbol;
        const positions: number[] = [];
        state.grid.forEach((s, i) => {
          if (s === sym) positions.push(i);
        });
        if (positions.length === 2) {
          const wasRev = state.rounds_data[r].revealed;
          if (wasRev === posA) state.rounds_data[r].revealed = posB;
          else if (wasRev === posB) state.rounds_data[r].revealed = posA;

          const wasMatch = state.rounds_data[r].match;
          if (wasMatch === posA) state.rounds_data[r].match = posB;
          else if (wasMatch === posB) state.rounds_data[r].match = posA;
        }
      }
    }
  }

  state.current_round += 1;
  const isGameOver = state.current_round >= 8 || state.matched_pairs.length === 8;

  if (isGameOver) {
    state.is_completed = true;
    const finalCoins = calculateSipMatchCoins(state.correct_count);

    // 1. Insert into coin_ledger
    await adminSupabase.from('coin_ledger').insert({
      user_id: user.id,
      amount: finalCoins,
      source: 'SIP_MATCH',
      description: `Sip Match reward (+${finalCoins} coins)`,
    });

    // 2. Update profiles.last_game_played_at = now()
    await updateLastGamePlayed(user.id);

    // 3. Insert into events
    await adminSupabase.from('events').insert({
      user_id: user.id,
      event_type: 'SIP_MATCH_COMPLETED',
      metadata: {
        correct_count: state.correct_count,
        coins_won: finalCoins,
      },
    });

    // 4. Update game_plays
    await adminSupabase
      .from('game_plays')
      .update({
        coins_won: finalCoins,
        result: state,
      })
      .eq('id', game_id);

    return NextResponse.json({
      correct: isCorrect,
      coins_for_round: coinsForRound,
      reshuffle_positions: reshufflePositions,
      grid: state.grid,
      game_over: true,
      correct_count: state.correct_count,
      coins_won: finalCoins,
    });
  }

  // Update game_plays with intermediate progress
  await adminSupabase
    .from('game_plays')
    .update({
      result: state,
    })
    .eq('id', game_id);

  return NextResponse.json({
    correct: isCorrect,
    coins_for_round: coinsForRound,
    reshuffle_positions: reshufflePositions,
    grid: state.grid,
    game_over: false,
    next_round: state.current_round,
    next_round_data: state.rounds_data[state.current_round],
  });
}
