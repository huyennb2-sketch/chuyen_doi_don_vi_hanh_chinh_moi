import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'dia-chinh.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH, { readonly: true });
    _db.pragma('journal_mode = WAL');
  }
  return _db;
}

export function getWritableDb(): Database.Database {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  return db;
}

export function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS dia_chi_mapping (
      commune_code TEXT PRIMARY KEY,
      new_commune_name TEXT,
      new_province_code TEXT,
      new_province_name TEXT,
      old_commune_name TEXT,
      old_district_code TEXT,
      old_district_name TEXT,
      old_province_code TEXT,
      old_province_name TEXT,
      -- Normalized (no diacritics, lowercase) for search
      new_commune_name_normalized TEXT,
      new_province_name_normalized TEXT,
      old_commune_name_normalized TEXT,
      old_district_name_normalized TEXT,
      old_province_name_normalized TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_new_province ON dia_chi_mapping(new_province_code);
    CREATE INDEX IF NOT EXISTS idx_old_province ON dia_chi_mapping(old_province_code);
    CREATE INDEX IF NOT EXISTS idx_old_district ON dia_chi_mapping(old_district_code);
  `);
}
