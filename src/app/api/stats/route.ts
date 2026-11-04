import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'dia-chinh.db');

function getStatsDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_stats (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_visits INTEGER DEFAULT 0,
      total_conversions INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO site_stats (id, total_visits, total_conversions) VALUES (1, 0, 0);
  `);
  return db;
}

export async function GET() {
  const db = getStatsDb();
  try {
    const stats = db.prepare('SELECT total_visits, total_conversions, updated_at FROM site_stats WHERE id = 1').get() as {
      total_visits: number;
      total_conversions: number;
      updated_at: string;
    };
    return NextResponse.json(stats);
  } finally {
    db.close();
  }
}

export async function POST(request: NextRequest) {
  const { type } = await request.json().catch(() => ({ type: 'visit' }));
  const db = getStatsDb();
  try {
    if (type === 'conversion') {
      db.prepare("UPDATE site_stats SET total_conversions = total_conversions + 1, updated_at = datetime('now') WHERE id = 1").run();
    } else {
      db.prepare("UPDATE site_stats SET total_visits = total_visits + 1, updated_at = datetime('now') WHERE id = 1").run();
    }
    const stats = db.prepare('SELECT total_visits, total_conversions FROM site_stats WHERE id = 1').get();
    return NextResponse.json(stats);
  } finally {
    db.close();
  }
}
