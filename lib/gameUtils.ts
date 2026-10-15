import { createAdminClient } from '@/lib/supabase/admin';

export function getMidnightIST(): Date {
  const now = new Date();
  // IST is UTC + 5:30 (5.5 hours = 19,800,000 ms)
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);
  const istMidnightUTC = new Date(
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 0, 0, 0)
  );
  return new Date(istMidnightUTC.getTime() - istOffsetMs);
}

export function getNextMidnightIST(): Date {
  const midnight = getMidnightIST();
  return new Date(midnight.getTime() + 24 * 60 * 60 * 1000);
}

export async function hasPlayedGameToday(
  userId: string,
  gameType: string
): Promise<{ played: boolean; nextAvailable: string; coinsWon: number }> {
  const supabaseAdmin = createAdminClient();
  const midnightIST = getMidnightIST();
  const nextAvailable = getNextMidnightIST().toISOString();

  const { data: plays } = await supabaseAdmin
    .from('game_plays')
    .select('coins_won, played_at')
    .eq('user_id', userId)
    .eq('game_type', gameType)
    .gte('played_at', midnightIST.toISOString())
    .order('played_at', { ascending: false })
    .limit(1);

  if (plays && plays.length > 0) {
    return {
      played: true,
      nextAvailable,
      coinsWon: plays[0].coins_won,
    };
  }

  return {
    played: false,
    nextAvailable,
    coinsWon: 0,
  };
}

export async function updateLastGamePlayed(userId: string): Promise<void> {
  const supabaseAdmin = createAdminClient();
  const now = new Date().toISOString();
  await supabaseAdmin
    .from('profiles')
    .update({ last_game_played_at: now })
    .eq('id', userId);
}
