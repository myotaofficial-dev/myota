const fs = require('fs');
const { Client } = require('pg');

const connectionString = 'postgresql://postgres:UpKqbIpxImIGPomr@db.yahlplnvhwvnlumteftn.supabase.co:5432/postgres';

async function main() {
  console.log('Reading allow_anon_writes.sql...');
  const sql = fs.readFileSync('./allow_anon_writes.sql', 'utf8');

  console.log('Connecting to Supabase database...');
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected!');

  try {
    console.log('Executing SQL statements to update RLS policies...');
    await client.query(sql);
    console.log('🎉 RLS Policies successfully updated! Anon clients can now write to all tables.');
  } catch (err) {
    console.error('❌ SQL execution failed:', err);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
