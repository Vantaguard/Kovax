import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProfileValues } from '@/services/dynamic-form.service';

/**
 * GET /api/profile-fields?userId=<uuid>
 * Returns dynamic profile fields + values for the authenticated user's intern profile.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = request.nextUrl.searchParams.get('userId') || user.id;

    // Security: only allow fetching own fields unless admin
    if (userId !== user.id) {
      const { data: currentUser } = await supabase
        .from('users')
        .select('role:roles(name)')
        .eq('id', user.id)
        .single();

      const role = Array.isArray(currentUser?.role) ? currentUser.role[0] : currentUser?.role;
      const roleName = (role as any)?.name?.toLowerCase() || '';
      const isAdmin = ['super_admin', 'org_admin', 'admin'].includes(roleName);

      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Find the intern profile for this user
    const { data: profile, error: profileError } = await supabase
      .from('intern_profiles')
      .select('id, organization_id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ fields: [], profileId: null });
    }

    // Load dynamic fields with values
    const fields = await getProfileValues(profile.id, profile.organization_id);

    return NextResponse.json({
      fields,
      profileId: profile.id,
    });
  } catch (error: any) {
    console.error('Error in /api/profile-fields:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
