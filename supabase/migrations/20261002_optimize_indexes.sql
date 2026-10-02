-- Performance indexes for fast query execution on user balances, game plays, and profiles

CREATE INDEX IF NOT EXISTS idx_coin_ledger_user_sum ON public.coin_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_game_plays_user_today ON public.game_plays(user_id, game_type, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
