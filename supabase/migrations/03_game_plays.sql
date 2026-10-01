-- Three Sips game table migration
CREATE TABLE IF NOT EXISTS public.game_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_type text NOT NULL,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  coins_won integer NOT NULL DEFAULT 0,
  played_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_game_plays_user_game ON public.game_plays(user_id, game_type, played_at DESC);

ALTER TABLE public.game_plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own game plays" ON public.game_plays FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Server can insert game plays" ON public.game_plays FOR INSERT WITH CHECK (true);
