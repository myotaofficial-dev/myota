const fs = require('fs');
const { Client } = require('pg');

const connectionString = 'postgresql://postgres:UpKqbIpxImIGPomr@db.yahlplnvhwvnlumteftn.supabase.co:5432/postgres';

async function main() {
  console.log('Reading seed.sql...');
  const sql = fs.readFileSync('./seed.sql', 'utf8');

  console.log('Connecting to Supabase database...');
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected!');

  try {
    console.log('Executing seed SQL script...');
    await client.query(sql);
    console.log('🎉 Database successfully seeded with Sri K Residency and Grandlake Resorts!');
  } catch (err) {
    console.error('❌ Database seeding failed:', err);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
