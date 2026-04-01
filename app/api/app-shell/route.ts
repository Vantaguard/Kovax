import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMergedUiConfig } from '@/services/config.service';
import { getAllFeatureTogglesForOrg } from '@/services/feature-toggle.service';
import { getPermissionsForUser } from '@/services/permission.service';
import { withSecurity } from '@/lib/security/middleware';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/**
 * Single endpoint for client shell: merged UI config, feature toggles, effective permissions.
 */
async function handler(_req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: userRow, error: uErr } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .eq('is_deleted', false)
    .single();

  if (uErr || !userRow?.organization_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [ui, toggles, permissions] = await Promise.all([
    getMergedUiConfig(userRow.organization_id),
    getAllFeatureTogglesForOrg(userRow.organization_id),
    getPermissionsForUser(user.id),
  ]);

  return NextResponse.json({
    ui,
    toggles,
    permissions,
  });
}

export const GET = withSecurity(handler, {
  rateLimit: RATE_LIMITS.api,
});
