import { NextResponse } from 'next/server';
import { getExpiredData } from '@/services/retention.service';

/**
 * GET /api/data-lifecycle/retention
 * Returns retention policies and expired record counts.
 */
export async function GET() {
  try {
    const data = await getExpiredData();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in /api/data-lifecycle/retention:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
