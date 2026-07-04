const fs = require('fs');
const { Client } = require('pg');

const connectionString = 'postgresql://postgres:UpKqbIpxImIGPomr@db.yahlplnvhwvnlumteftn.supabase.co:5432/postgres';

async function main() {
  console.log('Reading properties_owners.sql...');
  const sql = fs.readFileSync('./properties_owners.sql', 'utf8');

  console.log('Connecting to Supabase database...');
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected!');

  try {
    console.log('Executing owners migration SQL...');
    await client.query(sql);
    console.log('🎉 Owners table successfully created and properties linked!');
  } catch (err) {
    console.error('❌ Migration execution failed:', err);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
