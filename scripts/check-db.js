const { Client } = require('pg');

async function test() {
  const connectionString = 'postgresql://postgres:rm%2Bxi8h%40iF7UV9L@db.ooziftqctxziegrrrmdv.supabase.co:5432/postgres';
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected!');
    const res = await client.query(`
      SELECT schema_name FROM information_schema.schemata;
    `);
    console.log('Schemas:', res.rows.map(r => r.schema_name));
    
    // Check vault or auth tables if accessible
    try {
      const keys = await client.query(`SELECT * FROM vault.secrets;`);
      console.log('Secrets:', keys.rows);
    } catch(e) {
      console.log('Vault error:', e.message);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

test();
