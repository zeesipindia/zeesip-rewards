const { Client } = require('pg');

async function run() {
  const connectionString = 'postgresql://postgres:rm%2Bxi8h%40iF7UV9L@db.ooziftqctxziegrrrmdv.supabase.co:5432/postgres';
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database!');

    const migrationSql = `
      ALTER TABLE public.coin_ledger DROP CONSTRAINT IF EXISTS coin_ledger_source_check;

      ALTER TABLE public.coin_ledger ADD CONSTRAINT coin_ledger_source_check CHECK (
        source IN (
          'GUEST_SPIN',
          'DAILY_SPIN',
          'SCRATCH',
          'THREE_SIPS',
          'QUICK_SIP',
          'STREAK_BONUS',
          'VERIFIED_BOTTLE',
          'REWARD_REDEMPTION',
          'ADMIN_ADJUSTMENT',
          'TASK_BONUS',
          'PROFILE_BONUS'
        )
      );
    `;

    await client.query(migrationSql);
    console.log('Migration v4 executed successfully! TASK_BONUS and PROFILE_BONUS are now allowed in coin_ledger.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

run();
