const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const connectionString = 'postgresql://postgres:rm%2Bxi8h%40iF7UV9L@db.ooziftqctxziegrrrmdv.supabase.co:5432/postgres';
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database!');
    const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/01_init.sql'), 'utf-8');
    await client.query(sql);
    console.log('Migration executed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

run();
