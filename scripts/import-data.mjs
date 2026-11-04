/**
 * Import data from Cas AddressKit API into SQLite database.
 *
 * Usage: node scripts/import-data.mjs
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'dia-chinh.db');
const BASE_URL = 'https://production.cas.so/address-kit';
const DATE_NEW = '2025-07-01';
const DATE_OLD = '2025-06-30';

function removeDiacritics(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function norm(str) {
  return removeDiacritics(str || '').toLowerCase().trim();
}

async function fetchJson(url) {
  console.log(`  Fetching: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function main() {
  console.log('=== Dia Chinh Import Tool ===\n');

  // Ensure data directory exists
  const dataDir = dirname(DB_PATH);
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  // Open DB (writable)
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Create schema
  db.exec(`
    DROP TABLE IF EXISTS dia_chi_mapping;
    CREATE TABLE dia_chi_mapping (
      commune_code TEXT PRIMARY KEY,
      new_commune_name TEXT,
      new_province_code TEXT,
      new_province_name TEXT,
      old_commune_name TEXT,
      old_district_code TEXT,
      old_district_name TEXT,
      old_province_code TEXT,
      old_province_name TEXT,
      new_commune_name_normalized TEXT,
      new_province_name_normalized TEXT,
      old_commune_name_normalized TEXT,
      old_district_name_normalized TEXT,
      old_province_name_normalized TEXT
    );
  `);

  // Step 1: Fetch NEW system (2025-07-01) - 34 provinces, 2 levels
  console.log(`\n[1/4] Fetching NEW provinces (${DATE_NEW})...`);
  const newProvData = await fetchJson(`${BASE_URL}/${DATE_NEW}/provinces`);
  const newProvinces = newProvData.provinces || newProvData;
  console.log(`  Found ${newProvinces.length} provinces`);

  const newCommunes = new Map();

  console.log(`\n[2/4] Fetching NEW communes for each province...`);
  for (const prov of newProvinces) {
    const data = await fetchJson(`${BASE_URL}/${DATE_NEW}/provinces/${prov.code}/communes`);
    const communes = data.communes || data;
    for (const c of communes) {
      newCommunes.set(String(c.code), {
        commune_code: String(c.code),
        new_commune_name: c.name,
        new_province_code: String(prov.code),
        new_province_name: prov.name,
      });
    }
    process.stdout.write(`  ${prov.name}: ${communes.length} communes\n`);
  }
  console.log(`  Total NEW communes: ${newCommunes.size}`);

  // Step 2: Fetch OLD system (2025-06-30) - 63 provinces, 3 levels
  console.log(`\n[3/4] Fetching OLD provinces (${DATE_OLD})...`);
  const oldProvData = await fetchJson(`${BASE_URL}/${DATE_OLD}/provinces`);
  const oldProvinces = oldProvData.provinces || oldProvData;
  console.log(`  Found ${oldProvinces.length} provinces`);

  const oldCommunes = new Map();

  console.log(`\n[4/4] Fetching OLD communes for each province...`);
  for (const prov of oldProvinces) {
    const data = await fetchJson(`${BASE_URL}/${DATE_OLD}/provinces/${prov.code}/communes`);
    const communes = data.communes || data;
    for (const c of communes) {
      oldCommunes.set(String(c.code), {
        commune_code: String(c.code),
        old_commune_name: c.name,
        old_district_code: c.districtCode ? String(c.districtCode) : null,
        old_district_name: c.districtName || null,
        old_province_code: String(prov.code),
        old_province_name: prov.name,
      });
    }
    process.stdout.write(`  ${prov.name}: ${communes.length} communes\n`);
  }
  console.log(`  Total OLD communes: ${oldCommunes.size}`);

  // Step 3: Merge and insert
  console.log('\nMerging data...');
  const allCodes = new Set([...newCommunes.keys(), ...oldCommunes.keys()]);
  console.log(`  Unique commune codes: ${allCodes.size}`);

  const insert = db.prepare(`
    INSERT OR REPLACE INTO dia_chi_mapping
    (commune_code, new_commune_name, new_province_code, new_province_name,
     old_commune_name, old_district_code, old_district_name, old_province_code, old_province_name,
     new_commune_name_normalized, new_province_name_normalized,
     old_commune_name_normalized, old_district_name_normalized, old_province_name_normalized)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((codes) => {
    for (const code of codes) {
      const n = newCommunes.get(code) || {};
      const o = oldCommunes.get(code) || {};
      insert.run(
        code,
        n.new_commune_name || null,
        n.new_province_code || null,
        n.new_province_name || null,
        o.old_commune_name || null,
        o.old_district_code || null,
        o.old_district_name || null,
        o.old_province_code || null,
        o.old_province_name || null,
        n.new_commune_name ? norm(n.new_commune_name) : null,
        n.new_province_name ? norm(n.new_province_name) : null,
        o.old_commune_name ? norm(o.old_commune_name) : null,
        o.old_district_name ? norm(o.old_district_name) : null,
        o.old_province_name ? norm(o.old_province_name) : null,
      );
    }
  });

  insertMany([...allCodes]);

  // Create search indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_new_province ON dia_chi_mapping(new_province_code);
    CREATE INDEX IF NOT EXISTS idx_old_province ON dia_chi_mapping(old_province_code);
    CREATE INDEX IF NOT EXISTS idx_old_district ON dia_chi_mapping(old_district_code);
    CREATE INDEX IF NOT EXISTS idx_new_commune_norm ON dia_chi_mapping(new_commune_name_normalized);
    CREATE INDEX IF NOT EXISTS idx_old_commune_norm ON dia_chi_mapping(old_commune_name_normalized);
  `);

  // Stats
  const total = db.prepare('SELECT COUNT(*) as cnt FROM dia_chi_mapping').get();
  const bothSystems = db.prepare('SELECT COUNT(*) as cnt FROM dia_chi_mapping WHERE new_commune_name IS NOT NULL AND old_commune_name IS NOT NULL').get();
  const newOnly = db.prepare('SELECT COUNT(*) as cnt FROM dia_chi_mapping WHERE new_commune_name IS NOT NULL AND old_commune_name IS NULL').get();
  const oldOnly = db.prepare('SELECT COUNT(*) as cnt FROM dia_chi_mapping WHERE new_commune_name IS NULL AND old_commune_name IS NOT NULL').get();

  console.log(`\n=== Import Complete ===`);
  console.log(`Total records:    ${total.cnt}`);
  console.log(`Both systems:     ${bothSystems.cnt}`);
  console.log(`New only:         ${newOnly.cnt}`);
  console.log(`Old only:         ${oldOnly.cnt}`);
  console.log(`Database saved:   ${DB_PATH}`);

  db.close();
}

main().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
