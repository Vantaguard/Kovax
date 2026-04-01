import { NextRequest, NextResponse } from 'next/server';
import { getActivityLogs } from '@/services/log.service';
import { withSecurity } from '@/lib/security/middleware';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { createClient } from '@/lib/supabase/server';

async function handler(request: NextRequest) {
  // Auth + admin permission check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin — only admins/mentors can view activity logs
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const entity_type = searchParams.get('entity_type') || undefined;

  const logs = await getActivityLogs({
    page,
    limit,
    entity_type,
  });

  return NextResponse.json(logs);
}

export const GET = withSecurity(handler, {
  rateLimit: RATE_LIMITS.api,
});
