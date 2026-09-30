import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// DATE sütunlarını JS Date yerine "YYYY-AA-GG" metni olarak döndür. Aksi halde
// node-pg yerel gece yarısına çevirir, JSON'a UTC olarak yazılınca tarih bir gün
// geri kayar (örn. 21 Eylül -> "2026-09-20T21:00:00.000Z").
pg.types.setTypeParser(pg.types.builtins.DATE, (deger) => deger);

export const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres123',
  database: process.env.PGDATABASE || 'turan_tarim',
});
