/**
 * Dynamic permission checks — uses role_permissions + permissions tables.
 */
import { createClient } from '@/lib/supabase/server';
import { sanitizeError } from '@/lib/errors';

/** Map common aliases to DB action names */
function normalizeAction(action: string): string {
  if (action === 'read') return 'view';
  return action;
}

function normalizePermissionRow(raw: unknown): { module: string; action: string } | null {
  if (!raw || typeof raw !== 'object') return null;
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (first && typeof first === 'object' && 'module' in first && 'action' in first) {
      return { module: String((first as { module: string }).module), action: String((first as { action: string }).action) };
    }
    return null;
  }
  const p = raw as { module?: unknown; action?: unknown };
  if (p.module != null && p.action != null) {
    return { module: String(p.module), action: String(p.action) };
  }
  return null;
}

/**
 * Whether the given user has permission (module + action) via their role.
 * Admin roles (super_admin, org_admin) always have full access.
 */
export async function hasPermission(
  userId: string,
  module: string,
  action: string
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const act = normalizeAction(action);

    const { data: userRow, error: uErr } = await supabase
      .from('users')
      .select('role_id, role:roles(name)')
      .eq('id', userId)
      .eq('is_deleted', false)
      .single();

    if (uErr || !userRow?.role_id) return false;

    // Admin roles always have full access — bypass permission matrix
    const role = Array.isArray(userRow.role) ? userRow.role[0] : userRow.role;
    const roleName = (role as { name?: string })?.name?.toLowerCase() || 'no-role';
    const isAdmin = roleName === 'super_admin' || roleName === 'org_admin' || roleName === 'admin';
    if (isAdmin) {
      return true;
    }

    const { data: links, error: rpErr } = await supabase
      .from('role_permissions')
      .select(
        `
        permission:permissions (
          module,
          action
        )
      `
      )
      .eq('role_id', userRow.role_id);

    if (rpErr || !links) return false;

    for (const row of links) {
      const p = normalizePermissionRow(row.permission);
      if (p && p.module === module && p.action === act) return true;
    }
    return false;
  } catch (error) {
    console.error('hasPermission', error);
    return false;
  }
}

/**
 * Current session user permission (convenience).
 */
export async function currentUserHasPermission(module: string, action: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  return hasPermission(user.id, module, action);
}

export async function getPermissionsForUser(userId: string): Promise<
  { module: string; action: string }[]
> {
  try {
    const supabase = await createClient();
    const { data: userRow } = await supabase
      .from('users')
      .select('role_id')
      .eq('id', userId)
      .eq('is_deleted', false)
      .single();

    if (!userRow?.role_id) return [];

    const { data: links, error } = await supabase
      .from('role_permissions')
      .select(
        `
        permission:permissions (
          module,
          action
        )
      `
      )
      .eq('role_id', userRow.role_id);

    if (error || !links) return [];
    return links
      .map((l) => normalizePermissionRow(l.permission))
      .filter((p): p is { module: string; action: string } => p !== null);
  } catch (error) {
    console.error('getPermissionsForUser', error);
    return [];
  }
}

/**
 * Replace role_permissions for a role (admin tooling).
 */
export async function setRolePermissions(roleId: string, permissionIds: string[]): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error: delErr } = await supabase.from('role_permissions').delete().eq('role_id', roleId);
    if (delErr) {
      console.error('setRolePermissions delete', delErr);
      return false;
    }
    if (permissionIds.length === 0) return true;
    const rows = permissionIds.map((pid) => ({ role_id: roleId, permission_id: pid }));
    const { error: insErr } = await supabase.from('role_permissions').insert(rows);
    if (insErr) {
      console.error('setRolePermissions insert', insErr);
      return false;
    }
    return true;
  } catch (error) {
    throw sanitizeError(error);
  }
}
