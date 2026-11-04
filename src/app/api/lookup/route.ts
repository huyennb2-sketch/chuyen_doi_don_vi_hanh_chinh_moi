import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json(
      { error: 'Missing required parameter: code' },
      { status: 400 }
    );
  }

  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM dia_chi_mapping WHERE commune_code = ?').get(code);

    if (!row) {
      return NextResponse.json(
        { error: 'Commune code not found', code },
        { status: 404 }
      );
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error('Lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
