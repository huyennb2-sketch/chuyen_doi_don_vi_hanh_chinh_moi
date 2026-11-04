import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const system = searchParams.get('system') || 'both';

  try {
    const db = getDb();

    if (system === 'new') {
      const rows = db.prepare(`
        SELECT DISTINCT new_province_code as code, new_province_name as name
        FROM dia_chi_mapping
        WHERE new_province_code IS NOT NULL
        ORDER BY new_province_code
      `).all();
      return NextResponse.json({ system: 'new', count: rows.length, provinces: rows });
    }

    if (system === 'old') {
      const rows = db.prepare(`
        SELECT DISTINCT old_province_code as code, old_province_name as name
        FROM dia_chi_mapping
        WHERE old_province_code IS NOT NULL
        ORDER BY old_province_code
      `).all();
      return NextResponse.json({ system: 'old', count: rows.length, provinces: rows });
    }

    const newProvs = db.prepare(`
      SELECT DISTINCT new_province_code as code, new_province_name as name
      FROM dia_chi_mapping
      WHERE new_province_code IS NOT NULL
      ORDER BY new_province_code
    `).all();

    const oldProvs = db.prepare(`
      SELECT DISTINCT old_province_code as code, old_province_name as name
      FROM dia_chi_mapping
      WHERE old_province_code IS NOT NULL
      ORDER BY old_province_code
    `).all();

    return NextResponse.json({
      new_system: { count: newProvs.length, provinces: newProvs },
      old_system: { count: oldProvs.length, provinces: oldProvs },
    });
  } catch (error) {
    console.error('Provinces error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
