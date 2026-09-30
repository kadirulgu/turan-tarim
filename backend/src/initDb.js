import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

const dbName = process.env.PGDATABASE || 'turan_tarim';

const adminClient = new Client({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres123',
  database: 'postgres',
});

async function main() {
  await adminClient.connect();
  const { rows } = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (rows.length === 0) {
    console.log(`"${dbName}" veritabanı oluşturuluyor...`);
    await adminClient.query(`CREATE DATABASE "${dbName}"`);
  } else {
    console.log(`"${dbName}" veritabanı zaten var.`);
  }
  await adminClient.end();

  const dbClient = new Client({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres123',
    database: dbName,
  });
  await dbClient.connect();
  const schema = fs.readFileSync(path.join(__dirname, 'sql', 'schema.sql'), 'utf-8');
  await dbClient.query(schema);
  console.log('Tablolar ve PostGIS uzantısı hazır.');
  await dbClient.end();
}

main().catch((err) => {
  console.error('Kurulum hatası:', err);
  process.exit(1);
});
