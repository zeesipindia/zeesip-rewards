const { Client } = require('pg');

async function run() {
  const connectionString = 'postgresql://postgres:rm%2Bxi8h%40iF7UV9L@db.ooziftqctxziegrrrmdv.supabase.co:5432/postgres';
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database!');

    const sql = `
      -- Delete ALL coin_ledger entries for ALL users
      DELETE FROM coin_ledger;

      -- Delete ALL game_plays entries
      DELETE FROM game_plays;

      -- Delete ALL guest_sessions
      DELETE FROM guest_sessions;

      -- Reset all users' last_game_played_at to now (so the 14-day expiry timer starts fresh from today)
      UPDATE profiles SET last_game_played_at = now();

      -- Reset completed_tasks for all users
      UPDATE profiles SET completed_tasks = '{}'::jsonb;
    `;

    await client.query(sql);
    console.log('Clean slate SQL executed successfully!');

    // Verify row counts
    const ledgerRes = await client.query('SELECT count(*) FROM coin_ledger');
    const playsRes = await client.query('SELECT count(*) FROM game_plays');
    const guestsRes = await client.query('SELECT count(*) FROM guest_sessions');
    const profilesRes = await client.query('SELECT count(*), count(last_game_played_at) FROM profiles');

    console.log('Verification:');
    console.log('coin_ledger rows:', ledgerRes.rows[0].count);
    console.log('game_plays rows:', playsRes.rows[0].count);
    console.log('guest_sessions rows:', guestsRes.rows[0].count);
    console.log('profiles total & with last_game_played_at:', profilesRes.rows[0]);
  } catch (err) {
    console.error('Database query error:', err);
  } finally {
    await client.end();
  }
}

run();
