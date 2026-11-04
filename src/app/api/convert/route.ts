import { NextRequest, NextResponse } from 'next/server';
import { convertAddress } from '@/lib/address-parser';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const text = searchParams.get('text');
  const direction = searchParams.get('direction') as 'new_to_old' | 'old_to_new' | null;

  if (!text) {
    return NextResponse.json(
      { error: 'Missing required parameter: text' },
      { status: 400 }
    );
  }

  if (!direction || !['new_to_old', 'old_to_new'].includes(direction)) {
    return NextResponse.json(
      { error: 'Invalid direction. Use "new_to_old" or "old_to_new"' },
      { status: 400 }
    );
  }

  try {
    const result = convertAddress(text, direction);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Convert error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
