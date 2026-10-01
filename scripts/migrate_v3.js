const { Client } = require('pg');

async function run() {
  const connectionString = 'postgresql://postgres:rm%2Bxi8h%40iF7UV9L@db.ooziftqctxziegrrrmdv.supabase.co:5432/postgres';
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database!');
    
    const migrationSql = `
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

      DROP POLICY IF EXISTS "Users can read own game plays" ON public.game_plays;
      CREATE POLICY "Users can read own game plays" ON public.game_plays FOR SELECT USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Server can insert game plays" ON public.game_plays;
      CREATE POLICY "Server can insert game plays" ON public.game_plays FOR INSERT WITH CHECK (true);
    `;

    await client.query(migrationSql);
    console.log('Database migration 03 (game_plays) executed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

run();
