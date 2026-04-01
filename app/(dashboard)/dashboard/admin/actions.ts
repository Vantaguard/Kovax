'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { setConfig } from '@/services/config.service';
import { setFeatureToggle } from '@/services/feature-toggle.service';
import { setRolePermissions } from '@/services/permission.service';
import { CONFIG_KEYS, FEATURE_MODULES } from '@/lib/phase6/keys';

async function requireOrgAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: admin } = await supabase.rpc('is_admin');
  if (!admin) throw new Error('Forbidden');

  const { data: u } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .eq('is_deleted', false)
    .single();

  if (!u?.organization_id) throw new Error('No organization');
  return { userId: user.id, organizationId: u.organization_id };
}

export async function updateOrgConfigAction(formData: FormData) {
  const { organizationId } = await requireOrgAdmin();

  const displayName = String(formData.get('displayName') ?? '').trim();
  const themePrimary = String(formData.get('themePrimary') ?? '').trim();
  const themeAccent = String(formData.get('themeAccent') ?? '').trim();

  if (displayName) {
    await setConfig(CONFIG_KEYS.APP_DISPLAY_NAME, displayName, 'organization', organizationId);
  }
  if (themePrimary) {
    await setConfig(CONFIG_KEYS.THEME_PRIMARY, themePrimary, 'organization', organizationId);
  }
  if (themeAccent) {
    await setConfig(CONFIG_KEYS.THEME_ACCENT, themeAccent, 'organization', organizationId);
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/admin');
  revalidatePath('/dashboard/admin/config');
}

export async function updateFeatureToggleAction(formData: FormData) {
  const { organizationId } = await requireOrgAdmin();
  const name = String(formData.get('featureName') ?? '');
  const enabled = String(formData.get('enabled') ?? '') === 'true';

  const allowed = new Set<string>([
    FEATURE_MODULES.INTERNS,
    FEATURE_MODULES.PROJECTS,
    FEATURE_MODULES.TASKS,
  ]);
  if (!allowed.has(name)) throw new Error('Invalid feature');

  await setFeatureToggle(organizationId, name, enabled);
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/admin');
}

export async function updateRolePermissionsAction(roleId: string, permissionIds: string[]) {
  await requireOrgAdmin();
  if (!roleId) throw new Error('Missing role');
  const ok = await setRolePermissions(roleId, permissionIds);
  if (!ok) throw new Error('Failed to update permissions');
  revalidatePath('/dashboard/admin/permissions');
}
