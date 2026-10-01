import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(req: NextRequest) {
  const serverSupabase = await createClient();
  const { data: { user }, error: authError } = await serverSupabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { game_id, picked_position } = body;

  if (!game_id || picked_position === undefined || picked_position === null) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();

  const { data: game, error: fetchError } = await supabaseAdmin
    .from('game_plays')
    .select('*')
    .eq('id', game_id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !game) {
    return NextResponse.json({ error: 'Game session not found' }, { status: 404 });
  }

  if (game.result?.picked !== null && game.result?.picked !== undefined) {
    return NextResponse.json({ error: 'Already picked for this game' }, { status: 409 });
  }

  const winningPosition = Number(game.result?.winning_position ?? 0);
  const potentialCoins = Number(game.result?.coins ?? 0);
  const pickedPos = Number(picked_position);

  const actualCoins = pickedPos === winningPosition ? potentialCoins : 0;
  const nextAvailableISO = getMidnightISTNextAvailable();

  // Update game_plays
  const updatedResult = {
    ...game.result,
    picked: pickedPos,
  };

  await supabaseAdmin
    .from('game_plays')
    .update({
      result: updatedResult,
      coins_won: actualCoins,
    })
    .eq('id', game_id);

  if (actualCoins > 0) {
    await supabaseAdmin.from('coin_ledger').insert({
      user_id: user.id,
      amount: actualCoins,
      source: 'PICK_KULKKI',
      description: `Pick the Kulkki reward (+${actualCoins} coins)`,
    });
  }

  await supabaseAdmin.from('events').insert({
    user_id: user.id,
    event_type: 'PICK_KULKKI_COMPLETED',
    metadata: { coins_won: actualCoins, picked_position: pickedPos, winning_position: winningPosition },
  });

  return NextResponse.json({
    winning_position: winningPosition,
    picked_position: pickedPos,
    coins_won: actualCoins,
    next_available: nextAvailableISO,
  });
}
