/**
 * Recommendations API Route
 * GET - Fetch user recommendations and admin insights
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthContext, isInternRole } from '@/lib/phase6/auth-context';
import { getUserRecommendations, getAdminInsights } from '@/services/recommendation.service';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getServerAuthContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'insights' && !isInternRole(ctx.roleName)) {
      const insights = await getAdminInsights(ctx.organizationId);
      return NextResponse.json({ insights });
    }

    const recommendations = await getUserRecommendations(ctx.userId);
    return NextResponse.json({ recommendations });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch recommendations' },
      { status: error.statusCode || 500 }
    );
  }
}
