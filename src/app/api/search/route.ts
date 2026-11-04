import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { normalize } from '@/lib/normalize';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get('q');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

  if (!q || q.length < 2) {
    return NextResponse.json(
      { error: 'Query must be at least 2 characters' },
      { status: 400 }
    );
  }

  try {
    const db = getDb();
    const needle = normalize(q);
    const pattern = `%${needle}%`;

    const rows = db.prepare(`
      SELECT * FROM dia_chi_mapping
      WHERE new_commune_name_normalized LIKE ?
         OR old_commune_name_normalized LIKE ?
         OR old_district_name_normalized LIKE ?
         OR new_province_name_normalized LIKE ?
         OR old_province_name_normalized LIKE ?
      LIMIT ?
    `).all(pattern, pattern, pattern, pattern, pattern, limit);

    return NextResponse.json({
      query: q,
      count: rows.length,
      results: rows,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
