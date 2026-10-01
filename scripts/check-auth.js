const { Client } = require('pg');

async function test() {
  const connectionString = 'postgresql://postgres:rm%2Bxi8h%40iF7UV9L@db.ooziftqctxziegrrrmdv.supabase.co:5432/postgres';
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'auth';
    `);
    console.log('Auth tables:', tables.rows.map(r => r.table_name));

    // Check pg_settings for jwt
    const jwtSecret = await client.query(`SHOW "app.settings.jwt_secret";`).catch(() => null);
    if (jwtSecret) console.log('JWT Secret setting:', jwtSecret.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

test();
