#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

function loadDotEnvIfNeeded() {
  if (process.env.DATABASE_URL) return;
  const candidates = ['.env.local', '.env'];
  for (const fileName of candidates) {
    const filePath = path.resolve(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex <= 0) continue;
      const key = trimmed.slice(0, equalIndex).trim();
      const value = trimmed.slice(equalIndex + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
    if (process.env.DATABASE_URL) return;
  }
}

function parseCsv(csvText) {
  const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(',');
  const expected = ['district_id', 'province', 'city', 'city_geocode', 'district', 'district_geocode', 'lon', 'lat'];
  if (headers.join(',') !== expected.join(',')) {
    throw new Error(`CSV 表头不匹配，期望: ${expected.join(',')}，实际: ${headers.join(',')}`);
  }

  return lines.slice(1).map((line, idx) => {
    const cols = line.split(',');
    if (cols.length < 8) {
      throw new Error(`第 ${idx + 2} 行字段数不足: ${line}`);
    }
    const lon = cols[6] ? Number(cols[6]) : null;
    const lat = cols[7] ? Number(cols[7]) : null;
    return {
      district_id: cols[0].trim(),
      province: cols[1].trim(),
      city: cols[2].trim(),
      city_geocode: cols[3].trim(),
      district: cols[4].trim(),
      district_geocode: cols[5].trim(),
      lon: Number.isFinite(lon) ? lon : null,
      lat: Number.isFinite(lat) ? lat : null,
    };
  });
}

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS weather_districts (
      district_id VARCHAR(12) PRIMARY KEY,
      province VARCHAR(32) NOT NULL,
      city VARCHAR(32) NOT NULL,
      city_geocode VARCHAR(12) NOT NULL,
      district VARCHAR(32) NOT NULL,
      district_geocode VARCHAR(12) NOT NULL,
      lon DOUBLE PRECISION,
      lat DOUBLE PRECISION,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_weather_districts_province ON weather_districts(province)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_weather_districts_city ON weather_districts(city)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_weather_districts_district ON weather_districts(district)`);
}

async function upsertBatch(client, batch) {
  const values = [];
  const placeholders = [];
  for (let i = 0; i < batch.length; i += 1) {
    const item = batch[i];
    const base = i * 8;
    placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, NOW())`);
    values.push(
      item.district_id,
      item.province,
      item.city,
      item.city_geocode,
      item.district,
      item.district_geocode,
      item.lon,
      item.lat
    );
  }

  await client.query(
    `INSERT INTO weather_districts
       (district_id, province, city, city_geocode, district, district_geocode, lon, lat, updated_at)
     VALUES ${placeholders.join(',')}
     ON CONFLICT (district_id) DO UPDATE SET
       province = EXCLUDED.province,
       city = EXCLUDED.city,
       city_geocode = EXCLUDED.city_geocode,
       district = EXCLUDED.district,
       district_geocode = EXCLUDED.district_geocode,
       lon = EXCLUDED.lon,
       lat = EXCLUDED.lat,
       updated_at = NOW()`,
    values
  );
}

async function main() {
  loadDotEnvIfNeeded();

  if (!process.env.DATABASE_URL) {
    throw new Error('未找到 DATABASE_URL，请先配置环境变量或 .env/.env.local');
  }

  const csvPath = path.resolve(process.cwd(), process.argv[2] || 'data/weather_district_id.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV 文件不存在: ${csvPath}`);
  }

  const csvText = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    console.log('CSV 无有效数据，已结束。');
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await ensureTable(client);

    const batchSize = 500;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await upsertBatch(client, batch);
      console.log(`已导入 ${Math.min(i + batchSize, rows.length)}/${rows.length}`);
    }

    await client.query('COMMIT');
    console.log(`导入完成，共 ${rows.length} 条。`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('导入失败:', error instanceof Error ? error.message : error);
  process.exit(1);
});
